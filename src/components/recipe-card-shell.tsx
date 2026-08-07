"use client";

import Image from "next/image";
import Link from "next/link";
import {
  attributeLabel,
  dietEmblemClass,
  formatMealSlot,
  formatMinutes,
  visibleDietEmblems,
} from "@/lib/recipe-tags";

// Shared recipe-card shape + shell used by both Cook Later's saved-recipe
// cards and Profile's "Cook Book" (cooked-history) cards — extracted so the
// two surfaces stay visually consistent without duplicating markup.
export type SavedRecipeData = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  note: string;
  cuisine: string;
  mealSlot: string[];
  prepMinutes: number;
  cookMinutes: number;
  attributes: string[];
  dietTags: string[];
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
  const emblems = visibleDietEmblems(recipe.dietTags);
  const meal = formatMealSlot(recipe.mealSlot);
  const tags = recipe.attributes.slice(0, 3);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E8E6E0] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
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
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#6B7370]">
              {recipe.cuisine}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-[#1A1D1B]">
              {recipe.title}
            </h3>
          </div>
          {emblems.length > 0 && (
            <div className="flex shrink-0 flex-wrap justify-end gap-1">
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
        </div>

        <p className="mt-2 text-sm text-[#1A1D1B]">{recipe.shortDescription}</p>
        <p className="mt-1 text-xs italic text-[#6B7370]">{recipe.note}</p>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#6B7370]">
          <span className="rounded-full bg-[#EDF3EF] px-2 py-1">
            {formatMinutes(recipe.prepMinutes, recipe.cookMinutes)}
          </span>
          {meal && (
            <span className="rounded-full bg-[#EDF3EF] px-2 py-1">{meal}</span>
          )}
          {tags.map((a) => (
            <span key={a} className="rounded-full bg-[#EDF3EF] px-2 py-1">
              {attributeLabel(a)}
            </span>
          ))}
        </div>

        {children}

        <Link
          href={`/recipe/${recipe.slug}`}
          className="mt-4 inline-block py-1 text-sm font-medium text-[#2C5A87] underline"
        >
          View recipe
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
