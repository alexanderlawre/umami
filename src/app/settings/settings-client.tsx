"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { PageTransition } from "@/components/page-transition";
import { MotionButton } from "@/components/motion-button";

export function SettingsClient({
  name,
  email,
  timezone,
}: {
  name: string;
  email: string;
  timezone: string | null;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <PageTransition>
        <h1 className="text-xl font-bold tracking-tight text-[#1A1D1B]">Settings</h1>
        <p className="mt-1 text-sm text-[#6B7370]">Your account details.</p>

        <div className="mt-8 rounded-2xl border border-[#E8E6E0] bg-white p-5 shadow-soft">
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-[#6B7370]">Name</dt>
              <dd className="mt-1 text-[#1A1D1B]">{name || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-[#6B7370]">Email</dt>
              <dd className="mt-1 text-[#1A1D1B]">{email}</dd>
            </div>
            {timezone && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-[#6B7370]">Timezone</dt>
                <dd className="mt-1 text-[#1A1D1B]">{timezone}</dd>
              </div>
            )}
          </dl>
          <p className="mt-4 text-xs text-[#6B7370]">
            Want to change your name? Head to your{" "}
            <Link href="/profile" className="text-[#2C5A87] underline">
              profile
            </Link>
            .
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-[#E8E6E0] bg-white p-5 shadow-soft">
          <p className="text-sm font-medium text-[#1A1D1B]">Password</p>
          <p className="mt-1 text-xs text-[#6B7370]">
            Need to change it?{" "}
            <Link href="/forgot-password" className="text-[#2C5A87] underline">
              Reset your password
            </Link>
            .
          </p>
        </div>

        <div className="mt-8 border-t border-[#E8E6E0] pt-6">
          <MotionButton
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            whileHover={{ y: -2 }}
            className="rounded-xl border border-[#E8E6E0] px-4 py-2.5 text-sm font-medium text-[#B23A32] transition-colors hover:bg-[#EDF3EF]"
          >
            Sign out
          </MotionButton>
        </div>
      </PageTransition>
    </main>
  );
}
