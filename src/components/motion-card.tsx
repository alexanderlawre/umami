"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

// Drop-in replacement for the flat CSS `transition hover:-translate-y-1
// hover:shadow-lg` pattern used on recipe cards throughout the app.
// Adds `layout` so cards animate smoothly into their new position when a
// grid re-shuffles (dashboard refresh, filter changes) instead of jumping.
export const MotionCard = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  function MotionCard({ children, whileHover, whileTap, transition, layout, ...props }, ref) {
    return (
      <motion.div
        ref={ref}
        layout={layout ?? true}
        whileHover={whileHover ?? { y: -6 }}
        whileTap={whileTap ?? { scale: 0.98 }}
        transition={transition ?? { type: "spring", stiffness: 300, damping: 26 }}
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);
