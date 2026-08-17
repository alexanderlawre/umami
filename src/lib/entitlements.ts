// Single source of truth for every free-vs-premium limit and feature flag.
// All gates (server-side route handlers, page redirects, and client-side
// display logic) must read from here — never scatter limit constants
// elsewhere. When Stripe lands, only the plan-resolution source (currently
// `session.user.isPremium`, itself sourced from `User.isPremium` on the
// JWT) changes; this table and every call site stay the same.

export type Entitlements = {
  // Manual (user-tapped) dashboard refreshes allowed per section per
  // meal-slot window. The feed auto-refreshes regardless of this limit.
  manualRefreshesPerWindowPerSection: number; // 1 (free) or Infinity (premium)

  // Whether "Submit a recipe" opens the real submission form. The entry
  // point itself stays visible to everyone on both plans.
  canSubmitRecipes: boolean;

  // Cooks logged per local calendar day, excluding Tapas (Tapas is always
  // unlimited and never counted, on both plans).
  cooksPerDay: number; // 1 (free) or Infinity (premium)

  // Days a cook-later item is kept before it expires.
  cookLaterDays: number; // 5 (free) or 30 (premium)

  // Whether fat/fiber/cholesterol are shown on recipe detail (calories,
  // protein, and carbs are always shown to everyone).
  macros: boolean;

  // Premium "depth" features — not built yet. Flags exist now so the
  // upgrade screen and any future gating can read them from one place.
  // TODO(premium): implement these features; flags are display-only until then.
  nutritionGoals: boolean;
  mealPlan: boolean;
  collections: boolean;
  visibleTasteProfile: boolean;
  householdProfiles: boolean;
};

export function getEntitlements(isPremium: boolean): Entitlements {
  if (isPremium) {
    return {
      manualRefreshesPerWindowPerSection: Infinity,
      canSubmitRecipes: true,
      cooksPerDay: Infinity,
      cookLaterDays: 30,
      macros: true,
      nutritionGoals: true,
      mealPlan: true,
      collections: true,
      visibleTasteProfile: true,
      householdProfiles: true,
    };
  }

  return {
    manualRefreshesPerWindowPerSection: 1,
    canSubmitRecipes: false,
    cooksPerDay: 1,
    cookLaterDays: 5,
    macros: false,
    nutritionGoals: false,
    mealPlan: false,
    collections: false,
    visibleTasteProfile: false,
    householdProfiles: false,
  };
}
