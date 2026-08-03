import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const CATEGORIES = ["PRODUCE", "PROTEIN", "GRAIN", "DAIRY", "FLAVOR", "OTHER"] as const;

const schema = z.object({
  name: z.string().trim().min(1),
  category: z.enum(CATEGORIES),
  description: z.string().trim().min(1),
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

  const { name, category, description } = parsed.data;

  const existing = await prisma.foodGroup.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ foodGroup: existing });
  }

  const foodGroup = await prisma.foodGroup.create({ data: { name, category, description } });
  return NextResponse.json({ foodGroup });
}
