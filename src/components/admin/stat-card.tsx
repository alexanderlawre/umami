"use client";

import Link from "next/link";
import { MotionCard } from "@/components/motion-card";

// Client leaf used inside the (server-component) admin overview page. Same
// card shell as everywhere else in the app, just a smaller hover lift
// (no `layout` — these never reflow) so the whole admin grid gets the same
// tactile hover feedback dashboard/recipe-detail already have.
export function StatCard({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: number | string;
  sub?: string;
  href?: string;
}) {
  const content = (
    <>
      <p className="text-2xl font-bold text-[#1A1D1B]">{value}</p>
      <p className="mt-1 text-xs text-[#6B7370]">{label}</p>
      {sub && <p className="mt-2 text-[11px] text-[#6B7370]/70">{sub}</p>}
    </>
  );
  if (href) {
    return (
      <MotionCard
        layout={false}
        whileHover={{ y: -2 }}
        className="rounded-2xl border border-[#E8E6E0] bg-white p-4 transition hover:border-[#1B4332] hover:shadow-sm"
      >
        <Link href={href} className="block">
          {content}
        </Link>
      </MotionCard>
    );
  }
  return (
    <MotionCard
      layout={false}
      whileHover={{ y: -2 }}
      className="rounded-2xl border border-[#E8E6E0] bg-white p-4"
    >
      {content}
    </MotionCard>
  );
}
