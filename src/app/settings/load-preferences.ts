import { prisma } from "@/lib/prisma";
import { FOOD_GROUP_CLUSTERS } from "@/lib/food-group-screens";

// Shared loader used by both the Preferences and Personalization settings
// pages — each page only *renders* a subset of these fields, but both need
// the full set as initial state so their (unmodified) fields round-trip
// correctly when POSTing the combined payload to /api/onboarding.
export async function loadPreferencesData(userId: string) {
  const [diets, allergens, foodGroups, preferences, foodGroupPreferences] = await Promise.all([
    prisma.diet.findMany({ orderBy: { name: "asc" } }),
    prisma.allergen.findMany({ orderBy: { name: "asc" } }),
    prisma.foodGroup.findMany({ orderBy: { name: "asc" } }),
    prisma.userPreferences.findUnique({
      where: { userId },
      include: { diets: true, allergens: true },
    }),
    prisma.foodGroupPreference.findMany({
      where: { userId },
    }),
  ]);

  const declaredByFoodGroupId = new Map(
    foodGroupPreferences.map((fp) => [fp.foodGroupId, fp.declaredValue]),
  );
  const foodGroupIdByName = new Map(foodGroups.map((fg) => [fg.name, fg.id]));

  // Same clustering as onboarding's "personalize" step — a cluster's slider
  // value is the average of its underlying FoodGroup declared values (or 50
  // if the user has no saved preference for any group in that cluster yet).
  const initialClusterValues = FOOD_GROUP_CLUSTERS.map((cluster) => {
    const values = cluster.groups
      .map((name) => foodGroupIdByName.get(name))
      .filter((id): id is string => !!id)
      .map((id) => declaredByFoodGroupId.get(id))
      .filter((v): v is number => v !== undefined);
    if (values.length === 0) return 50;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  });

  return {
    diets,
    allergens,
    foodGroups,
    initialDietIds: preferences?.diets.map((d) => d.id) ?? [],
    initialAllergenIds: preferences?.allergens.map((a) => a.id) ?? [],
    initialCustomAllergens: preferences?.customAllergens ?? [],
    initialFavoriteCuisines: preferences?.favoriteCuisines ?? [],
    initialFoodGroupFeedback: preferences?.foodGroupFeedback ?? "",
    initialClusterValues,
    initialSpiceMax: preferences?.spiceMax ?? null,
  };
}
