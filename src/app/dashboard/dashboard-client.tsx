"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { logInteraction } from "@/lib/log-interaction";
import { shuffle } from "@/lib/shuffle";
import {
  attributeLabel,
  cardDisplayAttributes,
  dietEmblemClass,
  formatMealSlot,
  formatMinutes,
  visibleDietEmblems,
} from "@/lib/recipe-tags";

export type RecipeCardData = {
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
  saved: boolean;
};

function StarButton({
  recipeId,
  saved,
  onSavedChange,
}: {
  recipeId: string;
  saved: boolean;
  onSavedChange: (saved: boolean) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (pending) return;
    const next = !saved;
    setPending(true);
    setError(null);
    onSavedChange(next);
    logInteraction(recipeId, next ? "STAR" : "UNSTAR");

    try {
      const res = next
        ? await fetch("/api/saved-recipes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recipeId }),
          })
        : await fetch(`/api/saved-recipes/${recipeId}`, { method: "DELETE" });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        onSavedChange(!next);
        setError(body?.error ?? "Something went wrong.");
      }
    } catch {
      onSavedChange(!next);
      setError("Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="absolute left-3 top-3">
      <button
        onClick={toggle}
        aria-label={saved ? "Remove from Cook Later" : "Add to Cook Later"}
        aria-pressed={saved}
        disabled={pending}
        className={`flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition-colors ${
          saved ? "bg-[#F2B705] text-white" : "bg-white/90 text-[#6B7370]"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={1.75}
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 21.24a.562.562 0 0 1-.84-.61l1.285-5.386a.563.563 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
          />
        </svg>
      </button>
      {error ? (
        <p className="absolute top-11 w-40 rounded-lg bg-[#1A1D1B] px-2 py-1 text-xs text-white shadow-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function RecipeCard({
  recipe,
  onSavedChange,
}: {
  recipe: RecipeCardData;
  onSavedChange: (id: string, saved: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const emblems = visibleDietEmblems(recipe.dietTags);
  const meal = formatMealSlot(recipe.mealSlot);
  const tags = cardDisplayAttributes(recipe.attributes);

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
      className="overflow-hidden rounded-2xl border border-[#E8E6E0] bg-white shadow-sm"
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
        <StarButton
          recipeId={recipe.id}
          saved={recipe.saved}
          onSavedChange={(saved) => onSavedChange(recipe.id, saved)}
        />
      </div>

      <div className="p-5">
        <p className="text-xs uppercase tracking-wide text-[#6B7370]">
          {recipe.cuisine}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-[#1A1D1B]">
          {recipe.title}
        </h3>

        {/* Diet zone: a dedicated full-width row, distinct from the tags
            zone below, so dietary fit reads at a glance. */}
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

        <p className="mt-2 text-sm text-[#1A1D1B]">{recipe.shortDescription}</p>
        <p className="mt-1 text-xs italic text-[#6B7370]">{recipe.note}</p>

        {/* Tags zone: time, meal slot, then descriptive attributes. */}
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

// Takes the first 4 unique-by-id recipes from a pool, in whatever order the
// pool is already in. The Set guard is a defensive backstop; recipes
// themselves are never duplicated in the DB (verified via direct
// inspection), so this is primarily protection against future
// pool-construction bugs. Deterministic (no randomness) so it's safe to use
// for the initial render — `recipes` arrives pre-shuffled from the server
// (see dashboard/page.tsx), and re-shuffling on the client here would cause
// a hydration mismatch since the server and client would pick different
// random orders for the same markup. It's also used (still deterministically)
// whenever the active filter selection changes, so toggling a filter doesn't
// require a fresh shuffle.
function dedupeFirstFour(pool: RecipeCardData[]): RecipeCardData[] {
  const seen = new Set<string>();
  const out: RecipeCardData[] = [];
  for (const recipe of pool) {
    if (seen.has(recipe.id)) continue;
    seen.add(recipe.id);
    out.push(recipe);
    if (out.length === 4) break;
  }
  return out;
}

// Client-only reshuffle for the Refresh button (post-hydration, no SSR
// mismatch risk since it only ever runs from a user click).
function pickFour(pool: RecipeCardData[]): RecipeCardData[] {
  return dedupeFirstFour(shuffle(pool));
}

type FilterTag = { value: string; label: string; kind: "diet" | "attribute" };

function FilterBar({
  tags,
  selected,
  onToggle,
  onClear,
}: {
  tags: FilterTag[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  if (tags.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((tag) => {
          const active = selected.has(tag.value);
          const activeClass =
            tag.kind === "diet"
              ? dietEmblemClass(tag.value) ?? "bg-[#1A1D1B] text-white"
              : "bg-[#1A1D1B] text-white";
          return (
            <button
              key={tag.value}
              onClick={() => onToggle(tag.value)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? `border-transparent ${activeClass}`
                  : "border-[#E8E6E0] bg-white text-[#6B7370] hover:bg-[#EDF3EF]"
              }`}
            >
              {tag.label}
            </button>
          );
        })}
        {selected.size > 0 && (
          <button
            onClick={onClear}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-[#2C5A87] underline"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

export function DashboardClient({ recipes }: { recipes: RecipeCardData[] }) {
  const [pool] = useState(recipes);
  const [visible, setVisible] = useState(() => dedupeFirstFour(recipes));
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const availableTags = useMemo<FilterTag[]>(() => {
    const diets = new Set<string>();
    const attrs = new Set<string>();
    for (const r of pool) {
      for (const d of r.dietTags) {
        if (d !== "Omnivore") diets.add(d);
      }
      for (const a of r.attributes) attrs.add(a);
    }
    const dietTags: FilterTag[] = [...diets]
      .sort()
      .map((value) => ({ value, label: value, kind: "diet" as const }));
    const attrTags: FilterTag[] = [...attrs]
      .sort()
      .map((value) => ({ value, label: attributeLabel(value), kind: "attribute" as const }));
    return [...dietTags, ...attrTags];
  }, [pool]);

  const filteredPool = useMemo(() => {
    if (selected.size === 0) return pool;
    const tags = [...selected];
    return pool.filter((r) =>
      tags.every((tag) => r.attributes.includes(tag) || r.dietTags.includes(tag)),
    );
  }, [pool, selected]);

  function handleSavedChange(id: string, saved: boolean) {
    setVisible((prev) => prev.map((r) => (r.id === id ? { ...r, saved } : r)));
  }

  function handleRefresh() {
    setVisible(pickFour(filteredPool));
  }

  function toggleTag(value: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      const nextFiltered =
        next.size === 0
          ? pool
          : pool.filter((r) =>
              [...next].every((tag) => r.attributes.includes(tag) || r.dietTags.includes(tag)),
            );
      setVisible(dedupeFirstFour(nextFiltered));
      return next;
    });
  }

  function clearFilters() {
    setSelected(new Set());
    setVisible(dedupeFirstFour(pool));
  }

  if (pool.length === 0) {
    return (
      <p className="text-sm text-[#6B7370]">
        No recipes match your preferences yet. Check back soon.
      </p>
    );
  }

  return (
    <div>
      <FilterBar
        tags={availableTags}
        selected={selected}
        onToggle={toggleTag}
        onClear={clearFilters}
      />

      {filteredPool.length === 0 ? (
        <p className="text-sm text-[#6B7370]">
          No recipes match your selected filters.{" "}
          <button onClick={clearFilters} className="text-[#2C5A87] underline">
            Clear filters
          </button>
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {visible.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onSavedChange={handleSavedChange}
            />
          ))}
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <button
          onClick={handleRefresh}
          disabled={filteredPool.length === 0}
          className="rounded-full border border-[#E8E6E0] px-5 py-3 text-sm font-medium text-[#1A1D1B] hover:bg-[#EDF3EF] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Refresh recipes
        </button>
      </div>
    </div>
  );
}
