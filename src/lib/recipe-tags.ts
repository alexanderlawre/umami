// Shared display helpers for recipe tags: human-readable labels for the
// `attributes` codes (backed by the admin-editable AttributeTag catalog —
// this map is a display-only fallback/default set used before a DB-fetched
// label is available, or if a code has no catalog match), colored emblem
// styling for `dietTags`, and small formatters for the dashboard/cook-later
// card chip row.

export const ATTRIBUTE_LABELS: Record<string, string> = {
  HIGH_PROTEIN: "High protein",
  MAKE_AHEAD: "Meal prep",
  LOW_CARB: "Low carb",
  LOW_CALORIE: "Low calorie",
  ONE_POT: "One pot",
  SPEND_LESS: "Budget-friendly",
  CROWD_PLEASER: "Crowd-pleaser",
  EAT_MORE_VEG: "Veg-forward",
  FRIED: "Fried",
  UNDER_30: "Under 30 min",
  SPICY: "Spicy",
  FREEZER_FRIENDLY: "Freezer-friendly",
  HIGH_FIBER: "High fiber",
  LOW_SUGAR: "Low sugar",
  NO_COOK: "No-cook",
  GRILLED: "Grilled",
  COMFORT_FOOD: "Comfort food",
  SHEET_PAN: "Sheet-pan",
};

export function attributeLabel(code: string): string {
  return ATTRIBUTE_LABELS[code] ?? code;
}

// Attribute codes suppressed from the card's own bottom chip row (still
// valid as dashboard filter options) because another chip already conveys
// the same info more precisely (UNDER_30 vs. the numeric time chip), or
// because the tag was dropped from card display entirely (FREEZER_FRIENDLY).
const CARD_DISPLAY_SUPPRESSED = new Set(["UNDER_30", "FREEZER_FRIENDLY"]);

export function cardDisplayAttributes(attributes: string[], max = 3): string[] {
  return attributes.filter((a) => !CARD_DISPLAY_SUPPRESSED.has(a)).slice(0, max);
}

// Cook-method attributes describe *how* a dish is made (equipment/technique),
// which reads as redundant/low-value alongside the dashboard's title +
// diet + time chips — excluded from the dashboard card's ranked tag row
// (still valid as dashboard filter options via FilterBar, which reads
// attributes directly rather than through this module).
const COOK_METHOD_ATTRIBUTES = new Set([
  "ONE_POT",
  "NO_COOK",
  "SHEET_PAN",
  "GRILLED",
  "FRIED",
  "MAKE_AHEAD",
]);

// Attribute codes mapped to the diet names they're most relevant to, used to
// rank a recipe's tags by fit with the current user's diets rather than raw
// array order. Not every attribute has an obvious diet association (e.g.
// SPEND_LESS, KID_FRIENDLY, CROWD_PLEASER) — those just sort after any
// diet-matched tags, in their original order.
const ATTRIBUTE_DIET_HINTS: Record<string, string[]> = {
  HIGH_PROTEIN: ["High-protein"],
  LOW_CARB: ["Keto", "Low-carb"],
  LOW_CALORIE: ["Diabetic-friendly", "Whole30"],
  LOW_SUGAR: ["Diabetic-friendly", "Whole30"],
  EAT_MORE_VEG: ["Vegetarian", "Vegan", "Flexitarian", "Mediterranean"],
  HIGH_FIBER: ["Mediterranean", "Whole30"],
};

// Dashboard-card tag ranking: drops cook-method tags entirely, then sorts
// the rest so tags relevant to the user's diets surface first (stable sort —
// ties keep their original relative order), before truncating to `max`.
export function rankedCardAttributes(
  attributes: string[],
  userDiets: string[],
  max = 3,
): string[] {
  const eligible = attributes.filter(
    (a) => !CARD_DISPLAY_SUPPRESSED.has(a) && !COOK_METHOD_ATTRIBUTES.has(a),
  );
  const isRelevant = (a: string) => (ATTRIBUTE_DIET_HINTS[a] ?? []).some((d) => userDiets.includes(d));
  const relevant = eligible.filter(isRelevant);
  const rest = eligible.filter((a) => !isRelevant(a));
  return [...relevant, ...rest].slice(0, max);
}

// One Tailwind bg/text pairing per diet, so each diet reads as a distinct
// colored emblem on the card. "Omnivore" is excluded — it's the default,
// non-distinguishing case and is never rendered as an emblem.
export const DIET_COLORS: Record<string, string> = {
  Vegetarian: "bg-lime-100 text-lime-800",
  Vegan: "bg-green-100 text-green-800",
  Pescatarian: "bg-cyan-100 text-cyan-800",
  Flexitarian: "bg-stone-100 text-stone-800",
  Keto: "bg-purple-100 text-purple-800",
  "Low-carb": "bg-violet-100 text-violet-800",
  Paleo: "bg-orange-100 text-orange-800",
  Whole30: "bg-amber-100 text-amber-900",
  Mediterranean: "bg-blue-100 text-blue-800",
  "Gluten-free": "bg-yellow-100 text-yellow-800",
  "Dairy-free": "bg-sky-100 text-sky-800",
  "Low-FODMAP": "bg-pink-100 text-pink-800",
  Halal: "bg-emerald-100 text-emerald-800",
  Kosher: "bg-teal-100 text-teal-800",
  "Low-sodium": "bg-slate-100 text-slate-800",
  "Diabetic-friendly": "bg-indigo-100 text-indigo-800",
  "High-protein": "bg-red-100 text-red-800",
};

export function dietEmblemClass(diet: string): string | null {
  if (diet === "Omnivore") return null;
  return DIET_COLORS[diet] ?? "bg-[#EDF3EF] text-[#1A1D1B]";
}

// Diets that imply another, broader diet (e.g. Vegan is by definition also
// Vegetarian) — the broader diet is redundant to show alongside the
// stricter one, so it's dropped from the visible emblems when both are
// present on the same recipe.
const IMPLIED_DIET_SUPPRESSED: Record<string, string[]> = {
  Vegan: ["Vegetarian"],
};

export function visibleDietEmblems(dietTags: string[], max = 3): string[] {
  const suppressed = new Set(
    dietTags.flatMap((d) => IMPLIED_DIET_SUPPRESSED[d] ?? []),
  );
  return dietTags
    .filter((d) => d !== "Omnivore" && !suppressed.has(d))
    .slice(0, max);
}

const MEAL_SLOT_LABELS: Record<string, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
};

export function formatMealSlot(mealSlot: string[]): string | null {
  const first = mealSlot[0];
  if (!first) return null;
  return MEAL_SLOT_LABELS[first] ?? first;
}

export function formatMinutes(prepMinutes: number, cookMinutes: number): string {
  return `${prepMinutes + cookMinutes} min`;
}
