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

  const allergen = await prisma.allergen.findUnique({ where: { id } });
  if (!allergen) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Deleting cascades: the implicit Allergen<->Recipe and
  // Allergen<->UserPreferences join tables have ON DELETE CASCADE (Prisma's
  // default for implicit many-to-many relations), so this automatically
  // detaches the allergen from every recipe and user preference that
  // referenced it. The client shows a confirmation before calling this
  // endpoint when the allergen is in use.
  await prisma.allergen.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
