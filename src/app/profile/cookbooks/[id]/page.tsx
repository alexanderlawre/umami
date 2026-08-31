import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recipeCardSelect, toRecipeCardData } from "@/lib/recipe-card-data";
import { CookbookManageClient } from "./cookbooks-manage-client";

export default async function CookbookManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.onboarded) redirect("/onboarding");

  const { id } = await params;
  const userId = session.user.id;

  const cookbook = await prisma.userCookbook.findUnique({
    where: { id },
    include: {
      recipes: {
        include: { recipe: { select: recipeCardSelect } },
        orderBy: { addedAt: "desc" },
      },
    },
  });
  if (!cookbook || cookbook.userId !== userId) notFound();

  const inCookbookIds = new Set(cookbook.recipes.map((r) => r.recipeId));

  const cookLogs = await prisma.cookLog.findMany({
    where: { userId },
    include: { recipe: { select: recipeCardSelect } },
    orderBy: { cookedAt: "desc" },
  });
  const cookedByRecipe = new Map<string, (typeof cookLogs)[number]["recipe"]>();
  for (const log of cookLogs) {
    if (!cookedByRecipe.has(log.recipeId)) cookedByRecipe.set(log.recipeId, log.recipe);
  }
  const availableToAdd = [...cookedByRecipe.values()]
    .filter((recipe) => !inCookbookIds.has(recipe.id))
    .map(toRecipeCardData);

  return (
    <CookbookManageClient
      cookbookId={cookbook.id}
      initialName={cookbook.name}
      initialCoverImageUrl={cookbook.coverImageUrl}
      recipes={cookbook.recipes.map((r) => toRecipeCardData(r.recipe))}
      availableToAdd={availableToAdd}
    />
  );
}
