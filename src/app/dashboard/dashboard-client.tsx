"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Liquid } from "liquid-gooey";
import { Capacitor } from "@capacitor/core";
import { logInteraction } from "@/lib/log-interaction";
import { hapticImpactLight, hapticImpactMedium } from "@/lib/native";
import { shuffle } from "@/lib/shuffle";
import {
  attributeLabel,
  dietEmblemClass,
  formatMinutes,
  visibleDietEmblems,
} from "@/lib/recipe-tags";
import { MotionButton } from "@/components/motion-button";
import { MotionCard } from "@/components/motion-card";
import { LoadingOrb } from "@/components/loading-orb";
import { EmptyState } from "@/components/empty-state";
import { RefreshBlockedModal } from "@/components/refresh-blocked-modal";

export type RecipeCardData = {
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
  // Broader "more of ___" cluster titles this recipe prominently belongs to
  // (see food-group-clusters.ts) — powers the dashboard's food-group filter
  // chips (see availableTags/filteredPool below).
  foodGroupClusters: string[];
  ingredientItems: string[];
  imageUrl: string | null;
  imageCredit: string | null;
  saved: boolean;
  // True for the one main-rotation card (if any) deliberately chosen to
  // explore outside the user's established taste profile — see
  // select-daily.ts's discoveryWeight/flagDiscoveryCard. Optional/undefined
  // for any card source that doesn't compute this (cookbooks, tapas,
  // breakfast, cook-later) — treated the same as false.
  isDiscovery?: boolean;
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
    hapticImpactMedium();

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
      <MotionButton
        onClick={toggle}
        aria-label={saved ? "Remove from Cook Later" : "Add to Cook Later"}
        aria-pressed={saved}
        disabled={pending}
        whileTap={{ scale: 0.8 }}
        whileHover={{ y: -2, scale: 1.06 }}
        transition={{ type: "spring", stiffness: 500, damping: 22 }}
        className={`flex h-9 w-9 items-center justify-center rounded-full shadow-sm ${
          saved ? "bg-[#F2B705] text-white" : "bg-white/90 text-[#6B7370]"
        }`}
      >
        <motion.svg
          viewBox="0 0 24 24"
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={1.75}
          className="h-5 w-5"
          animate={saved ? { scale: [0.6, 1.15, 1] } : { scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 21.24a.562.562 0 0 1-.84-.61l1.285-5.386a.563.563 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
          />
        </motion.svg>
      </MotionButton>
      {error ? (
        <p className="absolute top-11 w-40 rounded-lg bg-[#1A1D1B] px-2 py-1 text-xs text-white shadow-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// Free-tier feed intelligence v1: the "pass" affordance for
// DISMISS-as-negative-signal — see updateLearnedPreferences in
// src/lib/recommend/learn.ts, which already reacts to this interaction type;
// this button was the only missing piece (no UI anywhere called it before).
// Deliberately a plain icon button rather than a swipe gesture — smallest
// change that makes the existing machinery reachable.
function PassButton({
  recipeId,
  onPass,
}: {
  recipeId: string;
  onPass?: (id: string) => void;
}) {
  const [pressed, setPressed] = useState(false);

  function handlePass(e: React.MouseEvent) {
    e.stopPropagation();
    if (pressed) return;
    setPressed(true);
    hapticImpactMedium();
    logInteraction(recipeId, "DISMISS");
    onPass?.(recipeId);
  }

  return (
    <MotionButton
      onClick={handlePass}
      disabled={pressed}
      aria-label="Not for me"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.9 }}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E8E6E0] text-[#6B7370] transition-colors hover:bg-[#F5EDEA] hover:text-[#B23A32] disabled:opacity-50"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
    </MotionButton>
  );
}

function RecipeCard({
  recipe,
  userDiets,
  onSavedChange,
  popKey,
  onPass,
  index,
}: {
  recipe: RecipeCardData;
  userDiets: string[];
  onSavedChange: (id: string, saved: boolean) => void;
  // When provided, the card gets a decorative liquid-gooey "pop" (a soft
  // green halo that squishes the card into place) every time this value
  // changes — used only by the main 4-card daily rotation to mark a refresh,
  // not by cookbook/tapas/breakfast sections which never refresh. Omitted
  // entirely (no Liquid wrapper at all) for those other render sites so this
  // stays a zero-cost, zero-risk addition anywhere it isn't wanted.
  popKey?: number;
  // Free-tier feed intelligence v1: negative taste signal ("not for me").
  // Optional — only the main daily rotation wires this up to a real
  // swap-for-next-candidate; cookbook/tapas/breakfast sections still log the
  // DISMISS (see PassButton) but don't need a replacement affordance since
  // they're not the adaptive-learning surface.
  onPass?: (id: string) => void;
  // Position within the currently-rendered grid — only passed by the main
  // 4-card rotation so its cards visibly cascade in rather than popping in
  // all at once. Omitted (defaults to 0, no stagger) for cookbook carousels,
  // which aren't a "mount" moment in the same sense.
  index?: number;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement | null>(null);
  const emblems = visibleDietEmblems(recipe.dietTags, 2);
  const [cookLaterPending, setCookLaterPending] = useState(false);

  // Settled (scale 1, no halo bleed) on the very first mount — including the
  // dashboard's initial page load — and only animates the squish-in on
  // subsequent popKey changes, i.e. actual refreshes. This keeps the effect
  // scoped precisely to "when they refresh", never to first paint.
  const isFirstPop = useRef(true);
  const [popped, setPopped] = useState(true);
  useEffect(() => {
    if (popKey === undefined) return;
    if (isFirstPop.current) {
      isFirstPop.current = false;
      return;
    }
    setPopped(false);
    const raf = requestAnimationFrame(() => setPopped(true));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popKey]);

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
        hapticImpactMedium();
      }
    } catch {
      // Non-fatal: navigate regardless so the user isn't stuck.
    } finally {
      setCookLaterPending(false);
      router.push("/cook-later");
    }
  }

  const innerContent = (
    <>
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
        {recipe.isDiscovery ? (
          <span className="absolute right-3 top-3 rounded-full bg-[#1B4332] px-2.5 py-1 text-[11px] font-medium text-white shadow-sm">
            Something new
          </span>
        ) : null}
      </div>

      <div className="p-5">
        <p className="text-xs uppercase tracking-wide text-[#6B7370]">
          {recipe.cuisine}
        </p>
        {/* Truncated to a single line so every card in a row stays the same
            height regardless of title length — a long title wrapping to a
            2nd/3rd line was pushing cards out of alignment with their
            neighbors in the grid. */}
        <h3 className="mt-1 truncate text-lg font-semibold text-[#1A1D1B]">
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
            className="flex-1 rounded-full bg-[#1B4332] px-4 py-2 text-center text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            View Recipe
          </Link>
          <MotionButton
            onClick={handleCookLater}
            disabled={cookLaterPending}
            whileHover={{ y: -2 }}
            className="flex-1 rounded-full border border-[#E8E6E0] px-4 py-2 text-sm font-medium text-[#1A1D1B] transition-colors hover:bg-[#EDF3EF] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cookLaterPending ? "Saving\u2026" : "Cook Later"}
          </MotionButton>
          <PassButton recipeId={recipe.id} onPass={onPass} />
        </div>
      </div>
    </>
  );

  return (
    <MotionCard
      ref={ref}
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 28, delay: (index ?? 0) * 0.06 }}
      whileHover={{ y: -6 }}
      onClick={() => router.push(`/recipe/${recipe.slug}`)}
      className="cursor-pointer overflow-hidden rounded-2xl border border-[#E8E6E0] bg-white shadow-soft hover:shadow-lifted"
    >
      {popKey === undefined ? (
        innerContent
      ) : (
        // Same decorative-halo technique already used for the refresh button
        // and filter chips below: a single-item Liquid group whose fill only
        // ever shows as a brief green ring while the Liquid.Item's scale is
        // mid-spring (fully covered by the card's own opaque white
        // background once settled at scale 1). Nested *inside* MotionCard
        // (rather than wrapping it) so the card itself stays the literal,
        // unwrapped grid/AnimatePresence item — wrapping it from the outside
        // would insert extra DOM between the grid and the animated element,
        // breaking `mode="popLayout"`'s reflow-on-exit. Any halo bleed is
        // clipped by the card's own `overflow-hidden`, which just means it
        // stays confined to the card's real edge — never an arbitrary cut.
        <Liquid
          blur={9}
          contrast={20}
          fill="rgba(27, 67, 50, 0.14)"
          shadow="0 6px 16px rgba(27, 67, 50, 0.12)"
          className="block"
        >
          <Liquid.Item morph={{ shape: true }} scale={popped ? 1 : 0.88} transition="bouncy">
            <div>{innerContent}</div>
          </Liquid.Item>
        </Liquid>
      )}
    </MotionCard>
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
// local, ad-hoc browsing affordance that reshuffles within the filtered set
// instead of round-tripping to the server-tracked refresh).
function pickFour(pool: RecipeCardData[]): RecipeCardData[] {
  return dedupeFirstFour(shuffle(pool));
}

type FilterTag = { value: string; label: string; kind: "foodGroup" | "attribute" };

function FilterTagButton({
  tag,
  active,
  onToggle,
}: {
  tag: FilterTag;
  active: boolean;
  onToggle: (value: string) => void;
}) {
  // Food-group and attribute chips share the same neutral active style —
  // unlike the per-card diet emblems (dietEmblemClass), these don't need
  // per-tag coloring since there's no fixed, small palette to draw from
  // (12 food-group clusters vs. a handful of diets).
  const activeClass = "bg-[#1A1D1B] text-white";
  return (
    // Each chip gets its own single-item liquid group. The blob is
    // transparent while inactive so it stays invisible, and pops in with a
    // springy liquid-shape transition the moment the chip is toggled on —
    // the fill only shows up as a soft gooey halo behind an active tag.
    <Liquid
      blur={5}
      contrast={22}
      fill={active ? "rgba(27, 67, 50, 0.16)" : "transparent"}
      shadow={active ? "0 2px 6px rgba(27, 67, 50, 0.18)" : undefined}
      className="inline-block"
    >
      <Liquid.Item morph={{ shape: true }} scale={active ? 1.06 : 1} transition="bouncy">
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
      </Liquid.Item>
    </Liquid>
  );
}

// Collapsed-by-default: with every food-group + attribute tag rendered flat,
// the bar could grow to dominate the page above the fold. A toggle button
// with an active-count badge keeps the common case (no filters) compact,
// while still surfacing an obvious affordance to narrow things down.
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

  const foodGroupTags = tags.filter((t) => t.kind === "foodGroup");
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
            <span className="rounded-full bg-[#1B4332] px-1.5 py-0.5 text-[10px] font-semibold text-white">
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

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="filter-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3 rounded-2xl border border-[#E8E6E0] bg-white p-4 shadow-soft">
              {foodGroupTags.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#6B7370]">
                    More of
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {foodGroupTags.map((tag) => (
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type DashboardCategory = "MEALS" | "TAPAS" | "BREAKFAST";

const CATEGORY_OPTIONS: { value: DashboardCategory; label: string }[] = [
  { value: "MEALS", label: "Meals" },
  { value: "TAPAS", label: "Tapas" },
  { value: "BREAKFAST", label: "Breakfast" },
];

// Persistent Meals/Tapas/Breakfast segmented control. Unlike FilterBar above
// (a client-only reshuffle of the already-served pool), changing this always
// triggers a real server re-pick — see handleCategoryChange in
// DashboardClient — since switching category means drawing from an entirely
// different pool, not just re-ranking the current one.
//
// A true liquid tab indicator: one shared Liquid group, one Liquid.Item
// using effect="move" — the pill's *real* position is driven entirely by
// our own inline `transform` + CSS `transition` (well-understood, always
// applies), and the library's spring-lagged gooey blob observes and trails
// that real element via ResizeObserver/MutationObserver rather than us
// asking the library to own the position itself. Each option button has
// the same hard-coded width (SEGMENT_WIDTH), so the transform is a pure
// function of the active option's index.
//
// Root cause #1 (fixed): `<Liquid>` renders its own inline
// `style={{ position: "relative", ... }}` — an INLINE style always beats a
// Tailwind class, so a `className="absolute"` on it was silently ignored.
// The group never actually left normal flow. Passing `position`/`inset` via
// `style` (merged AFTER the library's own defaults) is the only way to
// override them.
//
// Root cause #2 (fixed): the pill is a plain `display: inline-block` div —
// inline-level boxes are laid out per the CSS `text-align` of their
// containing block, and this control lives inside the `text-center` wrapper
// added around the whole dashboard heading. With nothing overriding it, the
// inherited `text-align: center` centered the pill inside the 288px track
// before any of our own positioning ran, so our transform then added on top
// of that already-centered position instead of on top of a left-aligned
// one. `textAlign: "left"` below removes that inherited centering.
//
// Root cause #3 (fixed): the pill used `h-full`, but its library-generated
// `inline-block` parent has no explicit height of its own (it's sized to
// fit its child, a circular dependency), so the percentage resolves to 0.
// An explicit pixel height (matching the Liquid track's own rendered
// height) sidesteps that entirely.
//
// Root cause #4 (fixed): we originally drove position via Liquid.Item's
// controlled `x` prop (its documented "component-driven position" mode).
// Confirmed live via React DevTools fiber inspection that the *prop*
// updates correctly on every category change (fiber.memoizedProps.x tracked
// the new value every time), but the library's own internal effect that's
// supposed to imperatively write that x/y to the real DOM element's
// `style.transform` never actually ran again after the very first mount —
// the on-screen pill stayed frozen at whatever slot was active on load, no
// matter how many times x changed afterward. Since that's an internal,
// undocumented mechanism we don't control, we stopped depending on it:
// effect="move" instead expects *us* to move a real element with real CSS,
// and only asks the library to visually trail it, which sidesteps the
// broken update path entirely.
const SEGMENT_WIDTH = 96;
const SEGMENT_HEIGHT = 28;

function CategoryControl({
  value,
  onChange,
  disabled,
}: {
  value: DashboardCategory;
  onChange: (value: DashboardCategory) => void;
  disabled: boolean;
}) {
  const activeIndex = CATEGORY_OPTIONS.findIndex((opt) => opt.value === value);

  return (
    <div
      role="radiogroup"
      aria-label="Which recipes do you want to see?"
      className="relative mx-auto mb-4 inline-flex rounded-full border border-[#E8E6E0] bg-white p-1"
    >
      <Liquid
        blur={5}
        contrast={24}
        fill="#1B4332"
        shadow="0 2px 6px rgba(27, 67, 50, 0.25)"
        className="pointer-events-none"
        style={{ position: "absolute", inset: 4, textAlign: "left" }}
      >
        <Liquid.Item effect="move">
          <div
            className="rounded-full transition-transform duration-300 ease-out"
            style={{
              width: SEGMENT_WIDTH,
              height: SEGMENT_HEIGHT,
              transform: `translateX(${activeIndex * SEGMENT_WIDTH}px)`,
            }}
          />
        </Liquid.Item>
      </Liquid>
      {CATEGORY_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => !active && onChange(opt.value)}
            style={{ width: SEGMENT_WIDTH }}
            className={`relative z-10 rounded-full py-1.5 text-center text-xs font-medium transition-colors duration-200 disabled:opacity-50 ${
              active ? "text-white" : "text-[#6B7370] hover:bg-[#EDF3EF]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export type CookbookSection = {
  id: string;
  name: string;
  recipes: RecipeCardData[];
};

const CATEGORY_SUBTITLE: Record<DashboardCategory, string> = {
  MEALS: "4 recipes picked for you today.",
  TAPAS: "4 tapas picked for you today.",
  BREAKFAST: "4 breakfasts picked for you today.",
};

export function DashboardClient({
  pool,
  served,
  userDiets,
  cookbooks,
  category,
  currentSlot,
}: {
  pool: RecipeCardData[];
  served: RecipeCardData[];
  userDiets: string[];
  cookbooks: CookbookSection[];
  category: DashboardCategory;
  currentSlot: "LUNCH" | "DINNER";
}) {
  const [poolState, setPoolState] = useState(pool);
  const [visible, setVisible] = useState(() => dedupeFirstFour(served));
  // The current "true base" set of cards — what clearing all filters should
  // restore. Distinct from `served` (a static initial-render prop that never
  // changes) and from `visible` (which filtering/reshuffling mutate
  // transiently): this only ever advances on a REAL new base — a server
  // refresh or a category switch — never on a local filtered reshuffle or a
  // filter toggle. See toggleTag/clearFilters below.
  const [baseVisible, setBaseVisible] = useState(() => dedupeFirstFour(served));
  const [cookbooksState, setCookbooksState] = useState(cookbooks);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [refreshPending, setRefreshPending] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  // A1 free-plan gate: set from a 429 REFRESH_LIMIT_REACHED response to the
  // plain "Refresh recipes" tap (never the category switch — see
  // handleCategoryChange). Separate from refreshMessage since this opens a
  // modal rather than an inline note.
  const [refreshBlockedUntil, setRefreshBlockedUntil] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState(category);
  const [categoryPending, setCategoryPending] = useState(false);
  // Bumped every time `visible` is replaced with a new set of cards (server
  // refresh, local filtered reshuffle, filter toggle/clear) — passed to each
  // main-grid RecipeCard as `popKey` to trigger its liquid-gooey pop-in.
  // Never bumped by `handleSavedChange`, which only patches `saved` on
  // already-visible cards and shouldn't replay the pop.
  const [refreshGeneration, setRefreshGeneration] = useState(0);

  function replaceVisible(next: RecipeCardData[]) {
    setVisible(next);
    setRefreshGeneration((g) => g + 1);
  }

  // Diet is no longer a filter chip here — it's a hard, preference-driven
  // exclusion applied server-side (see filter.ts's isRecipeEligible), so
  // every recipe in poolState already satisfies every declared diet. The
  // "more of ___" chips below replace diet as the second filter category,
  // built from each recipe's food-group cluster membership instead.
  const availableTags = useMemo<FilterTag[]>(() => {
    const foodGroups = new Set<string>();
    const attrs = new Set<string>();
    for (const r of poolState) {
      for (const c of r.foodGroupClusters) foodGroups.add(c);
      for (const a of r.attributes) attrs.add(a);
    }
    const foodGroupTags: FilterTag[] = [...foodGroups]
      .sort()
      .map((value) => ({ value, label: value, kind: "foodGroup" as const }));
    const attrTags: FilterTag[] = [...attrs]
      .sort()
      .map((value) => ({ value, label: attributeLabel(value), kind: "attribute" as const }));
    return [...foodGroupTags, ...attrTags];
  }, [poolState]);

  const filteredPool = useMemo(() => {
    if (selected.size === 0) return poolState;
    const tags = [...selected];
    return poolState.filter((r) =>
      tags.every((tag) => r.attributes.includes(tag) || r.foodGroupClusters.includes(tag)),
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

  // Free-tier feed intelligence v1: PassButton already logged the DISMISS
  // interaction (which is what actually feeds updateLearnedPreferences) —
  // this just swaps the passed card for the next not-yet-shown candidate
  // from the same pool the filter chips already use, so the grid never
  // shows a hole. Falls back to simply removing the card if the pool is
  // exhausted (same "never worse than fewer cards" fallback the rest of the
  // dashboard already relies on).
  function handlePass(id: string) {
    setVisible((prev) => {
      const remaining = prev.filter((r) => r.id !== id);
      const visibleIds = new Set(prev.map((r) => r.id));
      const sourcePool = selected.size > 0 ? filteredPool : poolState;
      const replacement = sourcePool.find((r) => !visibleIds.has(r.id));
      return replacement ? [...remaining, replacement] : remaining;
    });
  }

  async function handleRefresh() {
    hapticImpactLight();
    setRefreshMessage(null);

    // While a filter is active, "refresh" is just a local reshuffle within
    // the filtered pool and doesn't touch the server.
    if (selected.size > 0) {
      replaceVisible(pickFour(filteredPool));
      return;
    }

    if (refreshPending) return;
    setRefreshPending(true);
    try {
      const res = await fetch("/api/dashboard/refresh", { method: "POST" });
      const body = await res.json().catch(() => null);

      if (res.status === 429 && body?.error === "REFRESH_LIMIT_REACHED") {
        setRefreshBlockedUntil(body.nextWindowAt ?? null);
        return;
      }

      if (!res.ok || !body?.recipes) {
        setRefreshMessage("Something went wrong. Try again.");
        return;
      }

      replaceVisible(body.recipes);
      setBaseVisible(body.recipes);
    } catch {
      setRefreshMessage("Something went wrong. Try again.");
    } finally {
      setRefreshPending(false);
    }
  }

  // Always a real server re-pick (never the local filteredPool reshuffle
  // handleRefresh falls back to) — the whole point of this control is to
  // draw from an entirely different pool (Meals/Tapas/Breakfast), not just
  // re-rank the current one. Persists as the user's new default via the
  // same request. Resets any active filters, since a filter combo valid for
  // one category may match nothing in another.
  async function handleCategoryChange(next: DashboardCategory) {
    if (categoryPending) return;
    hapticImpactLight();
    setActiveCategory(next);
    setCategoryPending(true);
    setRefreshMessage(null);
    try {
      const res = await fetch("/api/dashboard/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: next }),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok || !body?.recipes) {
        setRefreshMessage("Something went wrong. Try again.");
        setActiveCategory(category);
        return;
      }

      replaceVisible(body.recipes);
      setBaseVisible(body.recipes);
      setPoolState(body.pool ?? poolState);
      setSelected(new Set());
    } catch {
      setRefreshMessage("Something went wrong. Try again.");
      setActiveCategory(category);
    } finally {
      setCategoryPending(false);
    }
  }

  // Native-only pull-to-refresh: a plain downward drag starting from the
  // very top of the scrolled document triggers the same `handleRefresh()`
  // used by the "Refresh recipes" button (a curated reshuffle, not a raw
  // page reload — so a native page-reload-style pull-to-refresh plugin
  // would be semantically wrong here). Scoped to
  // `Capacitor.isNativePlatform()` since this is purely a native-app
  // mechanic; the web app has no pull-to-refresh gesture today and this
  // shouldn't add one there. `handleRefresh` already guards against
  // overlapping calls via `refreshPending`, so this is safe to fire
  // whenever the gesture completes.
  //
  // `handleRefresh` is a plain (non-memoized) function redeclared every
  // render, so it closes over the latest `selected`/`filteredPool`/
  // `refreshPending` state each time. The touch listeners below are
  // attached once (empty deps, so we're not re-adding/removing them on
  // every keystroke elsewhere on the page), so we route the call through a
  // ref that's kept in sync on every render — this avoids the listeners
  // ever invoking a stale closure.
  const handleRefreshRef = useRef(handleRefresh);
  handleRefreshRef.current = handleRefresh;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const PULL_THRESHOLD = 70;
    let startY: number | null = null;
    let armed = false;

    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0) {
        startY = null;
        return;
      }
      startY = e.touches[0]?.clientY ?? null;
      armed = false;
    }

    function onTouchMove(e: TouchEvent) {
      if (startY === null) return;
      const currentY = e.touches[0]?.clientY;
      if (currentY === undefined) return;
      armed = currentY - startY > PULL_THRESHOLD;
    }

    function onTouchEnd() {
      if (armed) handleRefreshRef.current();
      startY = null;
      armed = false;
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  // Clearing/removing filters always restores `baseVisible` — the current
  // true base set (last real server refresh or category switch) — never the
  // static initial-render `served` prop, which would otherwise snap back to
  // stale pre-refresh cards. Filtering itself still freely pulls in other
  // pool recipes; only the "no filters selected" resting state is anchored.
  function toggleTag(value: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      const nextFiltered =
        next.size === 0
          ? poolState
          : poolState.filter((r) =>
              [...next].every((tag) => r.attributes.includes(tag) || r.foodGroupClusters.includes(tag)),
            );
      replaceVisible(next.size === 0 ? baseVisible : dedupeFirstFour(nextFiltered));
      return next;
    });
  }

  function clearFilters() {
    setSelected(new Set());
    replaceVisible(baseVisible);
  }

  const heading =
    activeCategory === "MEALS"
      ? currentSlot === "LUNCH"
        ? "Lunch picks for you"
        : "Dinner picks for you"
      : activeCategory === "TAPAS"
        ? "Tapas picks for you"
        : "Breakfast picks for you";

  if (poolState.length === 0) {
    return (
      <div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#1A1D1B]">{heading}</h1>
          <p className="mt-1 text-sm text-[#6B7370]">{CATEGORY_SUBTITLE[activeCategory]}</p>
          <div className="mt-6">
            <CategoryControl value={activeCategory} onChange={handleCategoryChange} disabled={categoryPending} />
          </div>
        </div>
        <EmptyState title="No recipes match your preferences yet. Check back soon." />
      </div>
    );
  }

  const refreshDisabled =
    selected.size === 0 ? refreshPending : filteredPool.length === 0;

  return (
    <div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#1A1D1B]">{heading}</h1>
        <p className="mt-1 text-sm text-[#6B7370]">{CATEGORY_SUBTITLE[activeCategory]}</p>

        <div className="mt-6">
          <CategoryControl value={activeCategory} onChange={handleCategoryChange} disabled={categoryPending} />
        </div>
      </div>

      <FilterBar
        tags={availableTags}
        selected={selected}
        onToggle={toggleTag}
        onClear={clearFilters}
      />

      <AnimatePresence mode="wait" initial={false}>
        {refreshPending || categoryPending ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-3 py-16"
          >
            <LoadingOrb size={64} aria-label="Loading recipes" />
            <p className="text-sm text-[#6B7370]">Loading recipes…</p>
          </motion.div>
        ) : selected.size > 0 && filteredPool.length === 0 ? (
          <motion.div
            key="empty-filtered"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <EmptyState
              title="No recipes match your selected filters."
              action={
                <button
                  onClick={clearFilters}
                  className="text-sm font-medium text-[#2C5A87] underline"
                >
                  Clear filters
                </button>
              }
            />
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <AnimatePresence mode="popLayout">
              {visible.map((recipe, i) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  index={i}
                  userDiets={userDiets}
                  onSavedChange={handleSavedChange}
                  popKey={refreshGeneration}
                  onPass={handlePass}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 flex flex-col items-center gap-2">
        {/* Plain MotionButton press/hover feedback (spring-scale on tap,
            lift on hover — see motion-button.tsx's defaults). Previously
            wrapped in a Liquid/Liquid.Item halo whose `scale` was tied to
            onPointerDown/Up/Leave; that combination
            (`morph={{shape:true}}` + a scale bound to raw pointer events)
            wakes liquid-gooey's continuous requestAnimationFrame
            re-measure/re-raster loop on every single tap (confirmed by
            reading the library's source), which is what caused the
            perceptible per-tap lag on mobile Safari. Dropped entirely
            rather than gated behind a pointer-type media query, since the
            halo was purely decorative and MotionButton's own whileTap
            already gives equivalent tactile feedback for free. */}
        <MotionButton
          onClick={handleRefresh}
          disabled={refreshDisabled}
          className="flex items-center gap-2 rounded-full border border-[#E8E6E0] px-5 py-3 text-sm font-medium text-[#1A1D1B] transition-colors hover:bg-[#EDF3EF] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {refreshPending ? (
            <LoadingOrb size={20} />
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
          )}
          {refreshPending ? "Shuffling\u2026" : "Refresh recipes"}
        </MotionButton>
        {refreshMessage && (
          <p className="text-xs text-[#6B7370]">{refreshMessage}</p>
        )}
      </div>

      <RefreshBlockedModal
        open={refreshBlockedUntil !== null}
        onClose={() => setRefreshBlockedUntil(null)}
        nextWindowAt={refreshBlockedUntil}
      />

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
