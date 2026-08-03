import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const foodGroup = await prisma.foodGroup.findUnique({
    where: { id },
    include: {
      _count: { select: { foodGroupPreferences: true, recipeProfiles: true } },
    },
  });
  if (!foodGroup) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const inUse = foodGroup._count.foodGroupPreferences + foodGroup._count.recipeProfiles;
  if (inUse > 0) {
    return NextResponse.json(
      {
        error: `"${foodGroup.name}" is still referenced by ${foodGroup._count.foodGroupPreferences} user preference(s) and ${foodGroup._count.recipeProfiles} recipe profile(s). Deleting it would silently drop that data, so it's blocked here — remove those references first if you're sure.`,
      },
      { status: 409 },
    );
  }

  await prisma.foodGroup.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
