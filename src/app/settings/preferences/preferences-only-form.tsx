"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Allergen, Diet, DietCommitment, FoodGroup } from "@prisma/client";
import { ChipGrid, TagInput, DietCommitmentSlider } from "../../onboarding/onboarding-ui";
import { FOOD_GROUP_CLUSTERS } from "@/lib/food-group-screens";
import { PageTransition } from "@/components/page-transition";
import { MotionButton } from "@/components/motion-button";

// Allergies + Diets only — the food-group sliders / feedback / favorite
// cuisines live on the Personalization page (settings/personalization).
// Both pages keep full local state for every field and POST the same
// combined payload to /api/onboarding, so saving from here doesn't clobber
// what's set on the other page.
const SPICE_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "Mild" },
  { value: 2, label: "Medium" },
  { value: 3, label: "Hot" },
];

export function PreferencesOnlyForm({
  diets,
  allergens,
  foodGroups,
  initialDietIds,
  initialDietCommitments,
  initialAllergenIds,
  initialCustomAllergens,
  initialFavoriteCuisines,
  initialFoodGroupFeedback,
  initialClusterValues,
  initialSpiceMax,
}: {
  diets: Diet[];
  allergens: Allergen[];
  foodGroups: FoodGroup[];
  initialDietIds: string[];
  initialDietCommitments: Record<string, DietCommitment>;
  initialAllergenIds: string[];
  initialCustomAllergens: string[];
  initialFavoriteCuisines: string[];
  initialFoodGroupFeedback: string;
  initialClusterValues: number[];
  initialSpiceMax: number | null;
}) {
  const router = useRouter();

  const [dietIds, setDietIds] = useState<string[]>(initialDietIds);
  const [dietCommitments, setDietCommitments] =
    useState<Record<string, DietCommitment>>(initialDietCommitments);
  const [allergenIds, setAllergenIds] = useState<string[]>(initialAllergenIds);
  const [customAllergenInput, setCustomAllergenInput] = useState("");
  const [customAllergens, setCustomAllergens] = useState<string[]>(initialCustomAllergens);
  const [clusterValues] = useState<number[]>(initialClusterValues);
  const [feedback] = useState(initialFoodGroupFeedback);
  const [favoriteCuisines] = useState<string[]>(initialFavoriteCuisines);
  const [spiceMax, setSpiceMax] = useState<number | null>(initialSpiceMax);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const foodGroupByName = useMemo(() => {
    const map = new Map<string, FoodGroup>();
    for (const fg of foodGroups) map.set(fg.name, fg);
    return map;
  }, [foodGroups]);

  function toggleDiet(id: string) {
    setSaved(false);
    setDietIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
    setDietCommitments((prev) => {
      if (dietIds.includes(id)) {
        const rest = { ...prev };
        delete rest[id];
        return rest;
      }
      return { ...prev, [id]: "STRICT" };
    });
  }

  function toggleAllergen(id: string) {
    setSaved(false);
    setAllergenIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  function addCustomAllergen() {
    const parts = customAllergenInput
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      setSaved(false);
      setCustomAllergens((prev) => [...new Set([...prev, ...parts])]);
    }
    setCustomAllergenInput("");
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);

    const meters: Record<string, number> = {};
    FOOD_GROUP_CLUSTERS.forEach((cluster, i) => {
      const value = clusterValues[i];
      for (const groupName of cluster.groups) {
        const fg = foodGroupByName.get(groupName);
        if (fg) meters[fg.id] = value;
      }
    });

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diets: dietIds.map((id) => ({
            dietId: id,
            commitment: dietCommitments[id] ?? "STRICT",
          })),
          allergenIds,
          customAllergens,
          meters,
          favoriteCuisines,
          foodGroupFeedback: feedback.trim() || null,
          spiceMax,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong saving your preferences.");
        return;
      }

      setSaved(true);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10 pb-content-safe">
      <PageTransition>
        <h1 className="text-xl font-bold tracking-tight text-[#1A1D1B]">Preferences</h1>
        <p className="mt-1 text-sm text-[#6B7370]">
          Update your diet and allergies any time. Changes apply to your dashboard right away.
        </p>

        <div className="mt-8 rounded-2xl border border-[#E8E6E0] bg-white p-5 shadow-soft">
          <h3 className="text-sm font-semibold text-[#1A1D1B]">Any allergies?</h3>
          <p className="mt-1 text-xs text-[#6B7370]">
            Pick as many as apply. This is the main safeguard that keeps unsafe recipes off your
            dashboard.
          </p>
          <div className="mt-3">
            <ChipGrid
              options={allergens.map((a) => ({ value: a.id, label: a.name }))}
              selected={allergenIds}
              onToggle={toggleAllergen}
            />
          </div>

          <div className="mt-5">
            <label className="block text-sm font-medium text-[#1A1D1B]">Other allergies</label>
            <p className="mt-1 text-xs text-[#6B7370]">
              List specific foods or food groups, separated by commas (e.g. &ldquo;kiwi,
              shellfish&rdquo;).
            </p>
            <div className="mt-2">
              <TagInput
                value={customAllergens}
                onAdd={addCustomAllergen}
                onRemove={(v) => {
                  setSaved(false);
                  setCustomAllergens((prev) => prev.filter((c) => c !== v));
                }}
                input={customAllergenInput}
                onInputChange={setCustomAllergenInput}
                placeholder="e.g. kiwi, cilantro"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[#E8E6E0] bg-white p-5 shadow-soft">
          <h3 className="text-sm font-semibold text-[#1A1D1B]">Any diets that apply to you?</h3>
          <p className="mt-1 text-xs text-[#6B7370]">
            Pick as many as you like. No restrictions is fine too, you can leave this blank.
          </p>
          <div className="mt-3">
            <ChipGrid
              options={diets.map((d) => ({ value: d.id, label: d.name }))}
              selected={dietIds}
              onToggle={toggleDiet}
            />
          </div>
          {dietIds.length > 0 && (
            <div className="mt-3 space-y-3">
              {dietIds.map((id) => {
                const diet = diets.find((d) => d.id === id);
                if (!diet) return null;
                return (
                  <DietCommitmentSlider
                    key={id}
                    dietName={diet.name}
                    value={dietCommitments[id] ?? "STRICT"}
                    onChange={(level) => {
                      setSaved(false);
                      setDietCommitments((prev) => ({ ...prev, [id]: level }));
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-[#E8E6E0] bg-white p-5 shadow-soft">
          <h3 className="text-sm font-semibold text-[#1A1D1B]">How much heat can you handle?</h3>
          <p className="mt-1 text-xs text-[#6B7370]">
            We won&rsquo;t surface anything spicier than this. Recipes we haven&rsquo;t rated for
            heat still show up either way.
          </p>
          <div className="mt-3">
            <ChipGrid
              options={SPICE_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
              selected={spiceMax === null ? [] : [String(spiceMax)]}
              onToggle={(value) => {
                setSaved(false);
                const numeric = Number(value);
                setSpiceMax((prev) => (prev === numeric ? null : numeric));
              }}
            />
          </div>
        </div>

        {error && <p className="mt-6 text-sm text-[#B23A32]">{error}</p>}

        <div className="mt-8 flex items-center gap-3 border-t border-[#E8E6E0] pt-6">
          <MotionButton
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-[#1B4332] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#2D6A4F] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </MotionButton>
          {saved && <span className="text-sm text-[#1B4332]">Saved!</span>}
        </div>
      </PageTransition>
    </main>
  );
}
