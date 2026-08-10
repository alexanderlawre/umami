"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { getInitials } from "@/lib/avatar";
import { MotionButton } from "@/components/motion-button";

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
  image,
  isAdmin,
}: {
  name?: string | null;
  image?: string | null;
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
      <MotionButton
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Profile menu"
        whileHover={{ y: -2, scale: 1.04 }}
        whileTap={{ scale: 0.92 }}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#1F5F45] text-sm font-semibold text-white shadow-sm"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          getInitials(name)
        )}
      </MotionButton>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-11 z-20 w-48 origin-top-right overflow-hidden rounded-2xl border border-[#E8E6E0] bg-white py-1.5 shadow-lifted"
            initial={{ opacity: 0, scale: 0.92, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -6 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
