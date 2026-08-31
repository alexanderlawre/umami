import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recipeCardSelect, toRecipeCardData } from "@/lib/recipe-card-data";
import { PublicProfileClient } from "./public-profile-client";

// Public view of another user's profile — only ever exposes their name,
// photo, and public cookbooks (+ recipes). Deliberately excludes email,
// birthday, location, diet/allergen preferences, and the private cook
// archive. Requires any signed-in session (not ownership) to view; there is
// no directory/search linking here, it's reachable only via direct URL.
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.onboarded) redirect("/onboarding");

  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, image: true },
  });
  if (!user) notFound();

  const cookbooks = await prisma.userCookbook.findMany({
    where: { userId },
    include: {
      recipes: {
        include: { recipe: { select: recipeCardSelect } },
        orderBy: { addedAt: "desc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <PublicProfileClient
      name={user.name}
      image={user.image}
      cookbooks={cookbooks.map((cookbook) => ({
        id: cookbook.id,
        name: cookbook.name,
        coverImageUrl: cookbook.coverImageUrl,
        recipes: cookbook.recipes.map((r) => toRecipeCardData(r.recipe)),
      }))}
    />
  );
}
