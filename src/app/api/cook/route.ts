import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  recipeId: z.string(),
  servings: z.number().int().positive(),
});

// Temporarily disabled (was 6) so cooks can be logged back-to-back; revisit
// reintroducing a cooldown later. Left as a real constant rather than
// ripping out the surrounding mechanism so it's a one-line revert.
const COOK_LOG_COOLDOWN_HOURS = 0;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { recipeId, servings } = parsed.data;
  const userId = session.user.id;
  const now = new Date();

  // Global per-user cooldown (not per-recipe): caps how often "I cooked
  // this" can be logged at all, regardless of which recipe.
  const lastLog = await prisma.cookLog.findFirst({
    where: { userId },
    orderBy: { cookedAt: "desc" },
  });
  if (lastLog) {
    const nextAvailableAt = new Date(
      lastLog.cookedAt.getTime() + COOK_LOG_COOLDOWN_HOURS * 60 * 60 * 1000,
    );
    if (nextAvailableAt.getTime() > now.getTime()) {
      return NextResponse.json(
        {
          error: "You can log another cook in a little while.",
          nextAvailableAt: nextAvailableAt.toISOString(),
        },
        { status: 429 },
      );
    }
  }

  const cookLog = await prisma.$transaction(async (tx) => {
    const log = await tx.cookLog.create({
      data: { userId, recipeId, servings },
    });

    await tx.interaction.create({
      data: {
        userId,
        recipeId,
        type: "COOK",
        localHour: now.getHours(),
        localDayOfWeek: now.getDay(),
      },
    });

    return log;
  });

  return NextResponse.json({ cookLogId: cookLog.id });
}
