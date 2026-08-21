"use client";

import { useState } from "react";
import Link from "next/link";
import { PageTransition } from "@/components/page-transition";
import { MotionButton } from "@/components/motion-button";
import { LoadingOrb } from "@/components/loading-orb";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/account/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Something went wrong");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <PageTransition className="w-full max-w-sm">
        <div className="rounded-2xl border border-[#E8E6E0] bg-white p-8 shadow-soft">
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1D1B]">
            Reset your password
          </h1>
          <p className="mt-1 text-sm text-[#6B7370]">
            Enter your email and we&apos;ll send you a link to reset it.
          </p>

          {submitted ? (
            <p className="mt-8 rounded-xl border border-[#E8E6E0] bg-white px-4 py-3 text-sm text-[#1A1D1B]">
              If that email has an account, we&apos;ve sent a password reset link. Check your inbox.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1D1B]">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E8E6E0] bg-white px-3 py-2.5 text-base transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                />
              </div>

              {error && <p className="text-sm text-[#B23A32]">{error}</p>}

              <MotionButton
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#1B4332] py-3 text-sm font-medium text-white shadow-glow transition-colors hover:bg-[#2D6A4F] disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <LoadingOrb size={20} theme="dark" /> Sending...
                  </span>
                ) : (
                  "Send reset link"
                )}
              </MotionButton>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-[#6B7370]">
          <Link href="/login" className="text-[#2C5A87] underline">
            Back to login
          </Link>
        </p>
      </PageTransition>
    </main>
  );
}
