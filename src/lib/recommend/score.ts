// Soft scoring: everything here only ever re-ranks the pool that already
// passed the hard allergen filter (see filter.ts) — nothing in this module
// excludes a recipe. Diet match, meal-slot match, and favorite-cuisine match
// are all rewards, not requirements, so the dashboard never goes empty.

import type { MealSlot } from "@/lib/meal-slot";

export type ScorableRecipe = {
  dietTags: string[];
  mealSlot: string[];
  cuisine: string;
};

export type ScoringProfile = {
  diets: string[];
  favoriteCuisines: string[];
};

const MEAL_SLOT_MATCH_WEIGHT = 6;
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

  if (recipe.mealSlot.includes(currentSlot)) {
    score += MEAL_SLOT_MATCH_WEIGHT;
  }

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
