"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { StatCard } from "@/components/admin/stat-card";

// Replaces a native <details> with an animated height reveal, same
// expand/collapse pattern as onboarding's CategoryAccordion. Stays a small
// client leaf — the admin page itself does the data fetching and just
// passes the pre-computed values in as props.
export function ExtraInsights({
  cookLogCount,
  cookLogs7d,
  peakHourLabel,
}: {
  cookLogCount: number;
  cookLogs7d: number;
  peakHourLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-6 rounded-2xl border border-[#E8E6E0] bg-white">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-center justify-between px-5 py-3 text-sm font-semibold text-[#1A1D1B]"
      >
        <span>Extra insights</span>
        <span className="text-xs font-normal text-[#6B7370]">{expanded ? "Hide" : "Show"}</span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-3 border-t border-[#E8E6E0] p-5 sm:grid-cols-3">
              <StatCard label="Cook logs" value={cookLogCount} sub={`+${cookLogs7d} this week`} />
              <StatCard label="Peak cooking hour" value={peakHourLabel} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
