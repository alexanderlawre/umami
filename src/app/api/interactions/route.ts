import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const schema = z.object({
  recipeId: z.string(),
  type: z.enum([
    "IMPRESSION",
    "OPEN",
    "DISMISS",
    "MUTE",
    "COOK",
    "STAR",
    "UNSTAR",
    "COSIGN",
  ]),
  localHour: z.number().int().min(0).max(23),
  localDayOfWeek: z.number().int().min(0).max(6),
  metadata: z.record(z.string(), z.unknown()).optional(),
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

  const { recipeId, type, localHour, localDayOfWeek, metadata } = parsed.data;

  await prisma.interaction.create({
    data: {
      userId: session.user.id,
      recipeId,
      type,
      localHour,
      localDayOfWeek,
      metadata: (metadata as Prisma.InputJsonValue) ?? undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
