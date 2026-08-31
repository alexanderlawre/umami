import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  recipeId: z.string(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const cookbook = await prisma.userCookbook.findUnique({ where: { id } });
  if (!cookbook || cookbook.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { recipeId } = parsed.data;
  const userId = session.user.id;

  // Hard gate: only recipes the user has actually cooked can be added to a
  // public cookbook.
  const hasCooked = await prisma.cookLog.findFirst({ where: { userId, recipeId } });
  if (!hasCooked) {
    return NextResponse.json(
      { error: "You can only add recipes you've marked as cooked." },
      { status: 403 },
    );
  }

  const entry = await prisma.userCookbookRecipe.upsert({
    where: { userCookbookId_recipeId: { userCookbookId: id, recipeId } },
    create: { userCookbookId: id, recipeId },
    update: {},
  });

  return NextResponse.json({ entry });
}
