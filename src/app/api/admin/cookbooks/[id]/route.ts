import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(1),
});

export async function PATCH(
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

  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const cookbook = await prisma.cookbook.update({
    where: { id },
    data: { name: parsed.data.name },
  });
  return NextResponse.json({ cookbook });
}

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

  const { id } = await params;

  const cookbook = await prisma.cookbook.findUnique({ where: { id } });
  if (!cookbook) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Cascades: CookbookRecipe rows for this cookbook are removed automatically
  // via ON DELETE CASCADE (see prisma/schema.prisma).
  await prisma.cookbook.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
