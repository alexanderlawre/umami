"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { logInteraction } from "@/lib/log-interaction";
import {
  attributeLabel,
  dietEmblemClass,
  formatMealSlot,
  formatMinutes,
  visibleDietEmblems,
} from "@/lib/recipe-tags";

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

function SavedRecipeCard({
  recipe,
  onRemove,
}: {
  recipe: SavedRecipeData;
  onRemove: (id: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const emblems = visibleDietEmblems(recipe.dietTags);
  const meal = formatMealSlot(recipe.mealSlot);
  const tags = recipe.attributes.slice(0, 3);

  async function handleRemove() {
    if (pending) return;
    setPending(true);
    logInteraction(recipe.id, "UNSTAR");
    try {
      await fetch(`/api/saved-recipes/${recipe.id}`, { method: "DELETE" });
      onRemove(recipe.id);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E8E6E0] bg-white shadow-sm">
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
        <button
          onClick={handleRemove}
          disabled={pending}
          aria-label="Remove from Cook Later"
          className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#F2B705] text-white shadow-sm"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 21.24a.562.562 0 0 1-.84-.61l1.285-5.386a.563.563 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
          </svg>
        </button>
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

export function CookLaterClient({ recipes }: { recipes: SavedRecipeData[] }) {
  const [items, setItems] = useState(recipes);

  function handleRemove(id: string) {
    setItems((prev) => prev.filter((r) => r.id !== id));
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-[#6B7370]">
        Nothing saved yet. Star a recipe from your dashboard to add it here.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {items.map((recipe) => (
        <SavedRecipeCard key={recipe.id} recipe={recipe} onRemove={handleRemove} />
      ))}
    </div>
  );
}
