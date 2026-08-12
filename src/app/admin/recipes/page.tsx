import { prisma } from "@/lib/prisma";
import { RecipesClient, type AdminRecipeRow } from "./recipes-client";

export default async function AdminRecipesPage() {
  const [recipes, cuisines, diets, allergens, cookbooks, attributeTags] = await Promise.all([
    prisma.recipe.findMany({
      orderBy: { title: "asc" },
      select: {
        id: true,
        slug: true,
        title: true,
        cuisine: { select: { id: true, name: true } },
        mealSlot: true,
        isActive: true,
        archivedReason: true,
        allergenReviewStatus: true,
        imageUrl: true,
        cookbookEntries: { select: { cookbookId: true } },
      },
    }),
    prisma.cuisine.findMany({ orderBy: { name: "asc" } }),
    prisma.diet.findMany({ orderBy: { name: "asc" } }),
    prisma.allergen.findMany({ orderBy: { name: "asc" } }),
    prisma.cookbook.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.attributeTag.findMany({ orderBy: { name: "asc" } }),
  ]);

  const recipeRows = recipes.map((r) => ({
    ...r,
    cuisine: r.cuisine.name,
    cuisineId: r.cuisine.id,
    cookbookIds: r.cookbookEntries.map((e) => e.cookbookId),
  }));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-[#1A1D1B]">Recipes</h1>
      <p className="mt-1 text-sm text-[#6B7370]">
        Grouped by meal category. Click a category to expand it, then edit a recipe&apos;s tags,
        content, and photo, or toggle visibility.
      </p>

      <div className="mt-6">
        <RecipesClient
          recipes={recipeRows as AdminRecipeRow[]}
          cuisines={cuisines}
          diets={diets}
          allergens={allergens}
          cookbooks={cookbooks}
          attributeTags={attributeTags}
        />
      </div>
    </main>
  );
}
