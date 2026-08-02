import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { savedRecipeExpiryCutoff } from "@/lib/saved-recipes";
import { CookLaterClient } from "./cook-later-client";

const SAVED_RECIPE_CAP = 10;

export default async function CookLaterPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.onboarded) redirect("/onboarding");

  const saved = await prisma.savedRecipe.findMany({
    where: { userId: session.user.id, savedAt: { gte: savedRecipeExpiryCutoff() } },
    include: {
      recipe: { include: { dietTags: true } },
    },
    orderBy: { savedAt: "desc" },
  });

  const recipes = saved.map((s) => ({
    id: s.recipe.id,
    slug: s.recipe.slug,
    title: s.recipe.title,
    shortDescription: s.recipe.shortDescription,
    note: s.recipe.note,
    cuisine: s.recipe.cuisine,
    mealSlot: s.recipe.mealSlot,
    prepMinutes: s.recipe.prepMinutes,
    cookMinutes: s.recipe.cookMinutes,
    attributes: s.recipe.attributes,
    dietTags: s.recipe.dietTags.map((d) => d.name),
    imageUrl: s.recipe.imageUrl,
    imageCredit: s.recipe.imageCredit,
  }));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-[#1A1D1B]">Cook later</h1>
      <p className="mt-1 text-sm text-[#6B7370]">
        {recipes.length}/{SAVED_RECIPE_CAP} saved. Cook one to make room for more.
      </p>

      <div className="mt-6">
        <CookLaterClient recipes={recipes} />
      </div>
    </main>
  );
}
