import { prisma } from "@/lib/prisma";
import { CookbooksClient } from "./cookbooks-client";

export default async function AdminCookbooksPage() {
  const cookbooks = await prisma.cookbook.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { recipes: true } } },
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-[#1A1D1B]">Cookbooks</h1>
      <p className="mt-1 text-sm text-[#6B7370]">
        Named, curated recipe collections (e.g. &quot;Editor&apos;s Picks&quot;) shown as
        highlighted sections on the dashboard. Rename or delete a cookbook here. To add or remove
        recipes from a cookbook, use the Cookbooks button on each recipe in the{" "}
        <span className="font-medium text-[#1A1D1B]">Recipes</span> tab.
      </p>

      <div className="mt-6">
        <CookbooksClient
          cookbooks={cookbooks.map((c) => ({ id: c.id, name: c.name, recipeCount: c._count.recipes }))}
        />
      </div>
    </main>
  );
}
