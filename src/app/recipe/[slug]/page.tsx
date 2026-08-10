import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { savedRecipeExpiryCutoff } from "@/lib/saved-recipes";
import { RecipeDetailClient } from "./recipe-detail-client";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.onboarded) redirect("/onboarding");

  const recipe = await prisma.recipe.findUnique({
    where: { slug },
    include: {
      ingredients: { orderBy: { order: "asc" } },
      steps: { orderBy: { order: "asc" } },
      cuisine: true,
      allergenTags: true,
      attributeTags: true,
      dietTags: true,
    },
  });

  if (!recipe || !recipe.isActive) notFound();

  const [saved, preferences] = await Promise.all([
    prisma.savedRecipe.findUnique({
      where: { userId_recipeId: { userId: session.user.id, recipeId: recipe.id } },
    }),
    prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
      include: { allergens: true },
    }),
  ]);
  const isSavedAndFresh = !!saved && saved.savedAt >= savedRecipeExpiryCutoff();

  const declaredAllergens = preferences?.allergens.map((a) => a.name) ?? [];
  const declaredCustomAllergens = preferences?.customAllergens ?? [];
  const recipeAllergenNames = recipe.allergenTags.map((a) => a.name);
  const ingredientItemsLower = recipe.ingredients.map((i) => i.item.toLowerCase());

  const hasCatalogConflict = recipeAllergenNames.some((name) =>
    declaredAllergens.includes(name),
  );
  const hasCustomConflict = declaredCustomAllergens.some((term) => {
    const lower = term.trim().toLowerCase();
    return lower.length > 0 && ingredientItemsLower.some((item) => item.includes(lower));
  });
  const hasUnverifiedConflict =
    (declaredAllergens.length > 0 || declaredCustomAllergens.length > 0) &&
    recipe.allergenReviewStatus !== "VERIFIED";
  const allergyWarning = hasCatalogConflict || hasCustomConflict || hasUnverifiedConflict;

  const recipeDetail = {
    id: recipe.id,
    title: recipe.title,
    shortDescription: recipe.shortDescription,
    note: recipe.note,
    introCopy: recipe.introCopy,
    servings: recipe.servings,
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    difficulty: recipe.difficulty,
    cuisine: recipe.cuisine.name,
    effortTier: recipe.effortTier,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    imageUrl: recipe.imageUrl,
    imageCredit: recipe.imageCredit,
    caloriesPerServing: recipe.caloriesPerServing,
    proteinGrams: recipe.proteinGrams,
    carbsGrams: recipe.carbsGrams,
    fatGrams: recipe.fatGrams,
    fiberGrams: recipe.fiberGrams,
    cholesterolMg: recipe.cholesterolMg,
    attributes: recipe.attributeTags.map((a) => a.code),
    dietTags: recipe.dietTags.map((d) => d.name),
    allergenTags: recipeAllergenNames,
    allergenReviewStatus: recipe.allergenReviewStatus,
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      {allergyWarning && (
        <div className="mb-6 rounded-xl border border-[#B23A32] bg-[#FBEBE9] px-4 py-3 text-sm text-[#B23A32]">
          <p className="font-semibold">Possible allergen conflict</p>
          <p className="mt-1">
            This recipe may conflict with an allergy on your profile, or hasn&apos;t been
            verified against your declared allergies yet. Please review the ingredients
            carefully before cooking.
          </p>
        </div>
      )}
      <RecipeDetailClient
        recipe={recipeDetail}
        initialSaved={isSavedAndFresh}
        isPremium={session.user.isPremium}
      />
    </main>
  );
}
