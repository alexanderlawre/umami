"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/page-transition";
import { MotionButton } from "@/components/motion-button";
import { OAuthButtons } from "@/components/oauth-buttons";
import { LoadingOrb } from "@/components/loading-orb";
import { hideKeyboard } from "@/lib/native";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Wrong email or password.");
      setLoading(false);
      return;
    }

    hideKeyboard();
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <PageTransition className="w-full max-w-sm">
        <div className="rounded-2xl border border-[#E8E6E0] bg-white p-8 shadow-soft">
          <h1 className="font-display text-center text-2xl font-bold tracking-tight text-[#1A1D1B]">
            umami
          </h1>
          <p className="mt-1 text-center text-sm text-[#6B7370]">Welcome back.</p>

          <div className="mt-8">
            <OAuthButtons />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-[#1A1D1B]">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-[#2C5A87] underline">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#E8E6E0] bg-white px-3 py-2.5 text-base transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
              />
            </div>

            {error && (
              <motion.p
                initial={{ x: 0 }}
                animate={{ x: [0, -6, 6, -4, 4, 0] }}
                transition={{ duration: 0.4 }}
                className="text-sm text-[#B23A32]"
              >
                {error}
              </motion.p>
            )}

            <MotionButton
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#1B4332] py-3 text-sm font-medium text-white shadow-glow disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <LoadingOrb size={20} theme="dark" /> Logging in...
                </span>
              ) : (
                "Log in"
              )}
            </MotionButton>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-[#6B7370]">
          New here?{" "}
          <Link href="/signup" className="text-[#2C5A87] underline">
            Create an account
          </Link>
        </p>
      </PageTransition>
    </main>
  );
}
