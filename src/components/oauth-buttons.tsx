"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { MotionButton } from "@/components/motion-button";

// Shared "Continue with Google" / "Continue with Apple" buttons for the
// login and signup pages. Both use the same full-page-redirect OAuth flow
// (not signIn's redirect:false mode, since that's only for the Credentials
// provider) and land on /dashboard — the existing `authorized` callback in
// auth.config.ts already redirects any non-onboarded user (new or
// returning) to /onboarding/preferences from there, so no extra redirect
// logic is needed for the new-account case.
export function OAuthButtons() {
  const [pending, setPending] = useState<"google" | "apple" | null>(null);

  async function handleClick(provider: "google" | "apple") {
    setPending(provider);
    try {
      await signIn(provider, { callbackUrl: "/dashboard" });
    } catch {
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      <MotionButton
        type="button"
        disabled={pending !== null}
        onClick={() => handleClick("google")}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E8E6E0] bg-white py-3 text-sm font-medium text-[#1A1D1B] transition-colors hover:bg-[#EDF3EF] disabled:opacity-50"
      >
        <GoogleIcon />
        {pending === "google" ? "Redirecting..." : "Continue with Google"}
      </MotionButton>
      <MotionButton
        type="button"
        disabled={pending !== null}
        onClick={() => handleClick("apple")}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3 text-sm font-medium text-white transition-colors hover:bg-[#1A1D1B] disabled:opacity-50"
      >
        <AppleIcon />
        {pending === "apple" ? "Redirecting..." : "Continue with Apple"}
      </MotionButton>

      <div className="flex items-center gap-3 pt-1">
        <div className="h-px flex-1 bg-[#E8E6E0]" />
        <span className="text-xs text-[#6B7370]">or</span>
        <div className="h-px flex-1 bg-[#E8E6E0]" />
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 384 512" aria-hidden="true" fill="currentColor">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}
