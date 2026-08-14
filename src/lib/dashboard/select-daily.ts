import { prisma } from "@/lib/prisma";
import {
  filterEligibleRecipes,
  filterWithinSpiceCeiling,
  type FilterableRecipe,
} from "@/lib/recommend/filter";
import { scoreRecipe, weightedShuffle, type ScoringProfile } from "@/lib/recommend/score";
import { savedRecipeExpiryCutoff } from "@/lib/saved-recipes";
import {
  getCurrentMealSlot,
  getLocalDateKey,
  getMealSlotWindowKey,
  nextMealSlotWindowAt,
  type MealSlot,
} from "@/lib/meal-slot";
import type { RecipeCardData } from "@/app/dashboard/dashboard-client";

export const DAILY_CARD_COUNT = 4;
export const ROTATING_SLOT_COUNT = 6;
// Of the 4 main daily cards, this many are reserved for a deliberate
// "discovery" pick (see pickDaily) — chosen by inverting the affinity
// scoring instead of maximizing it, so the user keeps seeing at least one
// new thing outside their established taste profile even once learning
// kicks in. The other 3 stay affinity-weighted as before.
const DISCOVERY_SLOT_COUNT = 1;
// A cook history this short isn't enough to confidently infer a favorite
// cuisine from behavior alone — below this, implicitFavoriteCuisines stays
// empty and scoring falls back to declared preferences only.
const IMPLICIT_CUISINE_MIN_COUNT = 2;

export type EligibleRecipe = FilterableRecipe &
  RecipeCardData & {
    // 0-100 weight per FoodGroup this recipe belongs to — scoring-only,
    // never rendered on the card itself (see toCardData, which drops it).
    foodGroups: { foodGroupId: string; weight: number }[];
    // 0-3 heat level, null if unrated — see filter.ts's isWithinSpiceCeiling
    // and Recipe.spiceLevel. Scoring/filter-only, dropped by toCardData.
    spiceLevel: number | null;
    // Admin-curated catalog effort classification — see score.ts's
    // EFFORT_MATCH_WEIGHT for how this maps to the user's dashboard
    // Quick/Any/Project control. Scoring-only, dropped by toCardData.
    effortTier: string;
  };

type DashboardContext = {
  // Main 4-card rotation pool: LUNCH/DINNER recipes only — Breakfast and
  // Tapas never appear here, only in their own rotating sections below.
  pool: EligibleRecipe[];
  tapasPool: EligibleRecipe[];
  breakfastPool: EligibleRecipe[];
  profile: ScoringProfile;
  timezone: string | null;
  currentSlot: MealSlot;
  windowKey: string;
};

async function loadDashboardContext(
  userId: string,
  // Lets a refresh request pass a just-changed effort control value that
  // hasn't been persisted yet (or shouldn't override the stored default on
  // every read) — see refreshDailySelection / /api/dashboard/refresh.
  // Falls back to the persisted UserPreferences.effortPreference otherwise.
  effortOverride?: "QUICK" | "ANY" | "PROJECT",
): Promise<DashboardContext> {
  const [user, preferences, recipes, savedRecipes, foodGroupPrefs, cookedCuisineRows] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
      prisma.userPreferences.findUnique({
        where: { userId },
        include: { diets: true, allergens: true },
      }),
      prisma.recipe.findMany({
        where: { isActive: true },
        include: {
          dietTags: true,
          allergenTags: true,
          attributeTags: { select: { code: true } },
          cuisine: true,
          ingredients: { select: { item: true } },
          foodGroupProfile: { select: { foodGroupId: true, weight: true } },
        },
      }),
      prisma.savedRecipe.findMany({
        where: { userId, savedAt: { gte: savedRecipeExpiryCutoff() } },
        select: { recipeId: true },
      }),
      // Learned taste profile — see learn.ts for how these get written
      // (cook/star = positive nudge, dismiss/mute = negative nudge).
      prisma.foodGroupPreference.findMany({ where: { userId } }),
      // Behavior-derived cuisine affinity, separate from declared
      // onboarding favoriteCuisines (see scoreRecipe's implicitFavoriteCuisines).
      prisma.cookLog.findMany({
        where: { userId },
        select: { recipe: { select: { cuisine: { select: { name: true } } } } },
      }),
    ]);

  const userProfile = {
    diets: preferences?.diets.map((d) => d.name) ?? [],
    allergens: preferences?.allergens.map((a) => a.name) ?? [],
    customAllergens: preferences?.customAllergens ?? [],
  };

  const savedRecipeIds = new Set(savedRecipes.map((s) => s.recipeId));

  const candidates: EligibleRecipe[] = recipes.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    shortDescription: r.shortDescription,
    note: r.note,
    cuisine: r.cuisine.name,
    mealSlot: r.mealSlot,
    prepMinutes: r.prepMinutes,
    cookMinutes: r.cookMinutes,
    attributes: r.attributeTags.map((t) => t.code),
    imageUrl: r.imageUrl,
    imageCredit: r.imageCredit,
    isActive: r.isActive,
    allergenReviewStatus: r.allergenReviewStatus,
    dietTags: r.dietTags.map((d) => d.name),
    allergenTags: r.allergenTags.map((a) => a.name),
    ingredientItems: r.ingredients.map((i) => i.item),
    saved: savedRecipeIds.has(r.id),
    isDiscovery: false,
    foodGroups: r.foodGroupProfile.map((fg) => ({ foodGroupId: fg.foodGroupId, weight: fg.weight })),
    spiceLevel: r.spiceLevel,
    effortTier: r.effortTier,
  }));

  const timezone = user?.timezone ?? null;
  const eligible = filterWithinSpiceCeiling(
    filterEligibleRecipes(candidates, userProfile),
    preferences?.spiceMax ?? null,
  );

  // Blend learnedValue in once real behavioral signal exists (i.e. it has
  // actually drifted away from the frozen onboarding declaredValue);
  // otherwise the two are still identical anyway, so this is a no-op for
  // brand-new users — cold start falls back to declared preferences alone,
  // same as before this feature existed.
  const foodGroupAffinity = new Map<string, number>();
  for (const p of foodGroupPrefs) {
    foodGroupAffinity.set(p.foodGroupId, p.learnedValue);
  }

  const cuisineCounts = new Map<string, number>();
  for (const row of cookedCuisineRows) {
    const name = row.recipe.cuisine.name;
    cuisineCounts.set(name, (cuisineCounts.get(name) ?? 0) + 1);
  }
  const implicitFavoriteCuisines = [...cuisineCounts.entries()]
    .filter(([, count]) => count >= IMPLICIT_CUISINE_MIN_COUNT)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([name]) => name);

  return {
    pool: eligible.filter((r) => r.mealSlot === "LUNCH" || r.mealSlot === "DINNER"),
    tapasPool: eligible.filter((r) => r.mealSlot === "TAPAS"),
    breakfastPool: eligible.filter((r) => r.mealSlot === "BREAKFAST"),
    profile: {
      diets: userProfile.diets,
      favoriteCuisines: preferences?.favoriteCuisines ?? [],
      foodGroupAffinity: foodGroupAffinity.size > 0 ? foodGroupAffinity : undefined,
      implicitFavoriteCuisines: implicitFavoriteCuisines.length > 0 ? implicitFavoriteCuisines : undefined,
      effortPreference: effortOverride ?? preferences?.effortPreference ?? "ANY",
    },
    timezone,
    currentSlot: getCurrentMealSlot(timezone),
    windowKey: getMealSlotWindowKey(timezone),
  };
}

// Inverted score: favors recipes touching food groups the user has the
// *least* learned affinity for, so the discovery slot deliberately explores
// outside the established taste profile instead of just picking a low
// scorer by coincidence. Still only ever drawn from the same
// allergy-filtered, diet-eligible pool as everything else — discovery only
// ever changes *which* eligible recipe surfaces, never bypasses
// eligibility.
function discoveryWeight(recipe: EligibleRecipe, profile: ScoringProfile): number {
  const affinity = profile.foodGroupAffinity;
  if (!affinity || recipe.foodGroups.length === 0) return 1;

  const alignments = recipe.foodGroups.map(({ foodGroupId, weight }) => {
    const userAffinity = affinity.get(foodGroupId);
    if (userAffinity === undefined) return 0.5; // unknown = neutral, still explorable
    return (weight / 100) * (userAffinity / 100);
  });
  const avgAlignment = alignments.reduce((a, b) => a + b, 0) / alignments.length;
  // Low alignment -> high discovery weight. Floors at 0.05 so nothing is
  // ever fully unreachable (weightedShuffle already floors weight at 0.01,
  // this just keeps the intent explicit here too).
  return Math.max(0.05, 1 - avgAlignment);
}

// Free-tier feed intelligence v1: dish/protein diversity guard. The catalog
// has no dedicated protein-type field — AttributeTag is a generic
// admin-curated tag (e.g. "High protein", "Grilled"), not a protein
// *category*, and proteinGrams is a nutrition quantity, not a type — so this
// reuses the same free-text substring-match-over-ingredientItems approach
// filter.ts's custom-allergen matching already relies on. Returns null (no
// signal) when nothing matches, and a null signal is never treated as
// colliding with anything else — this stays a best-effort nudge, never a
// classifier precise enough to exclude on.
const PROTEIN_KEYWORDS = [
  "chicken",
  "beef",
  "pork",
  "lamb",
  "turkey",
  "duck",
  "bacon",
  "sausage",
  "shrimp",
  "prawn",
  "salmon",
  "tuna",
  "cod",
  "crab",
  "shellfish",
  "fish",
  "tofu",
  "tempeh",
  "egg",
  "lentil",
  "chickpea",
  "bean",
  "paneer",
];

function proteinSignal(recipe: EligibleRecipe): string | null {
  const items = (recipe.ingredientItems ?? []).map((i) => i.toLowerCase());
  for (const keyword of PROTEIN_KEYWORDS) {
    if (items.some((item) => item.includes(keyword))) return keyword;
  }
  return null;
}

// Prefers recipes whose protein signal hasn't already been used *within
// each tier*, but never drops a recipe purely for colliding — a tier is
// fully consumed (novel-signal picks first, then duplicate-signal picks) for
// as many slots as it can fill before the next tier is ever touched. This
// is what keeps cuisine-tier dominance (see pickAffinity below) completely
// intact: a cuisine tier with `count` or more eligible recipes still fills
// every slot from that same tier alone, just biased toward its own
// dish/protein variety first, rather than partially handing slots to a
// lower-priority tier just because of a same-tier protein repeat.
function dedupeByProtein(tiers: EligibleRecipe[][], count: number): EligibleRecipe[] {
  const picked: EligibleRecipe[] = [];
  const usedSignals = new Set<string>();

  for (const tier of tiers) {
    if (picked.length >= count) break;

    const novel: EligibleRecipe[] = [];
    const duplicate: EligibleRecipe[] = [];
    for (const recipe of tier) {
      const signal = proteinSignal(recipe);
      if (signal && usedSignals.has(signal)) {
        duplicate.push(recipe);
      } else {
        novel.push(recipe);
      }
    }

    for (const recipe of [...novel, ...duplicate]) {
      if (picked.length >= count) break;
      const signal = proteinSignal(recipe);
      if (signal) usedSignals.add(signal);
      picked.push(recipe);
    }
  }

  return picked;
}

// Deterministically prioritizes the user's declared favorite cuisines over
// everything else, so they actually dominate the affinity slots on any day
// there are enough eligible recipes in a preferred cuisine — not just "more
// likely to appear" via score alone (a probabilistic weighted-shuffle can
// still lose a 3x-weighted recipe to a 1x one fairly often). Behavior-
// inferred (implicit) cuisine matches are the second-priority tier — a
// weaker signal than something the user explicitly told us, but still
// ahead of everything else. Saved-recipe priority is preserved *within*
// each cuisine tier (a saved recipe outside the user's favorite cuisines
// still loses a slot to an unsaved favorite-cuisine recipe, since the
// entire point here is cuisine dominance, not just a tiebreaker). Nothing
// is ever excluded — a tier that comes up short just falls through to the
// next one, so users with no declared cuisines (or too small an eligible
// pool) see exactly the old score-only behavior.
function pickAffinity(
  base: EligibleRecipe[],
  profile: ScoringProfile,
  weight: (r: EligibleRecipe) => number,
  count: number,
): EligibleRecipe[] {
  const declared = new Set(profile.favoriteCuisines);
  const implicit = new Set(profile.implicitFavoriteCuisines ?? []);

  const declaredTier = base.filter((r) => declared.has(r.cuisine));
  const implicitTier = base.filter((r) => !declared.has(r.cuisine) && implicit.has(r.cuisine));
  const restTier = base.filter((r) => !declared.has(r.cuisine) && !implicit.has(r.cuisine));

  const orderTier = (recipes: EligibleRecipe[]) => {
    const saved = weightedShuffle(recipes.filter((r) => r.saved), weight);
    const unsaved = weightedShuffle(recipes.filter((r) => !r.saved), weight);
    return [...saved, ...unsaved];
  };

  return dedupeByProtein(
    [orderTier(declaredTier), orderTier(implicitTier), orderTier(restTier)],
    count,
  );
}

// One of the DAILY_CARD_COUNT slots is reserved for a discovery pick (see
// discoveryWeight) so the user always sees at least one recipe chosen to
// explore outside their established taste profile, flagged via
// isDiscovery so the UI can badge it. The other DAILY_CARD_COUNT - 1 slots
// go through pickAffinity, so on a normal day they're dominated by the
// user's favorite cuisines first, with "try something new" as the one
// deliberate exception. The pool itself is already restricted to
// LUNCH/DINNER only (see loadDashboardContext) — Breakfast/Tapas never
// reach this function.
function pickDaily(
  pool: EligibleRecipe[],
  profile: ScoringProfile,
  currentSlot: MealSlot,
  exclude: Set<string> = new Set(),
): EligibleRecipe[] {
  const available = pool.filter((r) => !exclude.has(r.id));
  const base = available.length >= DAILY_CARD_COUNT ? available : pool;
  const weight = (r: EligibleRecipe) => scoreRecipe(r, profile, currentSlot);

  const affinityPicks = pickAffinity(base, profile, weight, DAILY_CARD_COUNT - DISCOVERY_SLOT_COUNT);

  const affinityPickIds = new Set(affinityPicks.map((r) => r.id));
  const discoveryCandidates = base.filter((r) => !affinityPickIds.has(r.id));
  const discoveryPool = discoveryCandidates.length > 0 ? discoveryCandidates : base;
  const discoveryPicks = weightedShuffle(discoveryPool, (r) => discoveryWeight(r, profile)).slice(
    0,
    DISCOVERY_SLOT_COUNT,
  );

  return [
    ...affinityPicks,
    ...discoveryPicks.map((r) => ({ ...r, isDiscovery: true })),
  ].slice(0, DAILY_CARD_COUNT);
}

// Tapas/Breakfast rotating sections go through the same cuisine-dominance
// tiering as the main rotation (pickAffinity) — no separate discovery slot
// since these sections are already a rotating sample, not a fixed set of 4,
// but favorite cuisines should still dominate them the same way.
function pickRotating(
  pool: EligibleRecipe[],
  profile: ScoringProfile,
  currentSlot: MealSlot,
  count: number,
  exclude: Set<string> = new Set(),
): EligibleRecipe[] {
  const available = pool.filter((r) => !exclude.has(r.id));
  const base = available.length >= count ? available : pool;
  const weight = (r: EligibleRecipe) => scoreRecipe(r, profile, currentSlot);
  return pickAffinity(base, profile, weight, count);
}

function toCardData(r: EligibleRecipe): RecipeCardData {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    shortDescription: r.shortDescription,
    note: r.note,
    cuisine: r.cuisine,
    mealSlot: r.mealSlot,
    prepMinutes: r.prepMinutes,
    cookMinutes: r.cookMinutes,
    attributes: r.attributes,
    dietTags: r.dietTags,
    ingredientItems: r.ingredientItems ?? [],
    imageUrl: r.imageUrl,
    imageCredit: r.imageCredit,
    saved: r.saved,
    isDiscovery: r.isDiscovery,
  };
}

export type CookbookSection = {
  id: string;
  name: string;
  recipes: RecipeCardData[];
};

export type DailySelection = {
  pool: RecipeCardData[];
  served: RecipeCardData[];
  currentSlot: MealSlot;
  nextWindowAt: Date;
  userDiets: string[];
  cookbooks: CookbookSection[];
  tapasSection: RecipeCardData[];
  breakfastSection: RecipeCardData[];
  effortPreference: "QUICK" | "ANY" | "PROJECT";
};

// Admin-curated cookbook sections are built by filtering the already
// eligibility-filtered `pool` by recipe-id membership, so they automatically
// inherit the same allergy/diet/active filtering as the rest of the
// dashboard, and never need their own recipe->card mapping logic. A
// cookbook with zero recipes visible to this user (everything in it got
// filtered out, or the recipe was deleted/deactivated) is dropped entirely
// rather than shown empty.
async function loadCookbookSections(poolById: Map<string, EligibleRecipe>): Promise<CookbookSection[]> {
  const cookbookRows = await prisma.cookbook.findMany({
    orderBy: { createdAt: "asc" },
    include: { recipes: { orderBy: { addedAt: "asc" }, select: { recipeId: true } } },
  });

  return cookbookRows
    .map((cb) => ({
      id: cb.id,
      name: cb.name,
      recipes: cb.recipes
        .map((entry) => poolById.get(entry.recipeId))
        .filter((r): r is EligibleRecipe => Boolean(r))
        .map(toCardData),
    }))
    .filter((cb) => cb.recipes.length > 0);
}

// Reads the latest persisted batch of ServedCard rows for (userId,
// windowKey), or creates one via `pick()` if none exists yet. This is the
// single source of truth backing every rotating section on the dashboard
// (main 4-card rotation, Tapas, Breakfast) — nothing is ever recomputed
// on-the-fly from a hash/seed, so the exact same recipes in the exact same
// order come back on every read within the window, regardless of how many
// times the user navigates away and back (see DECISIONS.md).
//
// Ordering is fully deterministic via the `position` column (0..n-1,
// written at insert time) rather than relying on `servedAt` alone: rows in
// one batch share an identical timestamp, which has no defined order on its
// own across separate reads/connections — that ambiguity was the root cause
// of the "recipes reorder when you go back" bug this replaces.
//
// Idempotent under a race (e.g. two near-simultaneous first loads of a
// brand-new window): the unique (userId, windowKey, servedAt, position)
// constraint plus `skipDuplicates` means at most one writer's rows survive
// for a given servedAt, and we always re-read the persisted rows as the
// return value rather than trusting our own in-memory pick.
async function getOrCreateBatch(
  userId: string,
  windowKey: string,
  poolById: Map<string, EligibleRecipe>,
  count: number,
  pick: (exclude: Set<string>) => EligibleRecipe[],
): Promise<EligibleRecipe[]> {
  const existing = await prisma.servedCard.findMany({
    where: { userId, windowKey },
    orderBy: [{ servedAt: "desc" }, { position: "asc" }],
  });

  if (existing.length > 0) {
    const latestServedAt = existing[0].servedAt.getTime();
    const latestCards = existing.filter((c) => c.servedAt.getTime() === latestServedAt);
    let served = latestCards
      .map((c) => poolById.get(c.recipeId))
      .filter((r): r is EligibleRecipe => Boolean(r));

    // Top up if some previously-served recipes rotated out of eligibility
    // (e.g. archived, allergen tags corrected since). Best-effort and
    // in-memory only — it doesn't rewrite the persisted batch, so this can
    // recompute slightly differently on a later read only if the catalog
    // itself keeps changing underneath the batch, which is rare and
    // strictly safer than showing a shrunken/ineligible card.
    if (served.length < count && poolById.size > 0) {
      const servedIds = new Set(served.map((r) => r.id));
      const topUp = pick(servedIds).filter((r) => !servedIds.has(r.id));
      served = [...served, ...topUp].slice(0, count);
    }

    return served;
  }

  if (poolById.size === 0) return [];

  const picked = pick(new Set());
  if (picked.length === 0) return [];

  const servedAt = new Date();
  await prisma.servedCard.createMany({
    data: picked.map((r, i) => ({ userId, recipeId: r.id, servedAt, windowKey, position: i })),
    skipDuplicates: true,
  });

  // Re-read so that if a concurrent request raced us for this exact window,
  // both callers converge on whichever batch actually persisted first.
  const persisted = await prisma.servedCard.findMany({
    where: { userId, windowKey },
    orderBy: [{ servedAt: "desc" }, { position: "asc" }],
  });
  const latestServedAt = persisted[0]?.servedAt.getTime();
  const latestCards = persisted.filter((c) => c.servedAt.getTime() === latestServedAt);
  return latestCards
    .map((c) => poolById.get(c.recipeId))
    .filter((r): r is EligibleRecipe => Boolean(r));
}

// Re-derives which single persisted card (if any) should carry the
// "Something new" discovery badge, purely by re-running discoveryWeight
// against the already-persisted set and flagging whichever one is the
// weakest affinity match — same logic pickDaily used to choose it
// originally, just applied after the fact so the badge survives across
// reads without needing its own persisted column. Cosmetic only: this can
// never change *which* 4 recipes are shown (that's ServedCard's job) —
// only which one, if any, carries the "Something new" label. Deterministic
// given a fixed served set + fixed profile, so it doesn't flicker between
// reads within the same window either.
function flagDiscoveryCard(served: EligibleRecipe[], profile: ScoringProfile): EligibleRecipe[] {
  if (served.length === 0 || !profile.foodGroupAffinity) return served;

  let weakest = served[0];
  let weakestWeight = -Infinity;
  for (const r of served) {
    const w = discoveryWeight(r, profile);
    if (w > weakestWeight) {
      weakestWeight = w;
      weakest = r;
    }
  }

  return served.map((r) => (r.id === weakest.id ? { ...r, isDiscovery: true } : r));
}

export async function getDailySelection(userId: string): Promise<DailySelection> {
  const { pool, tapasPool, breakfastPool, profile, timezone, currentSlot, windowKey } =
    await loadDashboardContext(userId);

  const poolById = new Map(pool.map((r) => [r.id, r]));
  const tapasById = new Map(tapasPool.map((r) => [r.id, r]));
  const breakfastById = new Map(breakfastPool.map((r) => [r.id, r]));

  // Tapas/Breakfast are keyed per-user (not just per-day) so every user
  // gets their own random, preference-weighted rotation instead of the
  // whole site seeing the identical 6 recipes — the window key alone
  // (calendar day + section) already scopes rows to a single day; per-user
  // scoping comes from ServedCard rows always being queried by userId too.
  const dateKey = getLocalDateKey(timezone);
  const tapasWindowKey = `${dateKey}:TAPAS`;
  const breakfastWindowKey = `${dateKey}:BREAKFAST`;

  const [served, tapasServed, breakfastServed] = await Promise.all([
    getOrCreateBatch(userId, windowKey, poolById, DAILY_CARD_COUNT, (exclude) =>
      pickDaily(pool, profile, currentSlot, exclude),
    ),
    getOrCreateBatch(userId, tapasWindowKey, tapasById, ROTATING_SLOT_COUNT, (exclude) =>
      pickRotating(tapasPool, profile, currentSlot, ROTATING_SLOT_COUNT, exclude),
    ),
    getOrCreateBatch(userId, breakfastWindowKey, breakfastById, ROTATING_SLOT_COUNT, (exclude) =>
      pickRotating(breakfastPool, profile, currentSlot, ROTATING_SLOT_COUNT, exclude),
    ),
  ]);

  const servedWithBadge = flagDiscoveryCard(served, profile);

  // Cookbook sections still key off the LUNCH/DINNER pool (the old
  // hand-picked "Tapas: ..." cookbooks are gone as of Phase 4 — any other
  // future curated cookbook is expected to reference lunch/dinner recipes).
  const cookbooks = await loadCookbookSections(poolById);

  return {
    pool: pool.map(toCardData),
    served: servedWithBadge.map(toCardData),
    currentSlot,
    nextWindowAt: nextMealSlotWindowAt(timezone),
    userDiets: profile.diets,
    cookbooks,
    tapasSection: tapasServed.map(toCardData),
    breakfastSection: breakfastServed.map(toCardData),
    effortPreference: profile.effortPreference ?? "ANY",
  };
}

export type RefreshResult = {
  served: RecipeCardData[];
  nextWindowAt: Date;
  effortPreference: "QUICK" | "ANY" | "PROJECT";
};

// No cap on manual reshuffles — a user can hit "Refresh recipes" as many
// times as they like. Each refresh excludes every recipe already served
// this window (not just the latest batch) so repeated refreshes keep
// surfacing new combinations until the eligible pool is exhausted, at
// which point pickDaily's own fallback reuses the full pool again. Unlike
// getOrCreateBatch, this always writes a brand-new batch — that's the
// intended effect of an explicit refresh (it deliberately replaces what
// future back-navigation will show, as opposed to the passive reads in
// getDailySelection which must never change the persisted batch on their
// own).
export async function refreshDailySelection(
  userId: string,
  // Lets the dashboard's Quick/Any/Project control trigger a real re-pick
  // against the full eligible pool (not just a local reshuffle of the
  // already-served 4 cards) — see /api/dashboard/refresh, which persists
  // this back to UserPreferences.effortPreference when provided.
  effortOverride?: "QUICK" | "ANY" | "PROJECT",
): Promise<RefreshResult> {
  const { pool, profile, timezone, currentSlot, windowKey } = await loadDashboardContext(
    userId,
    effortOverride,
  );

  const existing = await prisma.servedCard.findMany({
    where: { userId, windowKey },
  });

  const currentIds = new Set(existing.map((c) => c.recipeId));
  const served = pickDaily(pool, profile, currentSlot, currentIds);

  if (served.length > 0) {
    const servedAt = new Date();
    await prisma.servedCard.createMany({
      data: served.map((r, i) => ({ userId, recipeId: r.id, servedAt, windowKey, position: i })),
      skipDuplicates: true,
    });
  }

  return {
    served: flagDiscoveryCard(served, profile).map(toCardData),
    nextWindowAt: nextMealSlotWindowAt(timezone),
    effortPreference: profile.effortPreference ?? "ANY",
  };
}
