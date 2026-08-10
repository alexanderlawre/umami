import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { codify } from "@/lib/codify";

const schema = z.object({
  name: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name } = parsed.data;
  const code = codify(name);

  const existing = await prisma.attributeTag.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ attributeTag: existing });
  }

  const attributeTag = await prisma.attributeTag.create({ data: { name, code } });
  return NextResponse.json({ attributeTag });
}
