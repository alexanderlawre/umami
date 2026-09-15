"use client";

import { AnimatePresence, motion } from "framer-motion";

// Generic modal primitive: bottom sheet on mobile, centered card on
// desktop — matching the layout the app's ad-hoc modals (Cosign, recipe
// editor, submission review) already use, but with an animated
// backdrop-fade + sheet-rise/scale-in transition instead of an instant
// mount/unmount. Wrap AnimatePresence around the call site so `open`
// toggling animates out before unmounting.
export function SheetModal({
  open,
  onClose,
  children,
  panelClassName = "",
}: {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  panelClassName?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className={`w-full max-w-sm rounded-t-2xl bg-white px-5 pt-5 pb-safe-5 shadow-lifted sm:rounded-2xl ${panelClassName}`}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
