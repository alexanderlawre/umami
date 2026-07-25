"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { Allergen, Diet, FoodGroup } from "@prisma/client";
import { FOOD_GROUP_SCREENS } from "@/lib/food-group-screens";

type Props = {
  diets: Diet[];
  allergens: Allergen[];
  foodGroups: FoodGroup[];
};

const COOKING_FOR_OPTIONS = [
  { value: "SELF", label: "Just me" },
  { value: "PARTNER", label: "Me and a partner" },
  { value: "FAMILY", label: "My family" },
  { value: "MIXED", label: "It varies" },
  { value: "HOSTING", label: "Often hosting others" },
];

const COOK_FREQUENCY_OPTIONS = [
  { value: "DAILY", label: "Daily" },
  { value: "EVERY_OTHER_DAY", label: "Every other day" },
  { value: "FEW_TIMES_WEEK", label: "A few times a week" },
  { value: "MEAL_PREP", label: "I meal prep in batches" },
  { value: "WEEKENDS_ONLY", label: "Mostly weekends" },
];

const GOAL_OPTIONS = [
  { value: "EAT_MORE_VEG", label: "Eat more vegetables" },
  { value: "MORE_PROTEIN", label: "Get more protein" },
  { value: "LESS_TIME", label: "Spend less time cooking" },
  { value: "SPEND_LESS", label: "Spend less money" },
  { value: "LEARN_TECHNIQUE", label: "Learn technique" },
  { value: "EAT_WIDER", label: "Eat a wider variety" },
];

export function OnboardingWizard({ diets, allergens, foodGroups }: Props) {
  const router = useRouter();
  const { update } = useSession();

  const foodGroupByName = useMemo(() => {
    const map = new Map<string, FoodGroup>();
    for (const fg of foodGroups) map.set(fg.name, fg);
    return map;
  }, [foodGroups]);

  const [step, setStep] = useState(0);
  const [dietIds, setDietIds] = useState<string[]>([]);
  const [allergenIds, setAllergenIds] = useState<string[]>([]);
  const [customAllergens, setCustomAllergens] = useState<string[]>([]);
  const [customAllergenInput, setCustomAllergenInput] = useState("");
  const [meters, setMeters] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const fg of foodGroups) initial[fg.id] = 50;
    return initial;
  });
  const [favoriteInput, setFavoriteInput] = useState("");
  const [favoriteFoods, setFavoriteFoods] = useState<string[]>([]);
  const [cookingFor, setCookingFor] = useState<string | null>(null);
  const [cookFrequency, setCookFrequency] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Steps: 0 = diet, 1 = allergies, 2..6 = meter screens, 7 = favorites,
  // 8 = cooking for, 9 = cook frequency, 10 = goals
  const meterScreenCount = FOOD_GROUP_SCREENS.length;
  const totalSteps = 2 + meterScreenCount + 4;

  function toggle(list: string[], value: string, setList: (v: string[]) => void) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function addCustomAllergen() {
    const trimmed = customAllergenInput.trim();
    if (trimmed && !customAllergens.includes(trimmed)) {
      setCustomAllergens([...customAllergens, trimmed]);
    }
    setCustomAllergenInput("");
  }

  function addFavorite() {
    const trimmed = favoriteInput.trim();
    if (trimmed && favoriteFoods.length < 10 && !favoriteFoods.includes(trimmed)) {
      setFavoriteFoods([...favoriteFoods, trimmed]);
    }
    setFavoriteInput("");
  }

  async function finish() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dietIds,
          allergenIds,
          customAllergens,
          meters,
          favoriteFoods,
          cookingFor,
          cookFrequency,
          goals,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong saving your preferences.");
        setSubmitting(false);
        return;
      }
      await update({ onboarded: true });
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  function next() {
    if (step === totalSteps - 1) {
      finish();
    } else {
      setStep(step + 1);
    }
  }

  function back() {
    if (step > 0) setStep(step - 1);
  }

  const progress = ((step + 1) / totalSteps) * 100;

  return (
    <main className="flex flex-1 flex-col px-6 py-8">
      <div className="mx-auto w-full max-w-md flex-1 flex flex-col">
        <div className="h-1.5 w-full rounded-full bg-[#E8E6E0]">
          <div
            className="h-1.5 rounded-full bg-[#1F5F45] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-10 flex-1">
          {step === 0 && (
            <StepShell title="Any diets that apply to you?" subtitle="Pick as many as you like. No restrictions is fine too.">
              <ChipGrid
                options={diets.map((d) => ({ value: d.id, label: d.name }))}
                selected={dietIds}
                onToggle={(v) => toggle(dietIds, v, setDietIds)}
              />
            </StepShell>
          )}

          {step === 1 && (
            <StepShell
              title="Any allergies?"
              subtitle="This filters those ingredients out of everything we show you, permanently."
            >
              <ChipGrid
                options={allergens.map((a) => ({ value: a.id, label: a.name }))}
                selected={allergenIds}
                onToggle={(v) => toggle(allergenIds, v, setAllergenIds)}
              />
              <div className="mt-6">
                <label className="block text-sm font-medium text-[#1A1D1B]">
                  Other allergies
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={customAllergenInput}
                    onChange={(e) => setCustomAllergenInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomAllergen();
                      }
                    }}
                    placeholder="e.g. kiwi"
                    className="flex-1 rounded-xl border border-[#E8E6E0] bg-white px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#1F5F45]"
                  />
                  <button
                    type="button"
                    onClick={addCustomAllergen}
                    className="rounded-xl border border-[#E8E6E0] px-4 py-2.5 text-sm font-medium"
                  >
                    Add
                  </button>
                </div>
                {customAllergens.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {customAllergens.map((a) => (
                      <span
                        key={a}
                        className="flex items-center gap-1 rounded-full bg-[#EDF3EF] px-3 py-1 text-xs text-[#1A1D1B]"
                      >
                        {a}
                        <button
                          type="button"
                          onClick={() =>
                            setCustomAllergens(customAllergens.filter((c) => c !== a))
                          }
                          className="px-1 text-[#6B7370]"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </StepShell>
          )}

          {step >= 2 && step < 2 + meterScreenCount && (
            <MeterScreen
              screen={FOOD_GROUP_SCREENS[step - 2]}
              foodGroupByName={foodGroupByName}
              meters={meters}
              setMeters={setMeters}
            />
          )}

          {step === 2 + meterScreenCount && (
            <StepShell
              title="Any favorite foods or dishes?"
              subtitle="Optional. Up to 10 — helps us understand your taste from day one."
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={favoriteInput}
                  onChange={(e) => setFavoriteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFavorite();
                    }
                  }}
                  placeholder="e.g. birria tacos"
                  className="flex-1 rounded-xl border border-[#E8E6E0] bg-white px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#1F5F45]"
                />
                <button
                  type="button"
                  onClick={addFavorite}
                  className="rounded-xl border border-[#E8E6E0] px-4 py-2.5 text-sm font-medium"
                >
                  Add
                </button>
              </div>
              {favoriteFoods.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {favoriteFoods.map((f) => (
                    <span
                      key={f}
                      className="flex items-center gap-1 rounded-full bg-[#EDF3EF] px-3 py-1 text-xs text-[#1A1D1B]"
                    >
                      {f}
                      <button
                        type="button"
                        onClick={() => setFavoriteFoods(favoriteFoods.filter((v) => v !== f))}
                        className="px-1 text-[#6B7370]"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </StepShell>
          )}

          {step === 3 + meterScreenCount && (
            <StepShell title="Who are you usually cooking for?" subtitle="">
              <RadioList
                options={COOKING_FOR_OPTIONS}
                selected={cookingFor}
                onSelect={setCookingFor}
              />
            </StepShell>
          )}

          {step === 4 + meterScreenCount && (
            <StepShell title="How often do you cook?" subtitle="">
              <RadioList
                options={COOK_FREQUENCY_OPTIONS}
                selected={cookFrequency}
                onSelect={setCookFrequency}
              />
            </StepShell>
          )}

          {step === 5 + meterScreenCount && (
            <StepShell title="Anything you're working toward?" subtitle="Optional, pick as many as apply.">
              <ChipGrid
                options={GOAL_OPTIONS}
                selected={goals}
                onToggle={(v) => toggle(goals, v, setGoals)}
              />
            </StepShell>
          )}
        </div>

        {error && <p className="mb-4 text-sm text-[#B23A32]">{error}</p>}

        <div className="mt-8 flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={back}
              className="rounded-xl border border-[#E8E6E0] px-4 py-3 text-sm font-medium text-[#1A1D1B]"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={next}
            disabled={submitting}
            className="flex-1 rounded-xl bg-[#1F5F45] py-3 text-sm font-medium text-white transition hover:bg-[#2E7D5B] disabled:opacity-50"
          >
            {submitting ? "Saving..." : step === totalSteps - 1 ? "Finish" : "Continue"}
          </button>
        </div>
      </div>
    </main>
  );
}

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold tracking-tight text-[#1A1D1B]">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-[#6B7370]">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function ChipGrid({
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

function RadioList({
  options,
  selected,
  onSelect,
}: {
  options: { value: string; label: string }[];
  selected: string | null;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const active = selected === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
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

function MeterScreen({
  screen,
  foodGroupByName,
  meters,
  setMeters,
}: {
  screen: { title: string; groups: string[] };
  foodGroupByName: Map<string, FoodGroup>;
  meters: Record<string, number>;
  setMeters: (m: Record<string, number>) => void;
}) {
  return (
    <StepShell
      title={screen.title}
      subtitle="Rarely to constantly. Defaults are fine if you're not sure."
    >
      <div className="space-y-6">
        {screen.groups.map((name) => {
          const fg = foodGroupByName.get(name);
          if (!fg) return null;
          const value = meters[fg.id] ?? 50;
          return (
            <div key={fg.id}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[#1A1D1B]">{fg.name}</span>
                <span className="text-[#6B7370]">{value}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={value}
                onChange={(e) =>
                  setMeters({ ...meters, [fg.id]: Number(e.target.value) })
                }
                className="mt-2 w-full accent-[#1F5F45]"
              />
              <div className="flex justify-between text-xs text-[#6B7370]">
                <span>rarely</span>
                <span>constantly</span>
              </div>
            </div>
          );
        })}
      </div>
    </StepShell>
  );
}
