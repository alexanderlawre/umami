import { prisma } from "@/lib/prisma";
import { PreferencesClient } from "./preferences-client";

export default async function AdminPreferencesPage() {
  const [diets, allergens, cuisines, foodGroups] = await Promise.all([
    prisma.diet.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { recipes: true, userPreferences: true, submissions: true } } },
    }),
    prisma.allergen.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { recipes: true, userPreferences: true, submissions: true } } },
    }),
    prisma.cuisine.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { recipes: true, submissions: true } } },
    }),
    prisma.foodGroup.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: { _count: { select: { foodGroupPreferences: true, recipeProfiles: true } } },
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-[#1A1D1B]">Preferences</h1>
      <p className="mt-1 text-sm text-[#6B7370]">
        Manage the diet, allergen, cuisine, and food-group options users choose from during
        onboarding and in Settings. Adding an option here makes it available everywhere
        immediately. Removing a diet, allergen, or food group also detaches it from every
        recipe and user preference that referenced it (you&apos;ll be asked to confirm first).
        Cuisines are the exception — every recipe requires one, so a cuisine still in use can&apos;t
        be removed until you reassign those recipes.
      </p>

      <div className="mt-6">
        <PreferencesClient
          diets={diets}
          allergens={allergens}
          cuisines={cuisines}
          foodGroups={foodGroups}
        />
      </div>
    </main>
  );
}
