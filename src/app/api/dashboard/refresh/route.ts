import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { refreshDailySelection } from "@/lib/dashboard/select-daily";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await refreshDailySelection(session.user.id);

  return NextResponse.json({
    recipes: result.served,
    nextWindowAt: result.nextWindowAt.toISOString(),
  });
}
