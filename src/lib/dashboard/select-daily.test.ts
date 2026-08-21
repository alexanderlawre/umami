import { describe, expect, it } from "vitest";
import { satisfiesDiets } from "@/lib/recommend/filter";
import type { ScoringProfile } from "@/lib/recommend/score";
import { DAILY_CARD_COUNT, pickDaily, type EligibleRecipe } from "./select-daily";

let nextId = 0;
function recipe(overrides: Partial<EligibleRecipe> = {}): EligibleRecipe {
  nextId += 1;
  return {
    id: `r${nextId}`,
    slug: `recipe-${nextId}`,
    title: `Recipe ${nextId}`,
    shortDescription: "",
    note: "",
    cuisine: "Other",
    mealSlot: "DINNER",
    prepMinutes: 10,
    cookMinutes: 10,
    attributes: [],
    dietTags: [],
    foodGroupClusters: [],
    ingredientItems: [],
    imageUrl: null,
    imageCredit: null,
    saved: false,
    isDiscovery: false,
    isActive: true,
    allergenReviewStatus: "VERIFIED",
    allergenTags: [],
    foodGroups: [],
    spiceLevel: null,
    ...overrides,
  };
}

function profile(overrides: Partial<ScoringProfile> = {}): ScoringProfile {
  return {
    diets: [],
    favoriteCuisines: [],
    ...overrides,
  };
}

describe("pickDaily", () => {
  it("without a dietMix, fills every slot from the given pool (legacy strict-only/no-diet behavior)", () => {
    const pool = Array.from({ length: 4 }, () => recipe());
    const picked = pickDaily(pool, profile(), "DINNER");
    expect(picked).toHaveLength(DAILY_CARD_COUNT);
    const poolIds = new Set(pool.map((r) => r.id));
    expect(picked.every((r) => poolIds.has(r.id))).toBe(true);
  });

  it("with a Moderate/Flexible dietMix, includes recipes outside the aligned diet(s) too", () => {
    const aligned = Array.from({ length: 2 }, () => recipe({ dietTags: ["Vegan"] }));
    const open = Array.from({ length: 6 }, () => recipe({ dietTags: [] }));
    const pool = [...aligned, ...open];

    const picked = pickDaily(pool, profile(), "DINNER", new Set(), {
      alignedDietNames: ["Vegan"],
      ratio: 0.7,
    });

    const alignedCount = picked.filter((r) => satisfiesDiets(r, ["Vegan"])).length;
    const nonAlignedCount = picked.length - alignedCount;
    expect(nonAlignedCount).toBeGreaterThan(0);
  });

  it("respects the aligned quota (rounded ratio of affinity slots) when the aligned pool is large enough", () => {
    // affinitySlotCount = DAILY_CARD_COUNT - 1 discovery slot = 3.
    // ratio 0.7 -> round(0.7 * 3) = 2 aligned affinity picks expected.
    const aligned = Array.from({ length: 10 }, () => recipe({ dietTags: ["Vegan"] }));
    const open = Array.from({ length: 10 }, () => recipe({ dietTags: [] }));
    const pool = [...aligned, ...open];

    const picked = pickDaily(pool, profile(), "DINNER", new Set(), {
      alignedDietNames: ["Vegan"],
      ratio: 0.7,
    });

    // The one discovery slot is drawn from the full pool and may or may not
    // satisfy the aligned diet, so only assert on the non-discovery slots.
    const affinityPicks = picked.filter((r) => !r.isDiscovery);
    const alignedAffinityCount = affinityPicks.filter((r) => satisfiesDiets(r, ["Vegan"])).length;
    expect(alignedAffinityCount).toBe(2);
  });

  it("falls back to the open pool when the aligned pool is smaller than the target, still filling every slot", () => {
    const aligned = [recipe({ dietTags: ["Vegan"] })]; // fewer than the target of 2
    const open = Array.from({ length: 6 }, () => recipe({ dietTags: [] }));
    const pool = [...aligned, ...open];

    const picked = pickDaily(pool, profile(), "DINNER", new Set(), {
      alignedDietNames: ["Vegan"],
      ratio: 0.7,
    });

    expect(picked).toHaveLength(DAILY_CARD_COUNT);
  });
});
