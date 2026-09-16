"use client";

import { SheetModal } from "@/components/sheet-modal";

// The "Use -> Signal -> Recommendations sharpen" learning-loop explainer —
// shared by the profile menu ("How Umami works") and the Settings ->
// Personalization page ("See how it works" link), so there's exactly one
// place this copy/design lives.
const STEPS = [
  {
    title: "You use Umami",
    caption: "Cook, save, skip, rate — every action is a signal.",
  },
  {
    title: "We catch the signal",
    caption: "Your taste profile quietly updates in the background.",
  },
  {
    title: "Recommendations sharpen",
    caption: "Tomorrow's picks fit you a little better than today's.",
  },
];

export function HowItWorksModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <SheetModal open={open} onClose={onClose}>
      <p className="text-lg font-semibold text-[#101010]">How Umami learns you</p>
      <p className="mt-2 text-sm text-[#6B7370]">
        There&apos;s no long survey to get right. The more you use Umami, the better it gets.
      </p>

      <div className="mt-5 space-y-5">
        {STEPS.map((step, i) => (
          <div key={step.title} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1B4332] text-xs font-semibold text-white">
                {i + 1}
              </div>
              {i < STEPS.length - 1 && <div className="mt-1 w-px flex-1 bg-[#E8E6E0]" />}
            </div>
            <div className="pb-1">
              <p className="text-sm font-semibold text-[#101010]">{step.title}</p>
              <p className="mt-0.5 text-xs text-[#6B7370]">{step.caption}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs italic text-[#6B7370]">
        …and the cycle repeats every time you open Umami.
      </p>

      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full rounded-lg border border-[#E8E6E0] px-4 py-2.5 text-sm font-medium text-[#101010] shadow-brand transition hover:bg-[#EDF3EF]"
      >
        Got it
      </button>
    </SheetModal>
  );
}
