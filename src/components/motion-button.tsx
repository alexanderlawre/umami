"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

// Drop-in replacement for a plain <button>: keep whatever variant styling
// callers already pass via `className` (colors, padding, radius all stay
// defined at the call site, matching the existing convention across the
// app), and layer on consistent, springy press/hover feedback so every
// primary interactive control in the app moves the same way.
export const MotionButton = forwardRef<HTMLButtonElement, HTMLMotionProps<"button">>(
  function MotionButton({ children, whileTap, whileHover, transition, ...props }, ref) {
    return (
      <motion.button
        ref={ref}
        whileTap={whileTap ?? { scale: 0.96 }}
        whileHover={whileHover ?? { y: -2 }}
        transition={transition ?? { type: "spring", stiffness: 500, damping: 30 }}
        {...props}
      >
        {children}
      </motion.button>
    );
  },
);
