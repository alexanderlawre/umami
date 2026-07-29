import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  recipeId: z.string(),
});

// "Cook Later" list is capped at 10 saved recipes per user, enforced here
// (blocking, not silent eviction) so the list can't be used as unbounded
// storage — see DECISIONS.md.
const SAVED_RECIPE_CAP = 10;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { recipeId } = parsed.data;
  const userId = session.user.id;

  const existing = await prisma.savedRecipe.findUnique({
    where: { userId_recipeId: { userId, recipeId } },
  });

  if (!existing) {
    const count = await prisma.savedRecipe.count({ where: { userId } });
    if (count >= SAVED_RECIPE_CAP) {
      return NextResponse.json(
        { error: `Cook Later is full (${SAVED_RECIPE_CAP}/${SAVED_RECIPE_CAP}). Remove a recipe before adding another.` },
        { status: 409 },
      );
    }
  }

  const saved = await prisma.savedRecipe.upsert({
    where: { userId_recipeId: { userId, recipeId } },
    create: { userId, recipeId },
    update: {},
  });

  return NextResponse.json({ saved: true, id: saved.id });
}
