"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { AddCuisineInline } from "@/components/recipe-form-fields";
import {
  RecipeEditor,
  type EditorAllergen,
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
  mealSlot: string[];
  isActive: boolean;
  allergenReviewStatus: "UNVERIFIED" | "VERIFIED";
  imageUrl: string | null;
};

// Admin-facing meal categories. SNACK is relabeled "Small Bites" here only —
// the consumer-facing formatMealSlot() wording elsewhere is untouched.
const MEAL_CATEGORIES: { key: string; label: string }[] = [
  { key: "BREAKFAST", label: "Breakfast" },
  { key: "LUNCH", label: "Lunch" },
  { key: "DINNER", label: "Dinner" },
  { key: "SNACK", label: "Small Bites" },
];

async function patchRecipe(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/admin/recipes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Update failed");
}

function RecipeRow({
  recipe: initial,
  onEdit,
}: {
  recipe: AdminRecipeRow;
  onEdit: (id: string) => void;
}) {
  const [recipe, setRecipe] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function toggleActive() {
    const next = !recipe.isActive;
    setSaving(true);
    setRecipe((r) => ({ ...r, isActive: next }));
    try {
      await patchRecipe(recipe.id, { isActive: next });
    } catch {
      setRecipe((r) => ({ ...r, isActive: !next }));
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

          <button
            onClick={toggleActive}
            disabled={saving}
            className={`flex-1 rounded-full border px-3 py-2 text-xs disabled:opacity-50 sm:flex-none ${
              recipe.isActive
                ? "border-[#1F5F45] bg-[#EDF3EF] text-[#1F5F45]"
                : "border-[#E8E6E0] text-[#6B7370]"
            }`}
          >
            {recipe.isActive ? "Active" : "Hidden"}
          </button>
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
}: {
  recipes: AdminRecipeRow[];
  cuisines: EditorCuisine[];
  diets: EditorDiet[];
  allergens: EditorAllergen[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter");
  const [editorState, setEditorState] = useState<
    | { mode: "create" }
    | { mode: "edit"; recipe: EditorRecipe }
    | { mode: "loading" }
    | null
  >(null);

  // A recipe with multiple mealSlot tags (e.g. LUNCH + SNACK) appears under
  // every category it declares.
  const grouped = useMemo(() => {
    const map = new Map<string, AdminRecipeRow[]>();
    for (const category of MEAL_CATEGORIES) map.set(category.key, []);
    for (const recipe of recipes) {
      for (const slot of recipe.mealSlot) {
        const list = map.get(slot);
        if (list) list.push(recipe);
      }
    }
    return MEAL_CATEGORIES.map((category) => ({
      ...category,
      rows: map.get(category.key) ?? [],
    }));
  }, [recipes]);

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
        mealSlot: string[];
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
                  <RecipeRow key={recipe.id} recipe={recipe} onEdit={openEdit} />
                ))}
              </div>
            </details>
          );
        })}

        <AddCuisineInline onCreated={() => router.refresh()} />
      </div>

      {editorState?.mode === "create" && (
        <RecipeEditor
          recipe={null}
          cuisines={cuisines}
          diets={diets}
          allergens={allergens}
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
          onClose={() => setEditorState(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
