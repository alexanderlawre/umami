"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  RecipeEditor,
  type EditorAllergen,
  type EditorCuisine,
  type EditorDiet,
  type EditorRecipe,
} from "./recipe-editor";

export type AdminRecipeRow = {
  id: string;
  slug: string;
  title: string;
  cuisine: string;
  cuisineId: string;
  isActive: boolean;
  allergenReviewStatus: "UNVERIFIED" | "VERIFIED";
  imageUrl: string | null;
};

type Stats = {
  userCount: number;
  recipeCount: number;
  activeRecipeCount: number;
  unverifiedRecipeCount: number;
  cookLogCount: number;
  interactionCounts: { type: string; count: number }[];
};

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-[#E8E6E0] bg-white p-4">
      <p className="text-2xl font-bold text-[#1A1D1B]">{value}</p>
      <p className="mt-1 text-xs text-[#6B7370]">{label}</p>
    </div>
  );
}

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

export function AdminClient({
  stats,
  recipes,
  cuisines,
  diets,
  allergens,
}: {
  stats: Stats;
  recipes: AdminRecipeRow[];
  cuisines: EditorCuisine[];
  diets: EditorDiet[];
  allergens: EditorAllergen[];
}) {
  const router = useRouter();
  const [editorState, setEditorState] = useState<
    | { mode: "create" }
    | { mode: "edit"; recipe: EditorRecipe }
    | { mode: "loading" }
    | null
  >(null);

  const grouped = useMemo(() => {
    const map = new Map<string, AdminRecipeRow[]>();
    for (const recipe of recipes) {
      const list = map.get(recipe.cuisine) ?? [];
      list.push(recipe);
      map.set(recipe.cuisine, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [recipes]);

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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Users" value={stats.userCount} />
        <StatCard label="Recipes" value={stats.recipeCount} />
        <StatCard label="Active recipes" value={stats.activeRecipeCount} />
        <StatCard label="Unverified allergens" value={stats.unverifiedRecipeCount} />
        <StatCard label="Cook logs" value={stats.cookLogCount} />
        {stats.interactionCounts.map((i) => (
          <StatCard key={i.type} label={i.type} value={i.count} />
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#1A1D1B]">Recipes</h2>
          <p className="mt-1 text-xs text-[#6B7370]">
            Grouped by cuisine. Edit a recipe&apos;s tags, content, and photo, or toggle
            visibility.
          </p>
        </div>
        <button
          onClick={() => setEditorState({ mode: "create" })}
          className="shrink-0 rounded-full bg-[#1F5F45] px-4 py-2 text-xs font-medium text-white"
        >
          + New recipe
        </button>
      </div>

      <div className="mt-3 space-y-6">
        {grouped.map(([cuisine, rows]) => (
          <div key={cuisine}>
            <h3 className="text-sm font-semibold text-[#1A1D1B]">{cuisine}</h3>
            <div className="mt-2 rounded-2xl border border-[#E8E6E0] bg-white px-4">
              {rows.map((recipe) => (
                <RecipeRow key={recipe.id} recipe={recipe} onEdit={openEdit} />
              ))}
            </div>
          </div>
        ))}
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
