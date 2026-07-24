import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  recipeId: z.string(),
  servings: z.number().int().positive(),
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

  const { recipeId, servings } = parsed.data;
  const userId = session.user.id;
  const now = new Date();

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
