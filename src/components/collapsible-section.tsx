"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Generalized from src/components/admin/extra-insights.tsx's animated
// height-reveal pattern — a reusable collapsed-by-default section shell.
export function CollapsibleSection({
  title,
  defaultExpanded = false,
  children,
}: {
  title: string;
  defaultExpanded?: boolean;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-2xl border border-[#E8E6E0] bg-white">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold text-[#1A1D1B]"
      >
        <span>{title}</span>
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
            <div className="border-t border-[#E8E6E0] p-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
