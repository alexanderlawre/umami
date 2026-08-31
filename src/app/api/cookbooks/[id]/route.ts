import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const cookbook = await prisma.userCookbook.findUnique({ where: { id } });
  if (!cookbook || cookbook.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const updated = await prisma.userCookbook.update({
      where: { id },
      data: { name: parsed.data.name },
    });
    return NextResponse.json({ cookbook: updated });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "You already have a cookbook named that." },
        { status: 400 },
      );
    }
    throw err;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const cookbook = await prisma.userCookbook.findUnique({ where: { id } });
  if (!cookbook || cookbook.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.userCookbook.delete({ where: { id } });

  if (cookbook.coverImageUrl && cookbook.coverImageUrl.includes("blob.vercel-storage.com")) {
    try {
      await del(cookbook.coverImageUrl);
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ ok: true });
}
