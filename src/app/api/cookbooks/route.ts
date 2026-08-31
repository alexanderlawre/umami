import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookbooks = await prisma.userCookbook.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { recipes: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ cookbooks });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const cookbook = await prisma.userCookbook.create({
      data: { userId: session.user.id, name: parsed.data.name },
    });
    return NextResponse.json({ cookbook });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "You already have a cookbook named that." },
        { status: 400 },
      );
    }
    throw err;
  }
}
