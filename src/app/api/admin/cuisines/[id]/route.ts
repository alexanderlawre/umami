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

  const cuisine = await prisma.cuisine.findUnique({
    where: { id },
    include: {
      _count: { select: { recipes: true, submissions: true } },
    },
  });
  if (!cuisine) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const inUse = cuisine._count.recipes + cuisine._count.submissions;
  if (inUse > 0) {
    return NextResponse.json(
      {
        error: `"${cuisine.name}" is still used by ${cuisine._count.recipes} recipe(s) and ${cuisine._count.submissions} submission(s). Re-assign those first.`,
      },
      { status: 409 },
    );
  }

  await prisma.cuisine.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
