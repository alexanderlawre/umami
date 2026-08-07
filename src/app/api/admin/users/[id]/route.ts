import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";

// Admin-only toggle for the premium flag — schema-only stub, no billing.
// See plan: premium unlocks the full macro breakdown on the recipe detail
// page; toggled manually here so the gate is testable without a payment
// integration. `isAdmin` is also accepted here (in addition to the
// dedicated /promote route) so the admin-users UI can revoke access with
// the same optimistic-update pattern used for isPremium — but changing it
// requires super-admin, unlike isPremium which any admin can toggle.
const schema = z.object({
  isPremium: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
});

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

  if (parsed.data.isAdmin !== undefined && !isSuperAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data: { isPremium?: boolean; isAdmin?: boolean } = {};
  if (parsed.data.isPremium !== undefined) data.isPremium = parsed.data.isPremium;
  if (parsed.data.isAdmin !== undefined) data.isAdmin = parsed.data.isAdmin;

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, isPremium: true, isAdmin: true },
  });

  return NextResponse.json({ user });
}
