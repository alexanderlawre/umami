import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { filterEligibleRecipes, type FilterableRecipe } from "@/lib/recommend/filter";
import { shuffle } from "@/lib/shuffle";
import { savedRecipeExpiryCutoff } from "@/lib/saved-recipes";
import { DashboardClient, type RecipeCardData } from "./dashboard-client";

type EligibleRecipe = FilterableRecipe & RecipeCardData;

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.onboarded) redirect("/onboarding");

  const [preferences, recipes, savedRecipes] = await Promise.all([
    prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
      include: { diets: true, allergens: true },
    }),
    prisma.recipe.findMany({
      where: { isActive: true },
      include: { dietTags: true, allergenTags: true },
    }),
    prisma.savedRecipe.findMany({
      where: { userId: session.user.id, savedAt: { gte: savedRecipeExpiryCutoff() } },
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
    cuisine: r.cuisine,
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
    saved: savedRecipeIds.has(r.id),
  }));

  const eligible = filterEligibleRecipes(candidates, userProfile);
  const shuffled = shuffle(eligible);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-[#1A1D1B]">Today</h1>
      <p className="mt-1 text-sm text-[#6B7370]">
        Four recipes. That&apos;s the whole surface.
      </p>

      <div className="mt-6">
        <DashboardClient recipes={shuffled} />
      </div>
    </main>
  );
}
