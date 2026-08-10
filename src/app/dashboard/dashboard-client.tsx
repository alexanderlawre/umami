"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logInteraction } from "@/lib/log-interaction";
import { shuffle } from "@/lib/shuffle";
import {
  attributeLabel,
  dietEmblemClass,
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
  ingredientItems: string[];
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

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation();
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
        className={`flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
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
  userDiets,
  onSavedChange,
}: {
  recipe: RecipeCardData;
  userDiets: string[];
  onSavedChange: (id: string, saved: boolean) => void;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement | null>(null);
  const emblems = visibleDietEmblems(recipe.dietTags, 2);
  const [cookLaterPending, setCookLaterPending] = useState(false);

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

  async function handleCookLater(e: React.MouseEvent) {
    e.stopPropagation();
    if (cookLaterPending) return;
    setCookLaterPending(true);
    try {
      const res = await fetch("/api/saved-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId: recipe.id }),
      });
      if (res.ok) {
        onSavedChange(recipe.id, true);
        logInteraction(recipe.id, "STAR");
      }
    } catch {
      // Non-fatal: navigate regardless so the user isn't stuck.
    } finally {
      setCookLaterPending(false);
      router.push("/cook-later");
    }
  }

  return (
    <div
      ref={ref}
      onClick={() => router.push(`/recipe/${recipe.slug}`)}
      className="cursor-pointer overflow-hidden rounded-2xl border border-[#E8E6E0] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
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
        {recipe.ingredientItems.length > 0 && (
          <p className="mt-1 line-clamp-2 text-sm text-[#6B7370]">
            {recipe.ingredientItems.join(", ")}
          </p>
        )}

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

        {/* Time zone: attribute tag chips were moved off the card and are
            now shown only in a dropdown on the recipe detail page. */}
        <div className="mt-3 flex flex-nowrap items-center gap-2 overflow-hidden text-xs text-[#6B7370]">
          <span className="shrink-0 font-medium text-[#1A1D1B]">
            {formatMinutes(recipe.prepMinutes, recipe.cookMinutes)}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Link
            href={`/recipe/${recipe.slug}`}
            className="flex-1 rounded-full bg-[#1F5F45] px-4 py-2 text-center text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            View Recipe
          </Link>
          <button
            onClick={handleCookLater}
            disabled={cookLaterPending}
            className="flex-1 rounded-full border border-[#E8E6E0] px-4 py-2 text-sm font-medium text-[#1A1D1B] transition hover:-translate-y-0.5 hover:bg-[#EDF3EF] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cookLaterPending ? "Saving\u2026" : "Cook Later"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Takes the first 4 unique-by-id recipes from a pool, in whatever order the
// pool is already in. The Set guard is a defensive backstop; recipes
// themselves are never duplicated in the DB (verified via direct
// inspection), so this is primarily protection against future
// pool-construction bugs. Deterministic (no randomness) so it's safe to use
// for the initial render — `served` arrives pre-selected from the server
// (see dashboard/page.tsx / select-daily.ts), and re-shuffling on the client
// here would cause a hydration mismatch. It's also used (still
// deterministically) whenever the active filter selection changes, so
// toggling a filter doesn't require a fresh shuffle.
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

// Client-only reshuffle used only while a filter is active (filtering is a
// local, ad-hoc browsing affordance and intentionally doesn't consume the
// user's one server-tracked manual refresh for the window).
function pickFour(pool: RecipeCardData[]): RecipeCardData[] {
  return dedupeFirstFour(shuffle(pool));
}

function formatWindowTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "later";
  }
}

type FilterTag = { value: string; label: string; kind: "diet" | "attribute" };

function FilterTagButton({
  tag,
  active,
  onToggle,
}: {
  tag: FilterTag;
  active: boolean;
  onToggle: (value: string) => void;
}) {
  const activeClass =
    tag.kind === "diet"
      ? dietEmblemClass(tag.value) ?? "bg-[#1A1D1B] text-white"
      : "bg-[#1A1D1B] text-white";
  return (
    <button
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
}

// Collapsed-by-default: with every diet + attribute tag rendered flat, the
// bar could grow to dominate the page above the fold. A toggle button with
// an active-count badge keeps the common case (no filters) compact, while
// still surfacing an obvious affordance to narrow things down.
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
  const [open, setOpen] = useState(false);

  if (tags.length === 0) return null;

  const dietTags = tags.filter((t) => t.kind === "diet");
  const attrTags = tags.filter((t) => t.kind === "attribute");

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-1.5 rounded-full border border-[#E8E6E0] bg-white px-3 py-1.5 text-xs font-medium text-[#1A1D1B] transition hover:bg-[#EDF3EF]"
        >
          Filters
          {selected.size > 0 && (
            <span className="rounded-full bg-[#1F5F45] px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {selected.size}
            </span>
          )}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {selected.size > 0 && (
          <button
            onClick={onClear}
            className="text-xs font-medium text-[#2C5A87] underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 space-y-3 rounded-2xl border border-[#E8E6E0] bg-white p-4">
          {dietTags.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#6B7370]">
                Diet
              </p>
              <div className="flex flex-wrap gap-2">
                {dietTags.map((tag) => (
                  <FilterTagButton
                    key={tag.value}
                    tag={tag}
                    active={selected.has(tag.value)}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            </div>
          )}
          {attrTags.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#6B7370]">
                Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {attrTags.map((tag) => (
                  <FilterTagButton
                    key={tag.value}
                    tag={tag}
                    active={selected.has(tag.value)}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            </div>
          )}
          {selected.size > 0 && (
            <button
              onClick={onClear}
              className="text-xs font-medium text-[#2C5A87] underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export type CookbookSection = {
  id: string;
  name: string;
  recipes: RecipeCardData[];
};

export function DashboardClient({
  pool,
  served,
  refreshAvailable,
  nextWindowAt,
  userDiets,
  cookbooks,
}: {
  pool: RecipeCardData[];
  served: RecipeCardData[];
  refreshAvailable: boolean;
  nextWindowAt: string;
  userDiets: string[];
  cookbooks: CookbookSection[];
}) {
  const [poolState] = useState(pool);
  const [visible, setVisible] = useState(() => dedupeFirstFour(served));
  const [cookbooksState, setCookbooksState] = useState(cookbooks);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [canRefresh, setCanRefresh] = useState(refreshAvailable);
  const [nextAt, setNextAt] = useState(nextWindowAt);
  const [refreshPending, setRefreshPending] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const availableTags = useMemo<FilterTag[]>(() => {
    const diets = new Set<string>();
    const attrs = new Set<string>();
    for (const r of poolState) {
      for (const d of r.dietTags) diets.add(d);
      for (const a of r.attributes) attrs.add(a);
    }
    const dietTags: FilterTag[] = [...diets]
      .sort()
      .map((value) => ({ value, label: value, kind: "diet" as const }));
    const attrTags: FilterTag[] = [...attrs]
      .sort()
      .map((value) => ({ value, label: attributeLabel(value), kind: "attribute" as const }));
    return [...dietTags, ...attrTags];
  }, [poolState]);

  const filteredPool = useMemo(() => {
    if (selected.size === 0) return poolState;
    const tags = [...selected];
    return poolState.filter((r) =>
      tags.every((tag) => r.attributes.includes(tag) || r.dietTags.includes(tag)),
    );
  }, [poolState, selected]);

  function handleSavedChange(id: string, saved: boolean) {
    setVisible((prev) => prev.map((r) => (r.id === id ? { ...r, saved } : r)));
    setCookbooksState((prev) =>
      prev.map((cb) => ({
        ...cb,
        recipes: cb.recipes.map((r) => (r.id === id ? { ...r, saved } : r)),
      })),
    );
  }

  async function handleRefresh() {
    setRefreshMessage(null);

    // While a filter is active, "refresh" is just a local reshuffle within
    // the filtered pool and doesn't touch the server-tracked manual-refresh
    // budget for the window.
    if (selected.size > 0) {
      setVisible(pickFour(filteredPool));
      return;
    }

    if (!canRefresh || refreshPending) return;
    setRefreshPending(true);
    try {
      const res = await fetch("/api/dashboard/refresh", { method: "POST" });
      const body = await res.json().catch(() => null);

      if (res.status === 429) {
        setCanRefresh(false);
        if (body?.nextWindowAt) setNextAt(body.nextWindowAt);
        setRefreshMessage(
          `You've used your reshuffle for now. Next one available around ${formatWindowTime(body?.nextWindowAt ?? nextAt)}.`,
        );
        return;
      }

      if (!res.ok || !body?.recipes) {
        setRefreshMessage("Something went wrong. Try again.");
        return;
      }

      setVisible(body.recipes);
      setCanRefresh(false);
      if (body.nextWindowAt) setNextAt(body.nextWindowAt);
    } catch {
      setRefreshMessage("Something went wrong. Try again.");
    } finally {
      setRefreshPending(false);
    }
  }

  function toggleTag(value: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      const nextFiltered =
        next.size === 0
          ? poolState
          : poolState.filter((r) =>
              [...next].every((tag) => r.attributes.includes(tag) || r.dietTags.includes(tag)),
            );
      setVisible(next.size === 0 ? dedupeFirstFour(served) : dedupeFirstFour(nextFiltered));
      return next;
    });
  }

  function clearFilters() {
    setSelected(new Set());
    setVisible(dedupeFirstFour(served));
  }

  if (poolState.length === 0) {
    return (
      <p className="text-sm text-[#6B7370]">
        No recipes match your preferences yet. Check back soon.
      </p>
    );
  }

  const refreshDisabled =
    selected.size === 0 ? !canRefresh || refreshPending : filteredPool.length === 0;

  return (
    <div>
      <FilterBar
        tags={availableTags}
        selected={selected}
        onToggle={toggleTag}
        onClear={clearFilters}
      />

      {(selected.size > 0 ? filteredPool.length === 0 : false) ? (
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
              userDiets={userDiets}
              onSavedChange={handleSavedChange}
            />
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-col items-center gap-2">
        <button
          onClick={handleRefresh}
          disabled={refreshDisabled}
          className="rounded-full border border-[#E8E6E0] px-5 py-3 text-sm font-medium text-[#1A1D1B] hover:bg-[#EDF3EF] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {refreshPending
            ? "Shuffling\u2026"
            : selected.size === 0 && !canRefresh
              ? "Reshuffle used for now"
              : "Refresh recipes"}
        </button>
        {selected.size === 0 && (
          <p className="text-xs text-[#6B7370]">
            {canRefresh
              ? "You have one reshuffle available until the next refresh."
              : `Next automatic refresh around ${formatWindowTime(nextAt)}.`}
          </p>
        )}
        {refreshMessage && (
          <p className="text-xs text-[#6B7370]">{refreshMessage}</p>
        )}
      </div>

      {cookbooksState.length > 0 && (
        <div className="mt-10 space-y-8">
          {cookbooksState.map((cookbook) => (
            <div key={cookbook.id}>
              <h2 className="text-lg font-semibold text-[#1A1D1B]">{cookbook.name}</h2>
              <div className="mt-3 flex gap-4 overflow-x-auto pb-2">
                {cookbook.recipes.map((recipe) => (
                  <div key={recipe.id} className="w-72 shrink-0">
                    <RecipeCard
                      recipe={recipe}
                      userDiets={userDiets}
                      onSavedChange={handleSavedChange}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
