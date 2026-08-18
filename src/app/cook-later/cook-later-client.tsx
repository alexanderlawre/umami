"use client";

import { useState } from "react";
import { logInteraction } from "@/lib/log-interaction";
import { RecipeCardShell, type SavedRecipeData } from "@/components/recipe-card-shell";
import { PageTransition } from "@/components/page-transition";
import { MotionButton } from "@/components/motion-button";

export type { SavedRecipeData };

function SavedRecipeCard({
  recipe,
  onRemove,
}: {
  recipe: SavedRecipeData;
  onRemove: (id: string) => void;
}) {
  const [pending, setPending] = useState(false);

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
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
    <RecipeCardShell
      recipe={recipe}
      badge={
        <MotionButton
          onClick={handleRemove}
          disabled={pending}
          aria-label="Remove from Cook Later"
          whileHover={{ y: -2 }}
          className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#F2B705] text-white shadow-sm transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 21.24a.562.562 0 0 1-.84-.61l1.285-5.386a.563.563 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
          </svg>
        </MotionButton>
      }
    />
  );
}

export function CookLaterClient({ recipes }: { recipes: SavedRecipeData[] }) {
  const [items, setItems] = useState(recipes);

  function handleRemove(id: string) {
    setItems((prev) => prev.filter((r) => r.id !== id));
  }

  if (items.length === 0) {
    return (
      <PageTransition>
        <p className="text-sm text-[#6B7370]">
          Nothing saved yet. Star a recipe from your dashboard to add it here.
        </p>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((recipe) => (
          <SavedRecipeCard key={recipe.id} recipe={recipe} onRemove={handleRemove} />
        ))}
      </div>
    </PageTransition>
  );
}
