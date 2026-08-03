import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ timezone: z.string().trim().min(1).max(100) });

function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

// Fire-and-forget endpoint the client calls once it detects the browser's
// real IANA timezone (see src/components/timezone-sync.tsx). Only writes
// when the value actually changed, so this is cheap to call on every page
// load.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { timezone } = parsed.data;
  if (!isValidTimezone(timezone)) {
    return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { timezone: true },
  });

  if (user?.timezone !== timezone) {
    await prisma.user.update({ where: { id: session.user.id }, data: { timezone } });
  }

  return NextResponse.json({ ok: true });
}
