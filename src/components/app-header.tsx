"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export function AppHeader({ isAdmin }: { isAdmin?: boolean }) {
  return (
    <header className="flex items-center justify-between border-b border-[#E8E6E0] px-6 py-4">
      <Link
        href="/dashboard"
        className="-my-2 -ml-1 rounded-lg px-1 py-2 text-lg font-bold text-[#1A1D1B]"
      >
        Umami
      </Link>
      <div className="flex items-center gap-2">
        {isAdmin && (
          <Link
            href="/admin"
            className="-my-2 rounded-lg px-2 py-2 text-sm text-[#6B7370] underline"
          >
            Admin
          </Link>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="-my-2 -mr-1 rounded-lg px-2 py-2 text-sm text-[#6B7370] underline"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
