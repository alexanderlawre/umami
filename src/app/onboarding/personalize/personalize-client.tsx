"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { FoodGroup } from "@prisma/client";
import { FOOD_GROUP_CLUSTERS } from "@/lib/food-group-screens";
import { OnboardingShell, TagInput } from "../onboarding-ui";
import { ONBOARDING_PREFS_KEY, type OnboardingPreferences } from "../shared";

const TOTAL_STEPS = 3;
const SUGGESTED_CUISINE_COUNT = 5;

export function PersonalizeClient({ foodGroups }: { foodGroups: FoodGroup[] }) {
  const router = useRouter();
  const { update } = useSession();

  const [prefs, setPrefs] = useState<OnboardingPreferences | null>(null);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const foodGroupByName = useMemo(() => {
    const map = new Map<string, FoodGroup>();
    for (const fg of foodGroups) map.set(fg.name, fg);
    return map;
  }, [foodGroups]);

  const [clusterValues, setClusterValues] = useState<number[]>(() =>
    FOOD_GROUP_CLUSTERS.map(() => 50),
  );
  const [feedback, setFeedback] = useState("");
  const [cuisineInput, setCuisineInput] = useState("");
  const [favoriteCuisines, setFavoriteCuisines] = useState<string[]>([]);

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
      subtitle="Rarely to constantly. Defaults are fine if you're not sure — you can always tweak this later."
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
      <div className="space-y-6">
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
