"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

// One shared "nothing here" treatment so different areas of the app don't
// each hand-roll their own bare text. Matches the existing card/border
// conventions (rounded-2xl, #E8E6E0) but uses a dashed border to read as
// an empty placeholder rather than a populated card.
export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-dashed border-[#E8E6E0] bg-[#FBFAF7] px-6 py-10 text-center"
    >
      <p className="text-sm text-[#6B7370]">{title}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </motion.div>
  );
}
