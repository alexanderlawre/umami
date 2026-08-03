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

  const allergen = await prisma.allergen.findUnique({
    where: { id },
    include: {
      _count: { select: { recipes: true, userPreferences: true, submissions: true } },
    },
  });
  if (!allergen) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const inUse = allergen._count.recipes + allergen._count.userPreferences + allergen._count.submissions;
  if (inUse > 0) {
    return NextResponse.json(
      {
        error: `"${allergen.name}" is still in use by ${allergen._count.recipes} recipe(s), ${allergen._count.userPreferences} user preference(s), and ${allergen._count.submissions} submission(s). Remove those references first.`,
      },
      { status: 409 },
    );
  }

  await prisma.allergen.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
