// Shared display helpers for recipe tags: human-readable labels for the
// free-text `attributes` codes, colored emblem styling for `dietTags`, and
// small formatters for the dashboard/cook-later card chip row.

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
  // UNDER_30 is intentionally omitted from card display — it's redundant
  // with the explicit time chip shown first on every card.
};

export function attributeLabel(code: string): string {
  return ATTRIBUTE_LABELS[code] ?? code;
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

export function visibleDietEmblems(dietTags: string[], max = 3): string[] {
  return dietTags.filter((d) => d !== "Omnivore").slice(0, max);
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
