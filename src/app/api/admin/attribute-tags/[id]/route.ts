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

  const attributeTag = await prisma.attributeTag.findUnique({ where: { id } });
  if (!attributeTag) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Deleting cascades: the implicit AttributeTag<->Recipe join table has ON
  // DELETE CASCADE (Prisma's default for implicit many-to-many relations),
  // so this automatically detaches the tag from every recipe that had it.
  // The client shows a confirmation before calling this endpoint when the
  // tag is in use.
  await prisma.attributeTag.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
