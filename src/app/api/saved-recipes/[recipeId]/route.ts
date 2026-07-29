import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ recipeId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { recipeId } = await params;
  const userId = session.user.id;

  await prisma.savedRecipe.deleteMany({
    where: { userId, recipeId },
  });

  return NextResponse.json({ saved: false });
}
