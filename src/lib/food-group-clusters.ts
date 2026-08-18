import { FOOD_GROUP_CLUSTERS } from "@/lib/food-group-screens";

// Reverse lookup from a raw FoodGroup.name (e.g. "Leafy greens") to its
// broader UI cluster title (e.g. "Vegetables") — built once from the same
// FOOD_GROUP_CLUSTERS single source of truth food-group-screens.ts already
// uses for onboarding/personalization sliders. This file doesn't redefine
// the clusters, just adds a dashboard-filter-specific reverse index + the
// prominence threshold below.
export const FOOD_GROUP_NAME_TO_CLUSTER: Map<string, string> = new Map(
  FOOD_GROUP_CLUSTERS.flatMap(({ title, groups }) => groups.map((name) => [name, title] as const)),
);

// How prominently a food group needs to feature in a recipe (RecipeFoodGroup
// .weight, 0-100) before that recipe counts as "more of" that food group's
// cluster for dashboard filter-chip purposes. Measured against the full seed
// catalog (2207 weight rows, median 25, p75 45): a threshold of 50 starves
// several clusters (e.g. "Fruit" -> 9 recipes, "Spice & heat" -> 5), while 30
// keeps every one of the 12 clusters usable (22-220 recipes each).
export const FOOD_GROUP_PROMINENCE_THRESHOLD = 30;

/**
 * Given a recipe's food-group weights (by raw FoodGroup name), returns the
 * deduped, sorted list of cluster titles this recipe prominently belongs to
 * — i.e. the "more of ___" dashboard filter tags this recipe should match.
 */
export function clustersForRecipe(foodGroups: { name: string; weight: number }[]): string[] {
  const clusters = new Set<string>();
  for (const { name, weight } of foodGroups) {
    if (weight < FOOD_GROUP_PROMINENCE_THRESHOLD) continue;
    const cluster = FOOD_GROUP_NAME_TO_CLUSTER.get(name);
    if (cluster) clusters.add(cluster);
  }
  return [...clusters].sort();
}
