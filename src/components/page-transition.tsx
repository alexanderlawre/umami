"use client";

import { motion } from "framer-motion";

// Consistent fade + slight-rise mount-in animation, used at the top of a
// page's client component so navigating between screens feels intentional
// rather than an instant hard-cut swap.
export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
