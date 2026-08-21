// Hard filters: allergen exclusion and diet matching. Both run before any
// scoring and can never be overridden by a high score. Pure and unit-tested
// so a bug here can't silently leak an unsafe or misaligned recipe to a
// user.
//
// Diet requires ALL of a user's declared diets to be satisfied (AND, not
// ANY) — a user who says "Vegan" should never see a non-vegan recipe just
// because it scored well on other axes. This can mean a user with several
// diets and an under-tagged catalog sees fewer (or zero) recipes in a given
// section; the dashboard already renders an empty state gracefully for
// that rather than backfilling with mismatched recipes.

export type FilterableRecipe = {
  id: string;
  isActive: boolean;
  allergenReviewStatus: "VERIFIED" | "UNVERIFIED" | "IN_REVIEW";
  dietTags: string[]; // Diet names this recipe satisfies
  allergenTags: string[]; // Allergen names this recipe contains
  ingredientItems?: string[]; // Free-text ingredient names, used to match custom allergens
};

export type UserFilterProfile = {
  diets: string[]; // Diet names the user follows
  allergens: string[]; // Built-in allergen names the user declared
  customAllergens: string[]; // Free-text allergens/foods the user declared
};

export type DietTaggedRecipe = { dietTags: string[] };

/**
 * Whether a recipe satisfies every one of the given diet names (AND, not
 * ANY). Used both as the hard STRICT-diet filter in isRecipeEligible below
 * and to build the "aligned" pool for MODERATE/FLEXIBLE diet commitments in
 * select-daily.ts's guaranteed-mix-ratio logic.
 */
export function satisfiesDiets(recipe: DietTaggedRecipe, diets: string[]): boolean {
  if (diets.length === 0) return true;
  return diets.every((diet) => recipe.dietTags.includes(diet));
}

/**
 * Whether a recipe is safe/eligible to ever show a given user, ignoring
 * cooldowns and scoring entirely.
 */
export function isRecipeEligible(
  recipe: FilterableRecipe,
  user: UserFilterProfile
): boolean {
  if (!recipe.isActive) return false;

  // Every declared diet must be satisfied — a recipe missing even one of
  // the user's declared diets is excluded entirely, not just ranked lower.
  if (!satisfiesDiets(recipe, user.diets)) return false;

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

// Near-hard spice ceiling (free-tier feed intelligence v1): unlike the
// allergen filter above, this is a comfort preference, not a safety
// concern, so it lives in its own function rather than folding into
// isRecipeEligible. `spiceLevel === null` (unrated) always passes — unknown
// heat is never assumed to be hot. `spiceMax === null` means the user
// hasn't set a ceiling (or explicitly wants everything), so nothing is
// filtered.
export type SpiceRateableRecipe = { spiceLevel: number | null };

export function isWithinSpiceCeiling(
  recipe: SpiceRateableRecipe,
  spiceMax: number | null,
): boolean {
  if (spiceMax === null) return true;
  if (recipe.spiceLevel === null) return true;
  return recipe.spiceLevel <= spiceMax;
}

export function filterWithinSpiceCeiling<T extends SpiceRateableRecipe>(
  recipes: T[],
  spiceMax: number | null,
): T[] {
  return recipes.filter((recipe) => isWithinSpiceCeiling(recipe, spiceMax));
}
