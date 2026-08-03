import { prisma } from "@/lib/prisma";
import { filterEligibleRecipes, type FilterableRecipe } from "@/lib/recommend/filter";
import { shuffle } from "@/lib/shuffle";
import { savedRecipeExpiryCutoff } from "@/lib/saved-recipes";
import { currentWindowStart, nextWindowStart } from "@/lib/dashboard-window";
import type { RecipeCardData } from "@/app/dashboard/dashboard-client";

export const DAILY_CARD_COUNT = 4;
export const MAX_MANUAL_REFRESHES_PER_WINDOW = 1;

export type EligibleRecipe = FilterableRecipe & RecipeCardData;

async function loadEligiblePool(userId: string): Promise<EligibleRecipe[]> {
  const [preferences, recipes, savedRecipes] = await Promise.all([
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

  return filterEligibleRecipes(candidates, userProfile);
}

// Favorited (saved) recipes get priority for the daily four so a starred
// recipe is more likely to keep surfacing, without ever being *required* to
// (saving itself, via SavedRecipe, already persists independent of what the
// dashboard shows — see cook-later).
function pickDaily(pool: EligibleRecipe[], exclude: Set<string> = new Set()): EligibleRecipe[] {
  const available = pool.filter((r) => !exclude.has(r.id));
  const base = available.length >= DAILY_CARD_COUNT ? available : pool;
  const favorited = shuffle(base.filter((r) => r.saved));
  const rest = shuffle(base.filter((r) => !r.saved));
  return [...favorited, ...rest].slice(0, DAILY_CARD_COUNT);
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
    imageUrl: r.imageUrl,
    imageCredit: r.imageCredit,
    saved: r.saved,
  };
}

export type DailySelection = {
  pool: RecipeCardData[];
  served: RecipeCardData[];
  refreshAvailable: boolean;
  nextWindowAt: Date;
};

export async function getDailySelection(userId: string): Promise<DailySelection> {
  const pool = await loadEligiblePool(userId);
  const windowStart = currentWindowStart();
  const poolById = new Map(pool.map((r) => [r.id, r]));

  const existing = await prisma.servedCard.findMany({
    where: { userId, servedAt: { gte: windowStart } },
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
      const topUp = pickDaily(pool, servedIds).filter((r) => !servedIds.has(r.id));
      served = [...served, ...topUp].slice(0, DAILY_CARD_COUNT);
    }
  } else if (pool.length > 0) {
    served = pickDaily(pool);
    if (served.length > 0) {
      const servedAt = new Date();
      await prisma.servedCard.createMany({
        data: served.map((r) => ({ userId, recipeId: r.id, servedAt })),
      });
    }
  } else {
    served = [];
  }

  return {
    pool: pool.map(toCardData),
    served: served.map(toCardData),
    refreshAvailable: refreshesUsedThisWindow < MAX_MANUAL_REFRESHES_PER_WINDOW,
    nextWindowAt: nextWindowStart(),
  };
}

export type RefreshResult =
  | { ok: true; served: RecipeCardData[]; nextWindowAt: Date }
  | { ok: false; reason: "no-refresh-available"; nextWindowAt: Date };

export async function refreshDailySelection(userId: string): Promise<RefreshResult> {
  const pool = await loadEligiblePool(userId);
  const windowStart = currentWindowStart();

  const existing = await prisma.servedCard.findMany({
    where: { userId, servedAt: { gte: windowStart } },
  });
  const distinctServedAt = new Set(existing.map((c) => c.servedAt.getTime()));
  const refreshesUsedThisWindow = Math.max(0, distinctServedAt.size - 1);

  if (refreshesUsedThisWindow >= MAX_MANUAL_REFRESHES_PER_WINDOW) {
    return { ok: false, reason: "no-refresh-available", nextWindowAt: nextWindowStart() };
  }

  const currentIds = new Set(existing.map((c) => c.recipeId));
  const served = pickDaily(pool, currentIds);

  if (served.length > 0) {
    const servedAt = new Date();
    await prisma.servedCard.createMany({
      data: served.map((r) => ({ userId, recipeId: r.id, servedAt })),
    });
  }

  return { ok: true, served: served.map(toCardData), nextWindowAt: nextWindowStart() };
}
