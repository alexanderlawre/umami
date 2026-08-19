import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const signupSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    password: z.string().min(10, "Password must be at least 10 characters"),
    confirmPassword: z.string(),
    birthday: z.coerce.date().optional().nullable(),
    city: z.string().trim().min(1, "City is required"),
    state: z.string().trim().nullable().optional(),
    country: z.string().trim().min(1, "Country is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { name, email, password, birthday, city, state, country } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      birthday: birthday ?? undefined,
      city,
      state: state || null,
      country,
    },
  });

  return NextResponse.json({ ok: true });
}
