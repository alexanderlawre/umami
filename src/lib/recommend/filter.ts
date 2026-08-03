// Hard filter: allergen exclusion only. This runs before any scoring and can
// never be overridden by a high score — it's the one thing that's a safety
// concern, not a preference. Pure and unit-tested so a bug here can't
// silently leak an unsafe recipe to a user.
//
// Diet is intentionally NOT a hard filter: a recipe that doesn't match the
// user's declared diet(s) can still appear, just ranked lower (see
// src/lib/recommend/score.ts) — otherwise a user with several diets/an
// under-tagged catalog can get an empty feed. Allergies stay hard because
// getting those wrong is a safety issue, not a preference mismatch.

export type FilterableRecipe = {
  id: string;
  isActive: boolean;
  allergenReviewStatus: "VERIFIED" | "UNVERIFIED";
  dietTags: string[]; // Diet names this recipe satisfies
  allergenTags: string[]; // Allergen names this recipe contains
  ingredientItems?: string[]; // Free-text ingredient names, used to match custom allergens
};

export type UserFilterProfile = {
  diets: string[]; // Diet names the user follows
  allergens: string[]; // Built-in allergen names the user declared
  customAllergens: string[]; // Free-text allergens/foods the user declared
};

/**
 * Whether a recipe is safe/eligible to ever show a given user, ignoring
 * cooldowns and scoring entirely.
 */
export function isRecipeEligible(
  recipe: FilterableRecipe,
  user: UserFilterProfile
): boolean {
  if (!recipe.isActive) return false;

  // Fail closed: any declared allergy (built-in or free-text) restricts the
  // user to recipes whose allergen tagging has been verified.
  const hasDeclaredAllergies =
    user.allergens.length > 0 || user.customAllergens.length > 0;
  if (hasDeclaredAllergies && recipe.allergenReviewStatus !== "VERIFIED") {
    return false;
  }

  const hasAllergenConflict = recipe.allergenTags.some((tag) =>
    user.allergens.includes(tag)
  );
  if (hasAllergenConflict) return false;

  // Custom free-text allergens: substring-match (case-insensitive) each
  // declared term against every ingredient's item text. This is the primary
  // safety gate for allergies the built-in catalog doesn't cover, so it
  // errs toward over-excluding rather than risking a match miss.
  if (user.customAllergens.length > 0 && recipe.ingredientItems) {
    const terms = user.customAllergens
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean);
    const hasCustomAllergenConflict = recipe.ingredientItems.some((item) => {
      const lower = item.toLowerCase();
      return terms.some((term) => lower.includes(term));
    });
    if (hasCustomAllergenConflict) return false;
  }

  return true;
}

export function filterEligibleRecipes<T extends FilterableRecipe>(
  recipes: T[],
  user: UserFilterProfile
): T[] {
  return recipes.filter((recipe) => isRecipeEligible(recipe, user));
}
