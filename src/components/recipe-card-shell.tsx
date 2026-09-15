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
      className="cursor-pointer overflow-hidden rounded-lg border border-[#E8E6E0] bg-white shadow-brand transition"
    >
      <div className="relative">
        {recipe.imageUrl ? (
          // overflow-hidden + rounded-t-lg applied directly here (not just
          // relying on the outer card's overflow-hidden) because this card
          // animates (Framer Motion hover-lift / enter transition) —
          // browsers can drop a parent's border-radius clip on a
          // transformed/animating ancestor, which was letting the image's
          // top corners flash square during hover/enter.
          <div className="relative h-40 w-full overflow-hidden rounded-t-lg">
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
        <p className="text-xs font-extralight uppercase tracking-wide text-[#6B7370]">
          {recipe.cuisine}
        </p>
        {/* Truncated to a single line so every card in a row stays the
            same height regardless of title length — a long title
            wrapping to a 2nd/3rd line was pushing cards out of
            alignment with their neighbors in the grid. */}
        <h3 className="mt-1 truncate text-lg font-semibold text-[#101010]">
          {recipe.title}
        </h3>
        {recipe.ingredientItems.length > 0 && (
          <p className="mt-1 line-clamp-2 text-sm font-extralight text-[#6B7370]">
            {recipe.ingredientItems.join(", ")}
          </p>
        )}

        {emblems.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {emblems.map((diet) => (
              <span
                key={diet}
                className={`rounded-full px-2 py-1 text-[11px] font-extralight ${dietEmblemClass(diet)}`}
              >
                {diet}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-nowrap items-center gap-2 overflow-hidden text-xs text-[#6B7370]">
          <span className="shrink-0 font-medium text-[#101010]">
            {formatMinutes(recipe.prepMinutes, recipe.cookMinutes)}
          </span>
        </div>

        {children}

        <Link
          href={`/recipe/${recipe.slug}`}
          className="mt-4 block rounded-full bg-[#1B4332] px-4 py-2 text-center text-sm font-medium text-white shadow-brand transition hover:-translate-y-0.5"
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
      <p className="mt-3 text-xs font-extralight text-[#6B7370]">
        Cooked {recipe.timesCooked > 1 ? `${recipe.timesCooked}x` : ""} · last on{" "}
        {formatCookedDate(recipe.lastCookedAt)}
      </p>
    </RecipeCardShell>
  );
}

// Recipe card variant for a user's own cookbook management page — adds a
// "Remove" action; the click stops propagation so it doesn't also trigger
// the shell's own navigate-to-recipe click handler.
export function UserCookbookRecipeCard({
  recipe,
  onRemove,
  removing,
}: {
  recipe: SavedRecipeData;
  onRemove: () => void;
  removing?: boolean;
}) {
  return (
    <RecipeCardShell recipe={recipe}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        disabled={removing}
        className="mt-3 text-xs font-extralight text-[#B23A32] underline disabled:opacity-50"
      >
        {removing ? "Removing..." : "Remove from cookbook"}
      </button>
    </RecipeCardShell>
  );
}
