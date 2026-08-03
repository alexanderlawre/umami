"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Allergen, Diet } from "@prisma/client";
import { OnboardingShell, ChipGrid, TagInput } from "../onboarding-ui";
import { ONBOARDING_PREFS_KEY } from "../shared";

const TOTAL_STEPS = 3;

export function PreferencesClient({
  diets,
  allergens,
}: {
  diets: Diet[];
  allergens: Allergen[];
}) {
  const router = useRouter();
  const [allergenIds, setAllergenIds] = useState<string[]>([]);
  const [customAllergenInput, setCustomAllergenInput] = useState("");
  const [customAllergens, setCustomAllergens] = useState<string[]>([]);
  const [dietIds, setDietIds] = useState<string[]>([]);

  function toggleAllergen(id: string) {
    setAllergenIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  function toggleDiet(id: string) {
    setDietIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  function addCustomAllergen() {
    // Support comma-separated entry in one go, per the onboarding copy:
    // "they can type multiple separating by a comma".
    const parts = customAllergenInput
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      setCustomAllergens((prev) => [...new Set([...prev, ...parts])]);
    }
    setCustomAllergenInput("");
  }

  function handleContinue() {
    const payload = { dietIds, allergenIds, customAllergens };
    sessionStorage.setItem(ONBOARDING_PREFS_KEY, JSON.stringify(payload));
    router.push("/onboarding/personalize");
  }

  return (
    <OnboardingShell
      step={2}
      totalSteps={TOTAL_STEPS}
      title="Allergies and diet"
      subtitle="Allergies come first — they permanently filter matching ingredients out of everything we show you."
      footer={
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-[#E8E6E0] px-4 py-3 text-sm font-medium text-[#1A1D1B]"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="flex-1 rounded-xl bg-[#1F5F45] py-3 text-sm font-medium text-white transition hover:bg-[#2E7D5B]"
          >
            Continue
          </button>
        </div>
      }
    >
      <div>
        <h3 className="text-sm font-semibold text-[#1A1D1B]">Any allergies?</h3>
        <p className="mt-1 text-xs text-[#6B7370]">
          Pick as many as apply. This is the main safeguard that keeps unsafe recipes off
          your dashboard.
        </p>
        <div className="mt-3">
          <ChipGrid
            options={allergens.map((a) => ({ value: a.id, label: a.name }))}
            selected={allergenIds}
            onToggle={toggleAllergen}
          />
        </div>

        <div className="mt-5">
          <label className="block text-sm font-medium text-[#1A1D1B]">
            Other allergies
          </label>
          <p className="mt-1 text-xs text-[#6B7370]">
            List specific foods or food groups, separated by commas (e.g. &ldquo;kiwi,
            shellfish&rdquo;).
          </p>
          <div className="mt-2">
            <TagInput
              value={customAllergens}
              onAdd={addCustomAllergen}
              onRemove={(v) => setCustomAllergens((prev) => prev.filter((c) => c !== v))}
              input={customAllergenInput}
              onInputChange={setCustomAllergenInput}
              placeholder="e.g. kiwi, cilantro"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-[#E8E6E0] pt-6">
        <h3 className="text-sm font-semibold text-[#1A1D1B]">Any diets that apply to you?</h3>
        <p className="mt-1 text-xs text-[#6B7370]">
          Pick as many as you like. No restrictions is fine too — leave this blank.
        </p>
        <div className="mt-3">
          <ChipGrid
            options={diets.map((d) => ({ value: d.id, label: d.name }))}
            selected={dietIds}
            onToggle={toggleDiet}
          />
        </div>
      </div>
    </OnboardingShell>
  );
}
