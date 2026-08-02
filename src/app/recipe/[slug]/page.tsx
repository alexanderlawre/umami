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
    },
  });

  if (!recipe || !recipe.isActive) notFound();

  const saved = await prisma.savedRecipe.findUnique({
    where: { userId_recipeId: { userId: session.user.id, recipeId: recipe.id } },
  });
  const isSavedAndFresh = !!saved && saved.savedAt >= savedRecipeExpiryCutoff();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <RecipeDetailClient recipe={recipe} initialSaved={isSavedAndFresh} />
    </main>
  );
}
