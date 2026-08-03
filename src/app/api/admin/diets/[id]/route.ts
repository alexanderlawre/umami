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

  const diet = await prisma.diet.findUnique({
    where: { id },
    include: {
      _count: { select: { recipes: true, userPreferences: true, submissions: true } },
    },
  });
  if (!diet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const inUse = diet._count.recipes + diet._count.userPreferences + diet._count.submissions;
  if (inUse > 0) {
    return NextResponse.json(
      {
        error: `"${diet.name}" is still in use by ${diet._count.recipes} recipe(s), ${diet._count.userPreferences} user preference(s), and ${diet._count.submissions} submission(s). Remove those references first.`,
      },
      { status: 409 },
    );
  }

  await prisma.diet.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
