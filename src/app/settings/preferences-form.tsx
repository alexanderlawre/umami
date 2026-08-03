"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Allergen, Diet, FoodGroup } from "@prisma/client";
import { ChipGrid, TagInput } from "../onboarding/onboarding-ui";
import { FOOD_GROUP_CLUSTERS } from "@/lib/food-group-screens";

const SUGGESTED_CUISINE_COUNT = 5;

export function PreferencesForm({
  diets,
  allergens,
  foodGroups,
  initialDietIds,
  initialAllergenIds,
  initialCustomAllergens,
  initialFavoriteCuisines,
  initialFoodGroupFeedback,
  initialClusterValues,
}: {
  diets: Diet[];
  allergens: Allergen[];
  foodGroups: FoodGroup[];
  initialDietIds: string[];
  initialAllergenIds: string[];
  initialCustomAllergens: string[];
  initialFavoriteCuisines: string[];
  initialFoodGroupFeedback: string;
  initialClusterValues: number[];
}) {
  const router = useRouter();

  const [dietIds, setDietIds] = useState<string[]>(initialDietIds);
  const [allergenIds, setAllergenIds] = useState<string[]>(initialAllergenIds);
  const [customAllergenInput, setCustomAllergenInput] = useState("");
  const [customAllergens, setCustomAllergens] = useState<string[]>(initialCustomAllergens);
  const [clusterValues, setClusterValues] = useState<number[]>(initialClusterValues);
  const [feedback, setFeedback] = useState(initialFoodGroupFeedback);
  const [cuisineInput, setCuisineInput] = useState("");
  const [favoriteCuisines, setFavoriteCuisines] = useState<string[]>(initialFavoriteCuisines);

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

  function addCuisines() {
    const parts = cuisineInput
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      setSaved(false);
      setFavoriteCuisines((prev) => [...new Set([...prev, ...parts])]);
    }
    setCuisineInput("");
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
          dietIds,
          allergenIds,
          customAllergens,
          meters,
          favoriteCuisines,
          foodGroupFeedback: feedback.trim() || null,
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
      <h1 className="text-xl font-bold tracking-tight text-[#1A1D1B]">Settings</h1>
      <p className="mt-1 text-sm text-[#6B7370]">
        Update your diet, allergies, and food preferences any time — changes apply to your
        dashboard right away.
      </p>

      <div className="mt-8">
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

      <div className="mt-8 border-t border-[#E8E6E0] pt-6">
        <h3 className="text-sm font-semibold text-[#1A1D1B]">How much do you eat these?</h3>
        <p className="mt-1 text-xs text-[#6B7370]">
          Rarely to constantly — this nudges which recipes we show you first, it never rules
          anything out.
        </p>
        <div className="mt-4 space-y-6">
          {FOOD_GROUP_CLUSTERS.map((cluster, i) => (
            <div key={cluster.title}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[#1A1D1B]">{cluster.title}</span>
                <span className="text-[#6B7370]">{clusterValues[i]}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={clusterValues[i]}
                onChange={(e) => {
                  setSaved(false);
                  const next = [...clusterValues];
                  next[i] = Number(e.target.value);
                  setClusterValues(next);
                }}
                className="mt-2 w-full accent-[#1F5F45]"
              />
              <div className="flex justify-between text-xs text-[#6B7370]">
                <span>rarely</span>
                <span>constantly</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 border-t border-[#E8E6E0] pt-6">
        <label className="block text-sm font-medium text-[#1A1D1B]">
          Don&apos;t see something you eat a lot?
        </label>
        <p className="mt-1 text-xs text-[#6B7370]">Tell us and we&apos;ll work on adding it. Optional.</p>
        <textarea
          value={feedback}
          onChange={(e) => {
            setSaved(false);
            setFeedback(e.target.value);
          }}
          rows={2}
          className="mt-2 w-full rounded-xl border border-[#E8E6E0] bg-white px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#1F5F45]"
        />
      </div>

      <div className="mt-8 border-t border-[#E8E6E0] pt-6">
        <label className="block text-sm font-medium text-[#1A1D1B]">Favorite cuisines</label>
        <p className="mt-1 text-xs text-[#6B7370]">
          Type at least {SUGGESTED_CUISINE_COUNT} if you can, more if you want. This shows
          favoritism toward these cuisines without ruling out anything else.
        </p>
        <div className="mt-2">
          <TagInput
            value={favoriteCuisines}
            onAdd={addCuisines}
            onRemove={(v) => {
              setSaved(false);
              setFavoriteCuisines((prev) => prev.filter((c) => c !== v));
            }}
            input={cuisineInput}
            onInputChange={setCuisineInput}
            placeholder="e.g. Mexican, Thai, French"
          />
        </div>
      </div>

      {error && <p className="mt-6 text-sm text-[#B23A32]">{error}</p>}

      <div className="mt-8 flex items-center gap-3 border-t border-[#E8E6E0] pt-6">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-[#1F5F45] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2E7D5B] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
        {saved && <span className="text-sm text-[#1F5F45]">Saved!</span>}
      </div>
    </main>
  );
}
