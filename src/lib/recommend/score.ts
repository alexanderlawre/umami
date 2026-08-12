// Soft scoring: everything here only ever re-ranks the pool that already
// passed the hard allergen filter (see filter.ts) — nothing in this module
// excludes a recipe. Diet match, meal-slot match, and favorite-cuisine match
// are all rewards, not requirements, so the dashboard never goes empty.

import type { MealSlot } from "@/lib/meal-slot";

export type ScorableRecipe = {
  dietTags: string[];
  mealSlot: string;
  cuisine: string;
};

export type ScoringProfile = {
  diets: string[];
  favoriteCuisines: string[];
};

// The main rotation pool only ever contains LUNCH/DINNER recipes (Breakfast
// and Tapas live in their own always-on rotating sections — see
// select-daily.ts). Rather than a hard include/exclude, the *current* slot
// (lunch-weighted 6am-noon, dinner-weighted the rest of the day — see
// meal-slot.ts) just gets a bigger bonus than the other one, so the
// off-slot dish is still reachable, just less likely.
const PRIMARY_MEAL_SLOT_WEIGHT = 6;
const SECONDARY_MEAL_SLOT_WEIGHT = 2;
const DIET_MATCH_WEIGHT = 2;
const FAVORITE_CUISINE_WEIGHT = 3;
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

  return score;
}

// Weighted-random shuffle: higher-scoring recipes are more likely to sort
// earlier, but nothing is ever excluded — every recipe has a nonzero chance.
export function weightedShuffle<T>(items: T[], weightOf: (item: T) => number): T[] {
  const pool = items.map((item) => ({ item, key: Math.random() ** (1 / Math.max(weightOf(item), 0.01)) }));
  pool.sort((a, b) => b.key - a.key);
  return pool.map((p) => p.item);
}
