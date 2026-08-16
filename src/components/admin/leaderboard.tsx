"use client";

import { motion } from "framer-motion";

// Client leaf used inside the (server-component) admin overview page.
// Rows fade+slide in with a short per-row stagger on mount, rather than
// appearing all at once.
export function Leaderboard({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: { label: string; count: number }[];
  emptyLabel: string;
}) {
  return (
    <section className="rounded-2xl border border-[#E8E6E0] bg-white p-5">
      <h2 className="text-sm font-semibold text-[#1A1D1B]">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-[#6B7370]">{emptyLabel}</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {rows.map((row, i) => (
            <motion.li
              key={row.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-xs font-medium text-[#6B7370]">{i + 1}.</span>
                <span className="truncate text-[#1A1D1B]">{row.label}</span>
              </span>
              <span className="shrink-0 text-xs text-[#6B7370]">{row.count}</span>
            </motion.li>
          ))}
        </ol>
      )}
    </section>
  );
}
