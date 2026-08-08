"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { FoodGroup, FoodGroupCategory } from "@prisma/client";
import { OnboardingShell, CategoryAccordion, SliderRow, TagInput } from "../onboarding-ui";
import { ONBOARDING_PREFS_KEY, type OnboardingPreferences } from "../shared";

const TOTAL_STEPS = 3;
const SUGGESTED_CUISINE_COUNT = 5;

// Display order and labels for the basic food-group categories. Each
// category starts as a single "Overall" slider; expanding it reveals one
// slider per individual food group within that category.
const CATEGORY_ORDER: FoodGroupCategory[] = [
  "PRODUCE",
  "PROTEIN",
  "GRAIN",
  "DAIRY",
  "FLAVOR",
  "OTHER",
];

const CATEGORY_LABELS: Record<FoodGroupCategory, string> = {
  PRODUCE: "Fruits and vegetables",
  PROTEIN: "Proteins",
  GRAIN: "Grains",
  DAIRY: "Dairy",
  FLAVOR: "Flavor and seasonings",
  OTHER: "Other",
};

export function PersonalizeClient({ foodGroups }: { foodGroups: FoodGroup[] }) {
  const router = useRouter();
  const { update } = useSession();

  const [prefs, setPrefs] = useState<OnboardingPreferences | null>(null);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryGroups = useMemo(() => {
    const byCategory = new Map<FoodGroupCategory, FoodGroup[]>();
    for (const fg of foodGroups) {
      const list = byCategory.get(fg.category) ?? [];
      list.push(fg);
      byCategory.set(fg.category, list);
    }
    return CATEGORY_ORDER.filter((category) => byCategory.has(category)).map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      items: byCategory.get(category)!,
    }));
  }, [foodGroups]);

  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const fg of foodGroups) init[fg.id] = 50;
    return init;
  });
  const [expanded, setExpanded] = useState<Set<FoodGroupCategory>>(new Set());
  const [feedback, setFeedback] = useState("");
  const [cuisineInput, setCuisineInput] = useState("");
  const [favoriteCuisines, setFavoriteCuisines] = useState<string[]>([]);

  function categoryValue(items: FoodGroup[]) {
    if (items.length === 0) return 50;
    const sum = items.reduce((acc, fg) => acc + (values[fg.id] ?? 50), 0);
    return Math.round(sum / items.length);
  }

  function setCategoryValue(items: FoodGroup[], value: number) {
    setValues((prev) => {
      const next = { ...prev };
      for (const fg of items) next[fg.id] = value;
      return next;
    });
  }

  function toggleExpanded(category: FoodGroupCategory) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  useEffect(() => {
    const raw = sessionStorage.getItem(ONBOARDING_PREFS_KEY);
    if (!raw) {
      router.replace("/onboarding/preferences");
      return;
    }
    try {
      setPrefs(JSON.parse(raw));
      setReady(true);
    } catch {
      router.replace("/onboarding/preferences");
    }
  }, [router]);

  function addCuisines() {
    const parts = cuisineInput
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      setFavoriteCuisines((prev) => [...new Set([...prev, ...parts])]);
    }
    setCuisineInput("");
  }

  async function finish() {
    if (!prefs) return;
    setSubmitting(true);
    setError(null);

    const meters = values;

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dietIds: prefs.dietIds,
          allergenIds: prefs.allergenIds,
          customAllergens: prefs.customAllergens,
          meters,
          favoriteCuisines,
          foodGroupFeedback: feedback.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong saving your preferences.");
        setSubmitting(false);
        return;
      }

      sessionStorage.removeItem(ONBOARDING_PREFS_KEY);
      await update({ onboarded: true });
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  if (!ready) return null;

  return (
    <OnboardingShell
      step={3}
      totalSteps={TOTAL_STEPS}
      title="Personalize"
      subtitle="Rarely to constantly. Defaults are fine if you're not sure, you can always tweak this later."
      footer={
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/onboarding/preferences")}
            className="rounded-xl border border-[#E8E6E0] px-4 py-3 text-sm font-medium text-[#1A1D1B]"
          >
            Back
          </button>
          <button
            type="button"
            onClick={finish}
            disabled={submitting}
            className="flex-1 rounded-xl bg-[#1F5F45] py-3 text-sm font-medium text-white transition hover:bg-[#2E7D5B] disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Finish"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {categoryGroups.map(({ category, label, items }) => (
          <CategoryAccordion
            key={category}
            label={label}
            value={categoryValue(items)}
            onChange={(v) => setCategoryValue(items, v)}
            expanded={expanded.has(category)}
            onToggleExpanded={() => toggleExpanded(category)}
          >
            {items.map((fg) => (
              <SliderRow
                key={fg.id}
                label={fg.name}
                value={values[fg.id] ?? 50}
                onChange={(v) => setValues((prev) => ({ ...prev, [fg.id]: v }))}
              />
            ))}
          </CategoryAccordion>
        ))}
      </div>

      <div className="mt-8 border-t border-[#E8E6E0] pt-6">
        <label className="block text-sm font-medium text-[#1A1D1B]">
          Don&apos;t see something you eat a lot?
        </label>
        <p className="mt-1 text-xs text-[#6B7370]">
          Tell us and we&apos;ll work on adding it. Optional.
        </p>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={2}
          className="mt-2 w-full rounded-xl border border-[#E8E6E0] bg-white px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#1F5F45]"
        />
      </div>

      <div className="mt-8 border-t border-[#E8E6E0] pt-6">
        <label className="block text-sm font-medium text-[#1A1D1B]">
          Favorite cuisines
        </label>
        <p className="mt-1 text-xs text-[#6B7370]">
          Type at least {SUGGESTED_CUISINE_COUNT} if you can, more if you want. This shows
          favoritism toward these cuisines without ruling out anything else.
        </p>
        <div className="mt-2">
          <TagInput
            value={favoriteCuisines}
            onAdd={addCuisines}
            onRemove={(v) => setFavoriteCuisines((prev) => prev.filter((c) => c !== v))}
            input={cuisineInput}
            onInputChange={setCuisineInput}
            placeholder="e.g. Mexican, Thai, French"
          />
        </div>
        {favoriteCuisines.length > 0 && favoriteCuisines.length < SUGGESTED_CUISINE_COUNT && (
          <p className="mt-2 text-xs text-[#6B7370]">
            {SUGGESTED_CUISINE_COUNT - favoriteCuisines.length} more suggested, but not
            required.
          </p>
        )}
      </div>

      {error && <p className="mt-6 text-sm text-[#B23A32]">{error}</p>}
    </OnboardingShell>
  );
}
