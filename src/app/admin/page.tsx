import { prisma } from "@/lib/prisma";
import { AdminClient, type AdminRecipeRow } from "./admin-client";

export default async function AdminPage() {
  const [
    userCount,
    recipeCount,
    activeRecipeCount,
    unverifiedRecipeCount,
    cookLogCount,
    interactionCounts,
    recipes,
    cuisines,
    diets,
    allergens,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.recipe.count(),
    prisma.recipe.count({ where: { isActive: true } }),
    prisma.recipe.count({ where: { allergenReviewStatus: "UNVERIFIED" } }),
    prisma.cookLog.count(),
    prisma.interaction.groupBy({ by: ["type"], _count: true }),
    prisma.recipe.findMany({
      orderBy: { title: "asc" },
      select: {
        id: true,
        slug: true,
        title: true,
        cuisine: { select: { id: true, name: true } },
        isActive: true,
        allergenReviewStatus: true,
        imageUrl: true,
      },
    }),
    prisma.cuisine.findMany({ orderBy: { name: "asc" } }),
    prisma.diet.findMany({ orderBy: { name: "asc" } }),
    prisma.allergen.findMany({ orderBy: { name: "asc" } }),
  ]);

  const recipeRows = recipes.map((r) => ({
    ...r,
    cuisine: r.cuisine.name,
    cuisineId: r.cuisine.id,
  }));

  const stats = {
    userCount,
    recipeCount,
    activeRecipeCount,
    unverifiedRecipeCount,
    cookLogCount,
    interactionCounts: interactionCounts.map((i) => ({
      type: i.type,
      count: i._count,
    })),
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-[#1A1D1B]">Admin</h1>
      <p className="mt-1 text-sm text-[#6B7370]">
        Recipe management and basic usage stats.
      </p>

      <div className="mt-6">
        <AdminClient
          stats={stats}
          recipes={recipeRows as AdminRecipeRow[]}
          cuisines={cuisines}
          diets={diets}
          allergens={allergens}
        />
      </div>
    </main>
  );
}
