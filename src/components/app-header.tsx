"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export function AppHeader() {
  return (
    <header className="flex items-center justify-between border-b border-[#E8E6E0] px-6 py-4">
      <Link href="/dashboard" className="text-lg font-bold text-[#1A1D1B]">
        Umami
      </Link>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="text-sm text-[#6B7370] underline"
      >
        Sign out
      </button>
    </header>
  );
}
