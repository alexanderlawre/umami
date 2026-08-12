"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { AddCuisineInline } from "@/components/recipe-form-fields";
import {
  RecipeEditor,
  type EditorAllergen,
  type EditorAttributeTag,
  type EditorCuisine,
  type EditorDiet,
  type EditorRecipe,
} from "../recipe-editor";

export type AdminRecipeRow = {
  id: string;
  slug: string;
  title: string;
  cuisine: string;
  cuisineId: string;
  mealSlot: string;
  isActive: boolean;
  archivedReason: string | null;
  allergenReviewStatus: "UNVERIFIED" | "VERIFIED";
  imageUrl: string | null;
  cookbookIds: string[];
};

export type AdminCookbookOption = { id: string; name: string };

// Admin-facing meal categories. Every recipe belongs to exactly one.
const MEAL_CATEGORIES: { key: string; label: string }[] = [
  { key: "BREAKFAST", label: "Breakfast" },
  { key: "TAPAS", label: "Tapas" },
  { key: "LUNCH", label: "Lunch" },
  { key: "DINNER", label: "Dinner" },
];

async function patchRecipe(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/admin/recipes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Update failed");
}

// Per-row dropdown for adding/removing this recipe from any cookbook,
// including creating a brand new cookbook inline — the whole "browse all
// recipes and click to add to a cookbook" workflow stays on this page.
function CookbookMenu({
  cookbookIds,
  cookbooks,
  onToggle,
  onCreate,
}: {
  cookbookIds: string[];
  cookbooks: AdminCookbookOption[];
  onToggle: (cookbookId: string, add: boolean) => void;
  onCreate: (name: string) => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  async function handleCreate() {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    const id = await onCreate(name);
    setCreating(false);
    setNewName("");
    if (id) onToggle(id, true);
  }

  return (
    <div ref={ref} className="relative flex-1 sm:flex-none">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`w-full rounded-full border px-3 py-2 text-xs sm:w-auto ${
          cookbookIds.length > 0
            ? "border-[#1F5F45] bg-[#EDF3EF] text-[#1F5F45]"
            : "border-[#E8E6E0] text-[#1A1D1B]"
        }`}
      >
        Cookbooks{cookbookIds.length > 0 ? ` (${cookbookIds.length})` : ""}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-2xl border border-[#E8E6E0] bg-white py-1.5 shadow-lg">
          {cookbooks.length === 0 && (
            <p className="px-4 py-2 text-xs text-[#6B7370]">No cookbooks yet.</p>
          )}
          <div className="max-h-56 overflow-y-auto">
            {cookbooks.map((cb) => {
              const checked = cookbookIds.includes(cb.id);
              return (
                <label
                  key={cb.id}
                  className="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-[#1A1D1B] transition hover:bg-[#EDF3EF]"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(cb.id, !checked)}
                    className="h-4 w-4 rounded border-[#E8E6E0]"
                  />
                  {cb.name}
                </label>
              );
            })}
          </div>
          <div className="my-1.5 border-t border-[#E8E6E0]" />
          <div className="flex items-center gap-1 px-3 py-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              placeholder="New cookbook"
              className="min-w-0 flex-1 rounded-full border border-[#E8E6E0] px-3 py-1.5 text-xs"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="shrink-0 rounded-full bg-[#1F5F45] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RecipeRow({
  recipe: initial,
  onEdit,
  cookbooks,
  onCreateCookbook,
}: {
  recipe: AdminRecipeRow;
  onEdit: (id: string) => void;
  cookbooks: AdminCookbookOption[];
  onCreateCookbook: (name: string) => Promise<string | null>;
}) {
  const [recipe, setRecipe] = useState(initial);
  const [saving, setSaving] = useState(false);
  // Which category to restore this recipe into — defaults to whatever it
  // was before archiving, but the admin can pick a different one before
  // hitting Restore.
  const [restoreSlot, setRestoreSlot] = useState(initial.mealSlot);

  async function toggleActive() {
    const next = !recipe.isActive;
    const prevReason = recipe.archivedReason;
    const prevSlot = recipe.mealSlot;
    setSaving(true);
    // Restoring (Hidden/Archived -> Active) also clears any archivedReason,
    // so a manually-restored recipe doesn't keep showing a stale "why" tag,
    // and applies whichever category was selected in the restore dropdown.
    setRecipe((r) => ({
      ...r,
      isActive: next,
      archivedReason: next ? null : r.archivedReason,
      mealSlot: next ? restoreSlot : r.mealSlot,
    }));
    try {
      await patchRecipe(recipe.id, {
        isActive: next,
        ...(next ? { archivedReason: null, mealSlot: restoreSlot } : {}),
      });
    } catch {
      setRecipe((r) => ({ ...r, isActive: !next, archivedReason: prevReason, mealSlot: prevSlot }));
    } finally {
      setSaving(false);
    }
  }

  async function toggleReviewStatus() {
    const next = recipe.allergenReviewStatus === "VERIFIED" ? "UNVERIFIED" : "VERIFIED";
    setSaving(true);
    setRecipe((r) => ({ ...r, allergenReviewStatus: next }));
    try {
      await patchRecipe(recipe.id, { allergenReviewStatus: next });
    } catch {
      setRecipe((r) => ({
        ...r,
        allergenReviewStatus: next === "VERIFIED" ? "UNVERIFIED" : "VERIFIED",
      }));
    } finally {
      setSaving(false);
    }
  }

  async function toggleCookbook(cookbookId: string, add: boolean) {
    setRecipe((r) => ({
      ...r,
      cookbookIds: add
        ? [...r.cookbookIds, cookbookId]
        : r.cookbookIds.filter((id) => id !== cookbookId),
    }));
    try {
      await fetch(`/api/admin/recipes/${recipe.id}/cookbooks`, {
        method: add ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookbookId }),
      });
    } catch {
      setRecipe((r) => ({
        ...r,
        cookbookIds: add
          ? r.cookbookIds.filter((id) => id !== cookbookId)
          : [...r.cookbookIds, cookbookId],
      }));
    }
  }

  return (
    <div className="flex flex-col gap-2 border-b border-[#E8E6E0] py-3 last:border-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#EDF3EF]">
            {recipe.imageUrl && (
              <Image src={recipe.imageUrl} alt={recipe.title} fill sizes="48px" className="object-cover" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#1A1D1B]">{recipe.title}</p>
            <p className="text-xs text-[#6B7370]">{recipe.cuisine}</p>
            {!recipe.isActive && recipe.archivedReason && (
              <p className="mt-0.5 truncate text-[11px] text-[#B45309]">{recipe.archivedReason}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => onEdit(recipe.id)}
            disabled={saving}
            className="flex-1 rounded-full border border-[#E8E6E0] px-3 py-2 text-xs text-[#1A1D1B] disabled:opacity-50 sm:flex-none"
          >
            Edit recipe
          </button>

          <button
            onClick={toggleReviewStatus}
            disabled={saving}
            className={`flex-1 rounded-full border px-3 py-2 text-xs disabled:opacity-50 sm:flex-none ${
              recipe.allergenReviewStatus === "VERIFIED"
                ? "border-[#1F5F45] bg-[#EDF3EF] text-[#1F5F45]"
                : "border-[#B45309] bg-[#FEF3E2] text-[#B45309]"
            }`}
          >
            {recipe.allergenReviewStatus}
          </button>

          {!recipe.isActive && (
            <select
              value={restoreSlot}
              onChange={(e) => setRestoreSlot(e.target.value)}
              disabled={saving}
              className="flex-1 rounded-full border border-[#E8E6E0] bg-white px-3 py-2 text-xs text-[#1A1D1B] disabled:opacity-50 sm:flex-none"
            >
              {MEAL_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={toggleActive}
            disabled={saving}
            className={`flex-1 rounded-full border px-3 py-2 text-xs disabled:opacity-50 sm:flex-none ${
              recipe.isActive
                ? "border-[#1F5F45] bg-[#EDF3EF] text-[#1F5F45]"
                : "border-[#E8E6E0] text-[#6B7370]"
            }`}
          >
            {recipe.isActive ? "Active" : "Restore"}
          </button>

          <CookbookMenu
            cookbookIds={recipe.cookbookIds}
            cookbooks={cookbooks}
            onToggle={toggleCookbook}
            onCreate={onCreateCookbook}
          />
        </div>
      </div>
    </div>
  );
}

export function RecipesClient({
  recipes,
  cuisines,
  diets,
  allergens,
  attributeTags,
  cookbooks: initialCookbooks,
}: {
  recipes: AdminRecipeRow[];
  cuisines: EditorCuisine[];
  diets: EditorDiet[];
  allergens: EditorAllergen[];
  attributeTags: EditorAttributeTag[];
  cookbooks: AdminCookbookOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter");
  const [cookbooks, setCookbooks] = useState(initialCookbooks);
  const [editorState, setEditorState] = useState<
    | { mode: "create" }
    | { mode: "edit"; recipe: EditorRecipe }
    | { mode: "loading" }
    | null
  >(null);

  async function createCookbook(name: string): Promise<string | null> {
    try {
      const res = await fetch("/api/admin/cookbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) return null;
      const { cookbook } = (await res.json()) as { cookbook: { id: string; name: string } };
      setCookbooks((prev) =>
        prev.some((c) => c.id === cookbook.id) ? prev : [...prev, cookbook].sort((a, b) => a.name.localeCompare(b.name)),
      );
      return cookbook.id;
    } catch {
      return null;
    }
  }

  // Each active recipe belongs to exactly one category. Archived (isActive:
  // false) recipes are excluded here and shown in their own section instead,
  // so a recipe never appears in both places at once.
  const grouped = useMemo(() => {
    const map = new Map<string, AdminRecipeRow[]>();
    for (const category of MEAL_CATEGORIES) map.set(category.key, []);
    for (const recipe of recipes) {
      if (!recipe.isActive) continue;
      const list = map.get(recipe.mealSlot);
      if (list) list.push(recipe);
    }
    return MEAL_CATEGORIES.map((category) => ({
      ...category,
      rows: map.get(category.key) ?? [],
    }));
  }, [recipes]);

  const archived = useMemo(() => recipes.filter((r) => !r.isActive), [recipes]);

  // Since a flagged recipe could live in multiple category groups, a
  // filter=unverified/active query param expands every section by default
  // rather than targeting just one.
  const expandAll = filter === "unverified" || filter === "active";

  async function openEdit(id: string) {
    setEditorState({ mode: "loading" });
    const res = await fetch(`/api/admin/recipes/${id}`);
    if (!res.ok) {
      setEditorState(null);
      return;
    }
    const { recipe } = (await res.json()) as {
      recipe: {
        id: string;
        slug: string;
        title: string;
        shortDescription: string;
        note: string;
        introCopy: string;
        servings: number;
        prepMinutes: number;
        cookMinutes: number;
        difficulty: EditorRecipe["difficulty"];
        cuisineId: string;
        mealSlot: string;
        effortTier: EditorRecipe["effortTier"];
        batchFriendly: boolean;
        attributes: string[];
        heroColor: string;
        imageUrl: string | null;
        imageCredit: string | null;
        isActive: boolean;
        allergenReviewStatus: "UNVERIFIED" | "VERIFIED";
        caloriesPerServing: number | null;
        proteinGrams: number | null;
        carbsGrams: number | null;
        fatGrams: number | null;
        dietTags: { id: string }[];
        allergenTags: { id: string }[];
        ingredients: {
          component: string | null;
          quantity: string;
          unit: string | null;
          item: string;
          prepNote: string | null;
          optional: boolean;
        }[];
        steps: { text: string; durationMinutes: number | null }[];
      };
    };
    setEditorState({
      mode: "edit",
      recipe: {
        ...recipe,
        dietIds: recipe.dietTags.map((d) => d.id),
        allergenIds: recipe.allergenTags.map((a) => a.id),
      },
    });
  }

  function handleSaved() {
    setEditorState(null);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div />
        <button
          onClick={() => setEditorState({ mode: "create" })}
          className="shrink-0 rounded-full bg-[#1F5F45] px-4 py-2 text-xs font-medium text-white"
        >
          + New recipe
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {grouped.map(({ key, label, rows }) => {
          const hasUnverified = rows.some((r) => r.allergenReviewStatus === "UNVERIFIED");
          return (
            <details
              key={key}
              open={expandAll}
              className="group rounded-2xl border border-[#E8E6E0] bg-white"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-[#1A1D1B]">
                <span className="flex items-center gap-2">
                  {label}
                  {hasUnverified && (
                    <span className="rounded-full border border-[#B45309] bg-[#FEF3E2] px-2 py-0.5 text-[10px] font-medium text-[#B45309]">
                      unverified
                    </span>
                  )}
                </span>
                <span className="text-xs font-normal text-[#6B7370]">
                  {rows.length} recipe{rows.length === 1 ? "" : "s"}
                </span>
              </summary>
              <div className="border-t border-[#E8E6E0] px-4">
                {rows.length === 0 && (
                  <p className="py-3 text-xs text-[#6B7370]">No recipes in this category yet.</p>
                )}
                {rows.map((recipe) => (
                  <RecipeRow
                    key={recipe.id}
                    recipe={recipe}
                    onEdit={openEdit}
                    cookbooks={cookbooks}
                    onCreateCookbook={createCookbook}
                  />
                ))}
              </div>
            </details>
          );
        })}

        <details
          open={expandAll}
          className="group rounded-2xl border border-[#E8E6E0] bg-white"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-[#1A1D1B]">
            <span>Archived</span>
            <span className="text-xs font-normal text-[#6B7370]">
              {archived.length} recipe{archived.length === 1 ? "" : "s"}
            </span>
          </summary>
          <div className="border-t border-[#E8E6E0] px-4">
            {archived.length === 0 && (
              <p className="py-3 text-xs text-[#6B7370]">No archived recipes.</p>
            )}
            {archived.map((recipe) => (
              <RecipeRow
                key={recipe.id}
                recipe={recipe}
                onEdit={openEdit}
                cookbooks={cookbooks}
                onCreateCookbook={createCookbook}
              />
            ))}
          </div>
        </details>

        <AddCuisineInline onCreated={() => router.refresh()} />
      </div>

      {editorState?.mode === "create" && (
        <RecipeEditor
          recipe={null}
          cuisines={cuisines}
          diets={diets}
          allergens={allergens}
          attributeTags={attributeTags}
          onClose={() => setEditorState(null)}
          onSaved={handleSaved}
        />
      )}
      {editorState?.mode === "edit" && (
        <RecipeEditor
          recipe={editorState.recipe}
          cuisines={cuisines}
          diets={diets}
          allergens={allergens}
          attributeTags={attributeTags}
          onClose={() => setEditorState(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
