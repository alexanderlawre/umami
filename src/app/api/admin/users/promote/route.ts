import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";

const schema = z.object({
  email: z.string().trim().email(),
  isAdmin: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Granting/revoking admin access is restricted to a hardcoded super-admin
  // allowlist, not every admin — see src/lib/super-admin.ts.
  if (!isSuperAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, isAdmin } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "No user with that email" }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { email },
    data: { isAdmin },
    select: { id: true, email: true, name: true, isAdmin: true },
  });

  return NextResponse.json({ user: updated });
}
