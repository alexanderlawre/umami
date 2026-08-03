"use client";

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
      <div className="mx-auto w-full max-w-md flex-1 flex flex-col">
        <div className="h-1.5 w-full rounded-full bg-[#E8E6E0]">
          <div
            className="h-1.5 rounded-full bg-[#1F5F45] transition-all"
            style={{ width: `${progress}%` }}
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
      </div>
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
          <button
            key={opt.value}
            type="button"
            onClick={() => onToggle(opt.value)}
            className={`rounded-full border px-4 py-2.5 text-sm transition ${
              active
                ? "border-[#1F5F45] bg-[#EDF3EF] text-[#1F5F45]"
                : "border-[#E8E6E0] bg-white text-[#1A1D1B]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
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
          className="flex-1 rounded-xl border border-[#E8E6E0] bg-white px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#1F5F45] disabled:opacity-50"
        />
        <button
          type="button"
          onClick={onAdd}
          disabled={cap !== undefined && value.length >= cap}
          className="rounded-xl border border-[#E8E6E0] px-4 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {value.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {value.map((v) => (
            <span
              key={v}
              className="flex items-center gap-1 rounded-full bg-[#EDF3EF] px-3 py-1 text-xs text-[#1A1D1B]"
            >
              {v}
              <button
                type="button"
                onClick={() => onRemove(v)}
                className="px-1 text-[#6B7370]"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
