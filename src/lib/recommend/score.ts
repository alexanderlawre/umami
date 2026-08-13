// Soft scoring: everything here only ever re-ranks the pool that already
// passed the hard allergen filter (see filter.ts) — nothing in this module
// excludes a recipe. Diet match, meal-slot match, favorite-cuisine match,
// learned food-group affinity, and implicit (behavior-derived) cuisine
// match are all rewards, not requirements, so the dashboard never goes
// empty and a brand-new user with zero behavioral history still gets a
// perfectly good score from just their declared onboarding preferences.

import type { MealSlot } from "@/lib/meal-slot";

export type ScorableRecipe = {
  dietTags: string[];
  mealSlot: string;
  cuisine: string;
  // 0-100 weight per FoodGroup this recipe belongs to (RecipeFoodGroup) —
  // optional so any caller that doesn't care about learned personalization
  // (or hasn't loaded it) keeps working unchanged.
  foodGroups?: { foodGroupId: string; weight: number }[];
};

export type ScoringProfile = {
  diets: string[];
  favoriteCuisines: string[];
  // Blended per-FoodGroup affinity (0-100), keyed by FoodGroup id — see
  // select-daily.ts's loadDashboardContext for how this is derived from
  // FoodGroupPreference (learnedValue once it has drifted from
  // declaredValue, i.e. real behavioral signal exists; declaredValue
  // otherwise). Absent entirely for cold-start users with no preferences
  // row yet — the affinity term below just contributes nothing then.
  foodGroupAffinity?: Map<string, number>;
  // Cuisines inferred from actual cooking behavior (CookLog), additive on
  // top of — not a replacement for — the user's declared onboarding
  // favoriteCuisines.
  implicitFavoriteCuisines?: string[];
};

// The main rotation pool only ever contains LUNCH/DINNER recipes (Breakfast
// and Tapas live in their own always-on rotating sections — see
// select-daily.ts). Rather than a hard include/exclude, the *current* slot
// (lunch-weighted 6am-noon, dinner-weighted the rest of the day — see
// meal-slot.ts) just gets a bigger bonus than the other one, so the
// off-slot dish is still reachable, just less likely.
const PRIMARY_MEAL_SLOT_WEIGHT = 6;
const SECONDARY_MEAL_SLOT_WEIGHT = 2;
const DIET_MATCH_WEIGHT = 3;
const FAVORITE_CUISINE_WEIGHT = 5;
// Smaller than the declared favorite-cuisine bonus — behavior-inferred
// preference is a weaker signal than something the user explicitly told us.
// Still substantial: repeated cooking behavior is strong personalization
// evidence in its own right, not just a tiebreaker.
const IMPLICIT_CUISINE_WEIGHT = 3;
// Max bonus at perfect alignment (recipe weight and user affinity both
// 100); scales down smoothly as either drops toward 0. This is the biggest
// single lever behavioral learning (cook/star/dismiss — see learn.ts) has
// over the ranking, since it compounds across every food group a recipe
// touches rather than being a single flat bonus.
const FOOD_GROUP_AFFINITY_WEIGHT = 6;
// Every recipe gets a small base weight so recipes that match nothing are
// still eligible to be picked (weighted-random, not a cutoff).
const BASE_WEIGHT = 1;

export function scoreRecipe(
  recipe: ScorableRecipe,
  profile: ScoringProfile,
  currentSlot: MealSlot,
): number {
  let score = BASE_WEIGHT;

  score += recipe.mealSlot === currentSlot ? PRIMARY_MEAL_SLOT_WEIGHT : SECONDARY_MEAL_SLOT_WEIGHT;

  const matchedDiets = profile.diets.filter((diet) => recipe.dietTags.includes(diet)).length;
  score += matchedDiets * DIET_MATCH_WEIGHT;

  if (profile.favoriteCuisines.includes(recipe.cuisine)) {
    score += FAVORITE_CUISINE_WEIGHT;
  }

  if (profile.implicitFavoriteCuisines?.includes(recipe.cuisine)) {
    score += IMPLICIT_CUISINE_WEIGHT;
  }

  if (profile.foodGroupAffinity && recipe.foodGroups && recipe.foodGroups.length > 0) {
    score += foodGroupAffinityBonus(recipe.foodGroups, profile.foodGroupAffinity) * FOOD_GROUP_AFFINITY_WEIGHT;
  }

  return score;
}

// Average alignment across every food group this recipe touches — both the
// recipe's weight and the user's affinity are 0-100, so alignment is only
// high when *both* are high together (a recipe that's 100% "spicy" scores
// nothing extra from a user with 0 learned affinity for spicy food, and
// vice versa). Returns 0-1.
function foodGroupAffinityBonus(
  foodGroups: { foodGroupId: string; weight: number }[],
  affinity: Map<string, number>,
): number {
  const alignments = foodGroups.map(({ foodGroupId, weight }) => {
    const userAffinity = affinity.get(foodGroupId);
    if (userAffinity === undefined) return 0;
    return (weight / 100) * (userAffinity / 100);
  });
  return alignments.reduce((a, b) => a + b, 0) / alignments.length;
}

// Weighted-random shuffle: higher-scoring recipes are more likely to sort
// earlier, but nothing is ever excluded — every recipe has a nonzero chance.
export function weightedShuffle<T>(items: T[], weightOf: (item: T) => number): T[] {
  const pool = items.map((item) => ({ item, key: Math.random() ** (1 / Math.max(weightOf(item), 0.01)) }));
  pool.sort((a, b) => b.key - a.key);
  return pool.map((p) => p.item);
}
