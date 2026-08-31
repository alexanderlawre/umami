import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; recipeId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, recipeId } = await params;
  const cookbook = await prisma.userCookbook.findUnique({ where: { id } });
  if (!cookbook || cookbook.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.userCookbookRecipe.deleteMany({
    where: { userCookbookId: id, recipeId },
  });

  return NextResponse.json({ ok: true });
}
