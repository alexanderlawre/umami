import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { refreshDailySelection, resolveActiveWindow } from "@/lib/dashboard/select-daily";
import { getEntitlements } from "@/lib/entitlements";

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

  // A1 — free-plan manual refresh cap: one per section per meal-slot
  // window. Deliberately scoped to the *plain* "Refresh recipes" tap only
  // (no `category` in the body) — switching the Meals/Tapas/Breakfast
  // control is browsing to a different section, not "refreshing" the one
  // already on screen, and must never be blocked. Checked (and, if
  // consumed, recorded) *before* refreshDailySelection runs, so a blocked
  // request never mutates ServedCard or double-writes RefreshUsage.
  if (category === undefined) {
    const entitlements = getEntitlements(session.user.isPremium);
    if (Number.isFinite(entitlements.manualRefreshesPerWindowPerSection)) {
      const active = await resolveActiveWindow(session.user.id);
      try {
        await prisma.refreshUsage.create({
          data: { userId: session.user.id, section: active.category, windowKey: active.windowKey, count: 1 },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          return NextResponse.json(
            {
              error: "REFRESH_LIMIT_REACHED",
              message:
                "That's your refresh for now. Fresh picks land automatically at the next window — or go unlimited with Umami+.",
              nextWindowAt: active.nextWindowAt.toISOString(),
            },
            { status: 429 },
          );
        }
        throw err;
      }
    }
  }

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
