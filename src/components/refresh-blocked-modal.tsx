"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SheetModal } from "@/components/sheet-modal";

// Coarse (minute-granularity) countdown, matching the "no live-second
// ticking needed" style planned for A4's cook-later countdowns — this can
// be up to ~18h away (a Dinner window), so a ticking-every-second display
// would be both wasteful and visually noisy for a number that large.
function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return "any moment now";
  const totalMinutes = Math.ceil(msRemaining / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

// A1's free-plan blocker: shown when POST /api/dashboard/refresh returns
// 429 REFRESH_LIMIT_REACHED (plain "Refresh recipes" tap only — the
// Meals/Tapas/Breakfast category control is never gated, see the route's
// own comment). Every upsell CTA in this app routes to /premium (C1) —
// that screen doesn't exist until Piece 5 ships, so this link 404s until
// then; expected/documented, not a bug in this piece.
export function RefreshBlockedModal({
  open,
  onClose,
  nextWindowAt,
}: {
  open: boolean;
  onClose: () => void;
  nextWindowAt: string | null;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [open]);

  const remaining = nextWindowAt ? new Date(nextWindowAt).getTime() - now : null;

  return (
    <SheetModal open={open} onClose={onClose}>
      <p className="text-lg font-semibold text-[#1A1D1B]">That&apos;s your refresh for now</p>
      <p className="mt-2 text-sm text-[#6B7370]">
        Fresh picks land automatically at the next window — or go unlimited with Umami+.
      </p>
      {remaining !== null && (
        <p className="mt-3 text-xs font-medium text-[#6B7370]">
          Next window in {formatCountdown(remaining)}
        </p>
      )}
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-lg border border-[#E8E6E0] px-4 py-2.5 text-sm font-medium text-[#1A1D1B] transition hover:bg-[#EDF3EF]"
        >
          Got it
        </button>
        <Link
          href="/premium"
          onClick={onClose}
          className="flex-1 rounded-lg bg-[#1B4332] px-4 py-2.5 text-center text-sm font-medium text-white transition hover:opacity-90"
        >
          Go Umami+
        </Link>
      </div>
    </SheetModal>
  );
}
