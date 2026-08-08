import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  cookbookId: z.string().trim().min(1),
});

// Add this recipe to a cookbook. Idempotent — adding an already-present
// recipe is a no-op rather than an error, so the admin UI can fire this on
// every checkbox check without needing to track prior state precisely.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: recipeId } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { cookbookId } = parsed.data;

  await prisma.cookbookRecipe.upsert({
    where: { cookbookId_recipeId: { cookbookId, recipeId } },
    create: { cookbookId, recipeId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

// Remove this recipe from a cookbook.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: recipeId } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { cookbookId } = parsed.data;

  await prisma.cookbookRecipe.deleteMany({ where: { cookbookId, recipeId } });

  return NextResponse.json({ ok: true });
}
