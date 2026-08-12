import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { updateLearnedPreferences } from "@/lib/recommend/learn";

// Only DISMISS/MUTE are treated as negative taste signals for learning
// purposes — IMPRESSION/OPEN are too weak (just seeing or opening a card
// isn't a rejection), and COSIGN/UNSTAR are handled by their own routes
// (UNSTAR currently has no dedicated negative-learning effect since
// unstarring is ambiguous — could mean "cooked it already", not "disliked
// it" — so it's deliberately left neutral here).
const NEGATIVE_SIGNAL_TYPES = new Set(["DISMISS", "MUTE"]);

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

  if (NEGATIVE_SIGNAL_TYPES.has(type)) {
    // Best-effort: never fails the interaction log itself (already
    // committed).
    try {
      await updateLearnedPreferences(session.user.id, recipeId, "negative");
    } catch (err) {
      console.error("Failed to update learned preferences after interaction", err);
    }
  }

  return NextResponse.json({ ok: true });
}
