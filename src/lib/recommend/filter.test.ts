import { describe, expect, it } from "vitest";
import { isRecipeEligible, filterEligibleRecipes } from "./filter";
import type { FilterableRecipe, UserFilterProfile } from "./filter";

function recipe(overrides: Partial<FilterableRecipe> = {}): FilterableRecipe {
  return {
    id: "r1",
    isActive: true,
    allergenReviewStatus: "VERIFIED",
    dietTags: [],
    allergenTags: [],
    ...overrides,
  };
}

function user(overrides: Partial<UserFilterProfile> = {}): UserFilterProfile {
  return {
    diets: [],
    allergens: [],
    customAllergens: [],
    ...overrides,
  };
}

describe("isRecipeEligible", () => {
  it("allows a recipe with no restrictions for a user with no restrictions", () => {
    expect(isRecipeEligible(recipe(), user())).toBe(true);
  });

  it("excludes inactive recipes regardless of tagging", () => {
    expect(isRecipeEligible(recipe({ isActive: false }), user())).toBe(false);
  });

  // Fixture: new user, no preferences set yet
  it("new user with no diets/allergens sees any active, tagged-or-not recipe", () => {
    const r = recipe({ allergenReviewStatus: "UNVERIFIED", dietTags: ["Keto"] });
    expect(isRecipeEligible(r, user())).toBe(true);
  });

  // Fixture: vegan user with a peanut allergy
  it("excludes a recipe containing the user's declared allergen even if vegan", () => {
    const vegan = user({ diets: ["Vegan"], allergens: ["Peanuts"] });
    const peanutRecipe = recipe({
      dietTags: ["Vegan", "Vegetarian"],
      allergenTags: ["Peanuts"],
    });
    expect(isRecipeEligible(peanutRecipe, vegan)).toBe(false);
  });

  it("allows a vegan+peanut-allergy user a vegan recipe without peanuts", () => {
    const vegan = user({ diets: ["Vegan"], allergens: ["Peanuts"] });
    const safeRecipe = recipe({ dietTags: ["Vegan", "Vegetarian"] });
    expect(isRecipeEligible(safeRecipe, vegan)).toBe(true);
  });

  it("excludes a non-vegan recipe for a vegan user even without allergens", () => {
    const vegan = user({ diets: ["Vegan"] });
    const meatRecipe = recipe({ dietTags: ["Gluten-free"] });
    expect(isRecipeEligible(meatRecipe, vegan)).toBe(false);
  });

  it("requires a recipe to satisfy ALL of the user's declared diets", () => {
    const both = user({ diets: ["Vegan", "Gluten-free"] });
    const onlyVegan = recipe({ dietTags: ["Vegan", "Vegetarian"] });
    const veganAndGF = recipe({ dietTags: ["Vegan", "Vegetarian", "Gluten-free"] });
    expect(isRecipeEligible(onlyVegan, both)).toBe(false);
    expect(isRecipeEligible(veganAndGF, both)).toBe(true);
  });

  // Fixture: custom free-text allergen case, since it can't be matched
  // against structured tags — the spec requires failing closed to VERIFIED
  // recipes only for these users too.
  it("restricts a user with only a custom free-text allergen to VERIFIED recipes", () => {
    const customAllergyUser = user({ customAllergens: ["kiwi"] });
    const unverified = recipe({ allergenReviewStatus: "UNVERIFIED" });
    const verified = recipe({ allergenReviewStatus: "VERIFIED" });
    expect(isRecipeEligible(unverified, customAllergyUser)).toBe(false);
    expect(isRecipeEligible(verified, customAllergyUser)).toBe(true);
  });

  it("does not require VERIFIED status for users with no declared allergies", () => {
    const noAllergyUser = user();
    const unverified = recipe({ allergenReviewStatus: "UNVERIFIED" });
    expect(isRecipeEligible(unverified, noAllergyUser)).toBe(true);
  });

  // Fixture: heavy cook / dormant user — hard filter behaves the same
  // regardless of interaction history, since it doesn't look at it at all.
  it("hard filter ignores interaction history entirely", () => {
    const anyUser = user({ diets: ["Vegetarian"] });
    const r = recipe({ dietTags: ["Vegetarian"] });
    expect(isRecipeEligible(r, anyUser)).toBe(true);
  });
});

describe("filterEligibleRecipes", () => {
  it("filters a list down to only eligible recipes", () => {
    const vegan = user({ diets: ["Vegan"], allergens: ["Tree nuts"] });
    const recipes = [
      recipe({ id: "a", dietTags: ["Vegan"] }),
      recipe({ id: "b", dietTags: ["Vegan"], allergenTags: ["Tree nuts"] }),
      recipe({ id: "c", dietTags: ["Vegetarian"] }),
    ];
    const result = filterEligibleRecipes(recipes, vegan);
    expect(result.map((r) => r.id)).toEqual(["a"]);
  });
});
