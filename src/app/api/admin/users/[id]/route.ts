import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Admin-only toggle for the premium flag — schema-only stub, no billing.
// See plan: premium unlocks the full macro breakdown on the recipe detail
// page; toggled manually here so the gate is testable without a payment
// integration.
const schema = z.object({ isPremium: z.boolean() });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { isPremium: parsed.data.isPremium },
    select: { id: true, isPremium: true },
  });

  return NextResponse.json({ user });
}
