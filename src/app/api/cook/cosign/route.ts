import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  cookLogId: z.string(),
  note: z.string().max(500).optional(),
  isPublic: z.boolean().default(true),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { cookLogId, note, isPublic } = parsed.data;

  const cookLog = await prisma.cookLog.findUnique({ where: { id: cookLogId } });
  if (!cookLog || cookLog.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const userId = session.user.id;
  const now = new Date();

  await prisma.$transaction([
    prisma.cookLog.update({
      where: { id: cookLogId },
      data: { cosignNote: note, isPublic },
    }),
    prisma.interaction.create({
      data: {
        userId,
        recipeId: cookLog.recipeId,
        type: "COSIGN",
        localHour: now.getHours(),
        localDayOfWeek: now.getDay(),
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
