"use client";

import { useRef, useState } from "react";
import Image from "next/image";

export type AdminRecipeRow = {
  id: string;
  slug: string;
  title: string;
  cuisine: string;
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

function RecipeRow({ recipe: initial }: { recipe: AdminRecipeRow }) {
  const [recipe, setRecipe] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    setPhotoError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/admin/recipes/${recipe.id}/image`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Upload failed");
      }
      const { imageUrl } = (await res.json()) as { imageUrl: string };
      setRecipe((r) => ({ ...r, imageUrl: `${imageUrl}?v=${Date.now()}` }));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
      e.target.value = "";
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={saving}
            className="flex-1 rounded-full border border-[#E8E6E0] px-3 py-2 text-xs text-[#1A1D1B] disabled:opacity-50 sm:flex-none"
          >
            Change photo
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

      {photoError && <p className="text-xs text-red-600">{photoError}</p>}
    </div>
  );
}

export function AdminClient({
  stats,
  recipes,
}: {
  stats: Stats;
  recipes: AdminRecipeRow[];
}) {
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

      <h2 className="mt-8 text-lg font-semibold text-[#1A1D1B]">Recipes</h2>
      <p className="mt-1 text-xs text-[#6B7370]">
        Toggle allergen review status or hide a recipe from the dashboard.
      </p>

      <div className="mt-3 rounded-2xl border border-[#E8E6E0] bg-white px-4">
        {recipes.map((recipe) => (
          <RecipeRow key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </div>
  );
}
