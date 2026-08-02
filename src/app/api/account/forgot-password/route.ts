import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }

  const { email } = parsed.data;

  // Always respond the same way whether or not the account exists, to avoid
  // leaking which emails are registered.
  const genericResponse = NextResponse.json({
    ok: true,
    message: "If that email has an account, we've sent a password reset link.",
  });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return genericResponse;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

  await sendPasswordResetEmail(user.email, resetUrl);

  return genericResponse;
}
