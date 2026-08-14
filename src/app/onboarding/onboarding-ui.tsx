"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PageTransition } from "@/components/page-transition";
import { MotionButton } from "@/components/motion-button";

// Small shared presentational primitives reused across the onboarding
// preferences and personalize pages, so both pages look and feel like one
// continuous flow even though they're separate routes.

export function OnboardingShell({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  footer,
}: {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const progress = (step / totalSteps) * 100;

  return (
    <main className="flex flex-1 flex-col px-6 py-8">
      <PageTransition className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="h-1.5 w-full rounded-full bg-[#E8E6E0]">
          <motion.div
            className="h-1.5 rounded-full bg-[#1B4332]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
          />
        </div>
        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[#6B7370]">
          Step {step} of {totalSteps}
        </p>

        <div className="mt-4 flex-1">
          <h2 className="text-xl font-bold tracking-tight text-[#1A1D1B]">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-[#6B7370]">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>

        {footer}
      </PageTransition>
    </main>
  );
}

export function ChipGrid({
  options,
  selected,
  onToggle,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <MotionButton
            key={opt.value}
            type="button"
            onClick={() => onToggle(opt.value)}
            whileTap={{ scale: 0.9 }}
            className={`rounded-full border px-4 py-2.5 text-sm transition ${
              active
                ? "border-[#1B4332] bg-[#EDF3EF] text-[#1B4332]"
                : "border-[#E8E6E0] bg-white text-[#1A1D1B]"
            }`}
          >
            {opt.label}
          </MotionButton>
        );
      })}
    </div>
  );
}

// Category-first picker: choose a category from a dropdown, then check off
// specific items within it via a ChipGrid. Selections persist across
// category switches (the "selected" list spans all categories), and each
// dropdown option shows a count so a user can see they've already picked
// something in a category they're not currently viewing.
export function CategoryItemPicker({
  groups,
  selected,
  onToggle,
}: {
  groups: { label: string; options: { value: string; label: string }[] }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [activeLabel, setActiveLabel] = useState(groups[0]?.label ?? "");
  const active = groups.find((g) => g.label === activeLabel) ?? groups[0];

  return (
    <div>
      <select
        value={active?.label ?? ""}
        onChange={(e) => setActiveLabel(e.target.value)}
        className="w-full rounded-xl border border-[#E8E6E0] bg-white px-3 py-2.5 text-base transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
      >
        {groups.map((g) => {
          const count = g.options.filter((o) => selected.includes(o.value)).length;
          return (
            <option key={g.label} value={g.label}>
              {g.label}
              {count > 0 ? ` (${count} selected)` : ""}
            </option>
          );
        })}
      </select>
      {active && (
        <div className="mt-3">
          <ChipGrid options={active.options} selected={selected} onToggle={onToggle} />
        </div>
      )}
    </div>
  );
}

export function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#1A1D1B]">{label}</span>
        <span className="text-[#6B7370]">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-[#1B4332]"
      />
    </div>
  );
}

// A collapsed-by-default row for one food-group category: a single slider
// for the whole category, plus an expand toggle that reveals per-item
// sliders (children) for anyone who wants to fine-tune beyond the category
// average.
export function CategoryAccordion({
  label,
  value,
  onChange,
  expanded,
  onToggleExpanded,
  children,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#E8E6E0] bg-white p-4 shadow-soft">
      <button
        type="button"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
        className="flex items-center gap-1.5 text-sm font-semibold text-[#1A1D1B]"
      >
        <motion.span
          className="inline-block text-xs"
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          &rsaquo;
        </motion.span>
        {label}
      </button>
      <div className="mt-3">
        <SliderRow label="Overall" value={value} onChange={onChange} />
        <div className="flex justify-between text-xs text-[#6B7370]">
          <span>rarely</span>
          <span>constantly</span>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4 border-t border-[#E8E6E0] pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TagInput({
  value,
  onAdd,
  onRemove,
  input,
  onInputChange,
  placeholder,
  cap,
}: {
  value: string[];
  onAdd: () => void;
  onRemove: (v: string) => void;
  input: string;
  onInputChange: (v: string) => void;
  placeholder: string;
  cap?: number;
}) {
  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
          disabled={cap !== undefined && value.length >= cap}
          className="flex-1 rounded-xl border border-[#E8E6E0] bg-white px-3 py-2.5 text-base transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-[#1B4332] disabled:opacity-50"
        />
        <MotionButton
          type="button"
          onClick={onAdd}
          disabled={cap !== undefined && value.length >= cap}
          className="rounded-xl border border-[#E8E6E0] px-4 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          Add
        </MotionButton>
      </div>
      {value.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {value.map((v) => (
            <span
              key={v}
              className="flex items-center gap-1 rounded-full bg-[#EDF3EF] px-3 py-1 text-xs text-[#1A1D1B]"
            >
              {v}
              <MotionButton
                type="button"
                onClick={() => onRemove(v)}
                whileTap={{ scale: 0.9 }}
                className="px-1 text-[#6B7370]"
              >
                ×
              </MotionButton>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
