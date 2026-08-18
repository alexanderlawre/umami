"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  dietEmblemClass,
  formatMinutes,
  visibleDietEmblems,
} from "@/lib/recipe-tags";

// Shared recipe-card shape + shell used by both Cook Later's saved-recipe
// cards and Profile's "Cook Book" (cooked-history) cards — extracted so the
// two surfaces stay visually consistent without duplicating markup. Mirrors
// the dashboard's own recipe card (dashboard-client.tsx's RecipeCard) field
// for field so a recipe looks and behaves the same everywhere it appears.
export type SavedRecipeData = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  note: string;
  cuisine: string;
  mealSlot: string;
  prepMinutes: number;
  cookMinutes: number;
  attributes: string[];
  dietTags: string[];
  ingredientItems: string[];
  imageUrl: string | null;
  imageCredit: string | null;
};

export type CookedRecipeData = SavedRecipeData & {
  lastCookedAt: string;
  timesCooked: number;
};

export function RecipeCardShell({
  recipe,
  badge,
  children,
}: {
  recipe: SavedRecipeData;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const emblems = visibleDietEmblems(recipe.dietTags, 2);

  return (
    <div
      onClick={() => router.push(`/recipe/${recipe.slug}`)}
      className="cursor-pointer overflow-hidden rounded-2xl border border-[#E8E6E0] bg-white shadow-soft transition hover:shadow-lifted"
    >
      <div className="relative">
        {recipe.imageUrl ? (
          <div className="relative h-40 w-full">
            <Image
              src={recipe.imageUrl}
              alt={recipe.title}
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        ) : null}
        {badge}
      </div>

      <div className="p-5">
        <p className="text-xs uppercase tracking-wide text-[#6B7370]">
          {recipe.cuisine}
        </p>
        {/* Truncated to a single line so every card in a row stays the
            same height regardless of title length — a long title
            wrapping to a 2nd/3rd line was pushing cards out of
            alignment with their neighbors in the grid. */}
        <h3 className="mt-1 truncate text-lg font-semibold text-[#1A1D1B]">
          {recipe.title}
        </h3>
        {recipe.ingredientItems.length > 0 && (
          <p className="mt-1 line-clamp-2 text-sm text-[#6B7370]">
            {recipe.ingredientItems.join(", ")}
          </p>
        )}

        {emblems.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {emblems.map((diet) => (
              <span
                key={diet}
                className={`rounded-full px-2 py-1 text-[11px] font-medium ${dietEmblemClass(diet)}`}
              >
                {diet}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-nowrap items-center gap-2 overflow-hidden text-xs text-[#6B7370]">
          <span className="shrink-0 font-medium text-[#1A1D1B]">
            {formatMinutes(recipe.prepMinutes, recipe.cookMinutes)}
          </span>
        </div>

        {children}

        <Link
          href={`/recipe/${recipe.slug}`}
          className="mt-4 block rounded-full bg-[#1B4332] px-4 py-2 text-center text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          View Recipe
        </Link>
      </div>
    </div>
  );
}

export function formatCookedDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CookedRecipeCard({ recipe }: { recipe: CookedRecipeData }) {
  return (
    <RecipeCardShell recipe={recipe}>
      <p className="mt-3 text-xs text-[#6B7370]">
        Cooked {recipe.timesCooked > 1 ? `${recipe.timesCooked}x` : ""} · last on{" "}
        {formatCookedDate(recipe.lastCookedAt)}
      </p>
    </RecipeCardShell>
  );
}
