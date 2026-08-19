import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  birthday: z.string().trim().min(1).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(100).optional().nullable(),
  country: z.string().trim().min(1).max(100),
});

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      birthday: parsed.data.birthday ? new Date(parsed.data.birthday) : null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      country: parsed.data.country,
    },
    select: { id: true, name: true, birthday: true, city: true, state: true, country: true },
  });

  return NextResponse.json({ user });
}
