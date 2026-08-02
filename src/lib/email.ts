import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Resend's shared test sender — works out of the box without a verified
// domain, but can only deliver to the email the Resend account was created
// with. Swap EMAIL_FROM once a verified sending domain is set up.
const DEFAULT_FROM = "Umami <onboarding@resend.dev>";

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY not set — skipping send. Reset link for ${to}: ${resetUrl}`,
    );
    return;
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM || DEFAULT_FROM,
    to,
    subject: "Reset your Umami password",
    html: `
      <p>Someone requested a password reset for your Umami account.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a>. This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}
