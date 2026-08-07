"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { getInitials } from "@/lib/avatar";

type MenuLink = { href: string; label: string };

const BASE_LINKS: MenuLink[] = [
  { href: "/profile", label: "Profile" },
  { href: "/cook-later", label: "Cook later" },
  { href: "/settings/preferences", label: "Preferences" },
  { href: "/settings/personalization", label: "Personalization" },
  { href: "/settings", label: "Settings" },
];

export function ProfileMenu({
  name,
  isAdmin,
}: {
  name?: string | null;
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const links = isAdmin ? [...BASE_LINKS, { href: "/admin", label: "Admin" }] : BASE_LINKS;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Profile menu"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1F5F45] text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        {getInitials(name)}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-20 w-48 overflow-hidden rounded-2xl border border-[#E8E6E0] bg-white py-1.5 shadow-lg">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-[#1A1D1B] transition hover:bg-[#EDF3EF]"
            >
              {link.label}
            </Link>
          ))}
          <div className="my-1.5 border-t border-[#E8E6E0]" />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="block w-full px-4 py-2 text-left text-sm text-[#1A1D1B] transition hover:bg-[#EDF3EF]"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
