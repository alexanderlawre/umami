import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { refreshDailySelection } from "@/lib/dashboard/select-daily";

const refreshSchema = z.object({
  // Free-tier feed intelligence v1: an explicit change to the dashboard's
  // Quick/Any/Project control. Optional — a plain "Refresh recipes" tap
  // sends no body and just re-picks under the user's existing preference.
  effortPreference: z.enum(["QUICK", "ANY", "PROJECT"]).optional(),
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
  const { effortPreference } = parsed.data;

  // Persist the new choice as the user's default across sessions (per
  // spec), before re-picking so the re-pick and the stored default never
  // disagree.
  if (effortPreference) {
    await prisma.userPreferences.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, effortPreference },
      update: { effortPreference },
    });
  }

  const result = await refreshDailySelection(session.user.id, effortPreference);

  return NextResponse.json({
    recipes: result.served,
    nextWindowAt: result.nextWindowAt.toISOString(),
    effortPreference: result.effortPreference,
  });
}
