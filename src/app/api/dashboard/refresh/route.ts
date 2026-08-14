import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { refreshDailySelection } from "@/lib/dashboard/select-daily";

const refreshSchema = z.object({
  // An explicit change to the dashboard's Meals/Tapas/Breakfast category
  // control. Optional — a plain "Refresh recipes" tap sends no body and
  // just re-picks under the user's existing category.
  category: z.enum(["MEALS", "TAPAS", "BREAKFAST"]).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Body is optional — the plain refresh button sends none.
  const rawBody = await request.text();
  const parsed = refreshSchema.safeParse(rawBody ? JSON.parse(rawBody) : {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { category } = parsed.data;

  // Persist the new choice as the user's default across sessions (per
  // spec), before re-picking so the re-pick and the stored default never
  // disagree.
  if (category) {
    await prisma.userPreferences.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, dashboardCategory: category },
      update: { dashboardCategory: category },
    });
  }

  const result = await refreshDailySelection(session.user.id, category);

  return NextResponse.json({
    recipes: result.served,
    pool: result.pool,
    nextWindowAt: result.nextWindowAt.toISOString(),
    category: result.category,
  });
}
