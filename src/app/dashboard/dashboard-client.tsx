"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { logInteraction } from "@/lib/log-interaction";

export type RecipeCardData = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  note: string;
  difficulty: string;
  cuisine: string;
  effortTier: string;
  prepMinutes: number;
  cookMinutes: number;
  attributes: string[];
};

function RecipeCard({
  recipe,
  onDismiss,
}: {
  recipe: RecipeCardData;
  onDismiss: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let logged = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timer = setTimeout(() => {
            if (!logged) {
              logged = true;
              logInteraction(recipe.id, "IMPRESSION");
            }
          }, 1000);
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [recipe.id]);

  return (
    <div
      ref={ref}
      className="rounded-2xl border border-[#E8E6E0] bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-[#6B7370]">
            {recipe.cuisine}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-[#1A1D1B]">
            {recipe.title}
          </h3>
        </div>
        <button
          onClick={() => onDismiss(recipe.id)}
          aria-label="Dismiss recipe"
          className="shrink-0 rounded-full border border-[#E8E6E0] px-3 py-1 text-xs text-[#6B7370] hover:bg-[#EDF3EF]"
        >
          Dismiss
        </button>
      </div>

      <p className="mt-2 text-sm text-[#1A1D1B]">{recipe.shortDescription}</p>
      <p className="mt-1 text-xs italic text-[#6B7370]">{recipe.note}</p>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#6B7370]">
        <span className="rounded-full bg-[#EDF3EF] px-2 py-1">{recipe.difficulty}</span>
        <span className="rounded-full bg-[#EDF3EF] px-2 py-1">{recipe.effortTier}</span>
        <span className="rounded-full bg-[#EDF3EF] px-2 py-1">
          {recipe.prepMinutes + recipe.cookMinutes} min
        </span>
        {recipe.attributes.map((a) => (
          <span key={a} className="rounded-full bg-[#EDF3EF] px-2 py-1">
            {a}
          </span>
        ))}
      </div>

      <Link
        href={`/recipe/${recipe.slug}`}
        className="mt-4 inline-block text-sm font-medium text-[#2C5A87] underline"
      >
        View recipe
      </Link>
    </div>
  );
}

export function DashboardClient({ recipes }: { recipes: RecipeCardData[] }) {
  const [pool] = useState(recipes);
  const [cursor, setCursor] = useState(Math.min(4, recipes.length));
  const [visible, setVisible] = useState(() => recipes.slice(0, 4));

  function handleDismiss(id: string) {
    logInteraction(id, "DISMISS");
    setVisible((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx === -1 || pool.length === 0) return prev;
      const replacement = pool[cursor % pool.length];
      setCursor((c) => c + 1);
      const next = [...prev];
      next[idx] = replacement;
      return next;
    });
  }

  if (pool.length === 0) {
    return (
      <p className="text-sm text-[#6B7370]">
        No recipes match your preferences yet. Check back soon.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {visible.map((recipe, i) => (
        <RecipeCard
          key={`${recipe.id}-${i}`}
          recipe={recipe}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  );
}
