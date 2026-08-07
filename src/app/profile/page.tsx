import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.onboarded) redirect("/onboarding");

  const [user, cookLogs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    }),
    prisma.cookLog.findMany({
      where: { userId: session.user.id },
      include: {
        recipe: { include: { dietTags: true, cuisine: true } },
      },
      orderBy: { cookedAt: "desc" },
    }),
  ]);

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
    <ProfileClient
      initialName={user?.name ?? ""}
      email={user?.email ?? session.user.email ?? ""}
      cooked={cooked}
    />
  );
}
