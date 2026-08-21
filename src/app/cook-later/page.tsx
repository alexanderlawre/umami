import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { savedRecipeExpiryCutoff } from "@/lib/saved-recipes";
import { filterEligibleRecipes, type FilterableRecipe } from "@/lib/recommend/filter";
import { CookLaterClient } from "./cook-later-client";

const SAVED_RECIPE_CAP = 10;

export default async function CookLaterPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.onboarded) redirect("/onboarding");

  const userId = session.user.id;

  const [saved, preferences, strictDietPrefs] = await Promise.all([
    prisma.savedRecipe.findMany({
      where: { userId, savedAt: { gte: savedRecipeExpiryCutoff() } },
      include: {
        recipe: {
          include: {
            dietTags: true,
            cuisine: true,
            attributeTags: { select: { code: true } },
            allergenTags: true,
            ingredients: { select: { item: true } },
          },
        },
      },
      orderBy: { savedAt: "desc" },
    }),
    prisma.userPreferences.findUnique({
      where: { userId },
      include: { allergens: true },
    }),
    // Only STRICT diets are a hard filter here, matching the dashboard (see
    // select-daily.ts's loadDashboardContext) — MODERATE/FLEXIBLE diets are
    // a "mostly, but open to other things" preference, not a requirement
    // every saved recipe must satisfy.
    prisma.userDietPreference.findMany({
      where: { userId, commitment: "STRICT" },
      include: { diet: true },
    }),
  ]);

  const userProfile = {
    diets: strictDietPrefs.map((d) => d.diet.name),
    allergens: preferences?.allergens.map((a) => a.name) ?? [],
    customAllergens: preferences?.customAllergens ?? [],
  };

  type SavedFilterable = FilterableRecipe & { savedRecipeIndex: number };

  // Re-apply the same hard allergen filter used everywhere else a recipe can
  // surface (see src/lib/recommend/filter.ts). A recipe saved before the
  // user declared an allergy (or before its allergen tags were corrected by
  // admin) must not keep showing up here indefinitely — allergy safety is a
  // hard block, not a one-time check at save time.
  const filterable: SavedFilterable[] = saved.map((s, i) => ({
    id: s.recipe.id,
    isActive: s.recipe.isActive,
    allergenReviewStatus: s.recipe.allergenReviewStatus,
    dietTags: s.recipe.dietTags.map((d) => d.name),
    allergenTags: s.recipe.allergenTags.map((a) => a.name),
    ingredientItems: s.recipe.ingredients.map((ing) => ing.item),
    savedRecipeIndex: i,
  }));

  const eligible = filterEligibleRecipes(filterable, userProfile);
  const eligibleIndexes = new Set(eligible.map((r) => r.savedRecipeIndex));
  const hiddenCount = saved.length - eligible.length;

  const recipes = saved
    .filter((_, i) => eligibleIndexes.has(i))
    .map((s) => ({
      id: s.recipe.id,
      slug: s.recipe.slug,
      title: s.recipe.title,
      shortDescription: s.recipe.shortDescription,
      note: s.recipe.note,
      cuisine: s.recipe.cuisine.name,
      mealSlot: s.recipe.mealSlot,
      prepMinutes: s.recipe.prepMinutes,
      cookMinutes: s.recipe.cookMinutes,
      attributes: s.recipe.attributeTags.map((t) => t.code),
      dietTags: s.recipe.dietTags.map((d) => d.name),
      ingredientItems: s.recipe.ingredients.map((ing) => ing.item),
      imageUrl: s.recipe.imageUrl,
      imageCredit: s.recipe.imageCredit,
    }));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-[#1A1D1B]">Cook later</h1>
      <p className="mt-1 text-sm text-[#6B7370]">
        {saved.length}/{SAVED_RECIPE_CAP} saved. Cook one to make room for more.
      </p>
      {hiddenCount > 0 && (
        <p className="mt-1 text-sm text-[#B23A32]">
          {hiddenCount} saved {hiddenCount === 1 ? "recipe" : "recipes"} hidden due to your
          allergy or diet settings.
        </p>
      )}

      <div className="mt-6">
        <CookLaterClient recipes={recipes} />
      </div>
    </main>
  );
}
