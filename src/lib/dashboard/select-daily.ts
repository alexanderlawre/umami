import { prisma } from "@/lib/prisma";
import { filterEligibleRecipes, type FilterableRecipe } from "@/lib/recommend/filter";
import { scoreRecipe, weightedShuffle, type ScoringProfile } from "@/lib/recommend/score";
import { savedRecipeExpiryCutoff } from "@/lib/saved-recipes";
import {
  getCurrentMealSlot,
  getMealSlotWindowKey,
  nextMealSlotWindowAt,
  shouldScatterSnack,
  type MealSlot,
} from "@/lib/meal-slot";
import type { RecipeCardData } from "@/app/dashboard/dashboard-client";

export const DAILY_CARD_COUNT = 4;
export const MAX_MANUAL_REFRESHES_PER_WINDOW = 1;

export type EligibleRecipe = FilterableRecipe & RecipeCardData;

type DashboardContext = {
  pool: EligibleRecipe[];
  profile: ScoringProfile;
  timezone: string | null;
  currentSlot: MealSlot;
  windowKey: string;
};

async function loadDashboardContext(userId: string): Promise<DashboardContext> {
  const [user, preferences, recipes, savedRecipes] = await Promise.all([
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
        cuisine: true,
        ingredients: { select: { item: true } },
      },
    }),
    prisma.savedRecipe.findMany({
      where: { userId, savedAt: { gte: savedRecipeExpiryCutoff() } },
      select: { recipeId: true },
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
    attributes: r.attributes,
    imageUrl: r.imageUrl,
    imageCredit: r.imageCredit,
    isActive: r.isActive,
    allergenReviewStatus: r.allergenReviewStatus,
    dietTags: r.dietTags.map((d) => d.name),
    allergenTags: r.allergenTags.map((a) => a.name),
    ingredientItems: r.ingredients.map((i) => i.item),
    saved: savedRecipeIds.has(r.id),
  }));

  const timezone = user?.timezone ?? null;

  return {
    pool: filterEligibleRecipes(candidates, userProfile),
    profile: {
      diets: userProfile.diets,
      favoriteCuisines: preferences?.favoriteCuisines ?? [],
    },
    timezone,
    currentSlot: getCurrentMealSlot(timezone),
    windowKey: getMealSlotWindowKey(timezone),
  };
}

// Favorited (saved) recipes get priority for the daily four so a starred
// recipe is more likely to keep surfacing, without ever being *required* to
// (saving itself, via SavedRecipe, already persists independent of what the
// dashboard shows — see cook-later). Within each priority tier, recipes are
// weighted-shuffled by soft score (meal-slot match, diet match, favorite
// cuisine) — nothing here ever excludes a recipe, only re-ranks it.
function pickDaily(
  pool: EligibleRecipe[],
  profile: ScoringProfile,
  currentSlot: MealSlot,
  includeSnack: boolean,
  exclude: Set<string> = new Set(),
): EligibleRecipe[] {
  const available = pool.filter((r) => !exclude.has(r.id));
  const base = available.length >= DAILY_CARD_COUNT ? available : pool;
  const weight = (r: EligibleRecipe) => scoreRecipe(r, profile, currentSlot);

  const favorited = weightedShuffle(base.filter((r) => r.saved), weight);
  const rest = weightedShuffle(base.filter((r) => !r.saved), weight);
  let picks = [...favorited, ...rest].slice(0, DAILY_CARD_COUNT);

  if (includeSnack) {
    const pickedIds = new Set(picks.map((r) => r.id));
    const snackCandidates = base.filter((r) => r.mealSlot.includes("SNACK") && !pickedIds.has(r.id));
    if (snackCandidates.length > 0) {
      const snack = weightedShuffle(snackCandidates, weight)[0];
      // Swap in the snack for the last non-saved pick, preserving favorited
      // recipes whenever possible.
      let replaceIndex = picks.length - 1;
      for (let i = picks.length - 1; i >= 0; i--) {
        if (!picks[i].saved) {
          replaceIndex = i;
          break;
        }
      }
      picks = [...picks.slice(0, replaceIndex), snack, ...picks.slice(replaceIndex + 1)];
    }
  }

  return picks;
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
  refreshAvailable: boolean;
  nextWindowAt: Date;
  userDiets: string[];
  cookbooks: CookbookSection[];
};

// Admin-curated cookbook sections are built by filtering the already
// eligibility-filtered `pool` by recipe-id membership, so they automatically
// inherit the same allergy/diet/active filtering as the rest of the
// dashboard, and never need their own recipe->card mapping logic. A
// cookbook with zero recipes visible to this user (everything in it got
// filtered out, or the recipe was deleted/deactivated) is dropped entirely
// rather than shown empty.
async function loadCookbookSections(pool: EligibleRecipe[]): Promise<CookbookSection[]> {
  const poolById = new Map(pool.map((r) => [r.id, r]));
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

export async function getDailySelection(userId: string): Promise<DailySelection> {
  const { pool, profile, timezone, currentSlot, windowKey } = await loadDashboardContext(userId);
  const poolById = new Map(pool.map((r) => [r.id, r]));

  const existing = await prisma.servedCard.findMany({
    where: { userId, windowKey },
    orderBy: { servedAt: "desc" },
  });

  const distinctServedAt = [...new Set(existing.map((c) => c.servedAt.getTime()))].sort(
    (a, b) => b - a
  );
  const refreshesUsedThisWindow = Math.max(0, distinctServedAt.length - 1);

  let served: EligibleRecipe[];

  if (distinctServedAt.length > 0) {
    const latestServedAt = distinctServedAt[0];
    const latestCards = existing.filter((c) => c.servedAt.getTime() === latestServedAt);
    served = latestCards
      .map((c) => poolById.get(c.recipeId))
      .filter((r): r is EligibleRecipe => Boolean(r));

    // Top up if some previously-served recipes rotated out of eligibility.
    if (served.length < DAILY_CARD_COUNT && pool.length > 0) {
      const servedIds = new Set(served.map((r) => r.id));
      const includeSnack = shouldScatterSnack(`${userId}:${windowKey}`);
      const topUp = pickDaily(pool, profile, currentSlot, includeSnack, servedIds).filter(
        (r) => !servedIds.has(r.id)
      );
      served = [...served, ...topUp].slice(0, DAILY_CARD_COUNT);
    }
  } else if (pool.length > 0) {
    const includeSnack = shouldScatterSnack(`${userId}:${windowKey}`);
    served = pickDaily(pool, profile, currentSlot, includeSnack);
    if (served.length > 0) {
      const servedAt = new Date();
      await prisma.servedCard.createMany({
        data: served.map((r) => ({ userId, recipeId: r.id, servedAt, windowKey })),
      });
    }
  } else {
    served = [];
  }

  const cookbooks = await loadCookbookSections(pool);

  return {
    pool: pool.map(toCardData),
    served: served.map(toCardData),
    currentSlot,
    refreshAvailable: refreshesUsedThisWindow < MAX_MANUAL_REFRESHES_PER_WINDOW,
    nextWindowAt: nextMealSlotWindowAt(timezone),
    userDiets: profile.diets,
    cookbooks,
  };
}

export type RefreshResult =
  | { ok: true; served: RecipeCardData[]; nextWindowAt: Date }
  | { ok: false; reason: "no-refresh-available"; nextWindowAt: Date };

export async function refreshDailySelection(userId: string): Promise<RefreshResult> {
  const { pool, profile, timezone, currentSlot, windowKey } = await loadDashboardContext(userId);

  const existing = await prisma.servedCard.findMany({
    where: { userId, windowKey },
  });
  const distinctServedAt = new Set(existing.map((c) => c.servedAt.getTime()));
  const refreshesUsedThisWindow = Math.max(0, distinctServedAt.size - 1);

  if (refreshesUsedThisWindow >= MAX_MANUAL_REFRESHES_PER_WINDOW) {
    return {
      ok: false,
      reason: "no-refresh-available",
      nextWindowAt: nextMealSlotWindowAt(timezone),
    };
  }

  const currentIds = new Set(existing.map((c) => c.recipeId));
  const includeSnack = shouldScatterSnack(`${userId}:${windowKey}:refresh`);
  const served = pickDaily(pool, profile, currentSlot, includeSnack, currentIds);

  if (served.length > 0) {
    const servedAt = new Date();
    await prisma.servedCard.createMany({
      data: served.map((r) => ({ userId, recipeId: r.id, servedAt, windowKey })),
    });
  }

  return { ok: true, served: served.map(toCardData), nextWindowAt: nextMealSlotWindowAt(timezone) };
}
