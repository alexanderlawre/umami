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

  const [saved, cookLogs] = await Promise.all([
    prisma.savedRecipe.findMany({
      where: { userId: session.user.id, savedAt: { gte: savedRecipeExpiryCutoff() } },
      include: {
        recipe: { include: { dietTags: true, cuisine: true } },
      },
      orderBy: { savedAt: "desc" },
    }),
    prisma.cookLog.findMany({
      where: { userId: session.user.id },
      include: {
        recipe: { include: { dietTags: true, cuisine: true } },
      },
      orderBy: { cookedAt: "desc" },
    }),
  ]);

  const recipes = saved.map((s) => ({
    id: s.recipe.id,
    slug: s.recipe.slug,
    title: s.recipe.title,
    shortDescription: s.recipe.shortDescription,
    note: s.recipe.note,
    cuisine: s.recipe.cuisine.name,
    mealSlot: s.recipe.mealSlot,
    prepMinutes: s.recipe.prepMinutes,
    cookMinutes: s.recipe.cookMinutes,
    attributes: s.recipe.attributes,
    dietTags: s.recipe.dietTags.map((d) => d.name),
    imageUrl: s.recipe.imageUrl,
    imageCredit: s.recipe.imageCredit,
  }));

  // Dedupe by recipe, keeping the most recent cook and a running count —
  // CookLog rows are never deleted, so a frequently-cooked recipe would
  // otherwise show up many times in a row.
  const cookedByRecipe = new Map<
    string,
    { recipe: (typeof cookLogs)[number]["recipe"]; lastCookedAt: Date; timesCooked: number }
  >();
  for (const log of cookLogs) {
    const existing = cookedByRecipe.get(log.recipeId);
    if (existing) {
      existing.timesCooked += 1;
      if (log.cookedAt > existing.lastCookedAt) existing.lastCookedAt = log.cookedAt;
    } else {
      cookedByRecipe.set(log.recipeId, {
        recipe: log.recipe,
        lastCookedAt: log.cookedAt,
        timesCooked: 1,
      });
    }
  }
  const cooked = [...cookedByRecipe.values()]
    .sort((a, b) => b.lastCookedAt.getTime() - a.lastCookedAt.getTime())
    .map(({ recipe, lastCookedAt, timesCooked }) => ({
      id: recipe.id,
      slug: recipe.slug,
      title: recipe.title,
      shortDescription: recipe.shortDescription,
      note: recipe.note,
      cuisine: recipe.cuisine.name,
      mealSlot: recipe.mealSlot,
      prepMinutes: recipe.prepMinutes,
      cookMinutes: recipe.cookMinutes,
      attributes: recipe.attributes,
      dietTags: recipe.dietTags.map((d) => d.name),
      imageUrl: recipe.imageUrl,
      imageCredit: recipe.imageCredit,
      lastCookedAt: lastCookedAt.toISOString(),
      timesCooked,
    }));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-[#1A1D1B]">Cook later</h1>
      <p className="mt-1 text-sm text-[#6B7370]">
        {recipes.length}/{SAVED_RECIPE_CAP} saved. Cook one to make room for more.
      </p>

      <div className="mt-6">
        <CookLaterClient recipes={recipes} cooked={cooked} />
      </div>
    </main>
  );
}
