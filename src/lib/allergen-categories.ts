import type { Allergen } from "@prisma/client";

// The Allergen catalog (prisma/seed/reference.ts's ALLERGENS) is a flat list
// of 15 names with no category column. Onboarding's allergy picker groups
// them into a handful of everyday categories so a user picks a category
// first, then the specific items within it, instead of scanning 15 chips at
// once. This is a presentation-layer grouping only, same pattern as
// FOOD_GROUP_CLUSTERS in src/lib/food-group-screens.ts — the underlying
// Allergen rows are untouched.
export const ALLERGEN_CATEGORIES: { label: string; allergenNames: string[] }[] = [
  { label: "Dairy & eggs", allergenNames: ["Milk", "Eggs"] },
  { label: "Nuts & seeds", allergenNames: ["Peanuts", "Tree nuts", "Sesame"] },
  { label: "Seafood", allergenNames: ["Fish", "Shellfish"] },
  { label: "Grains", allergenNames: ["Wheat/gluten", "Corn"] },
  { label: "Legumes", allergenNames: ["Soy", "Lupin"] },
  { label: "Additives & more", allergenNames: ["Mustard", "Celery", "Sulphites", "Nightshades"] },
];

export const OTHER_ALLERGEN_CATEGORY_LABEL = "Something else";

export type AllergenCategoryGroup = {
  label: string;
  allergens: Allergen[];
};

// Maps real Allergen rows from the database into the category groups above,
// by name. Any allergen not covered by ALLERGEN_CATEGORIES (e.g. a newly
// added one) automatically falls into its own "Something else" bucket, so
// nothing in the catalog is ever hidden.
export function groupAllergensByCategory(allergens: Allergen[]): AllergenCategoryGroup[] {
  const byName = new Map(allergens.map((a) => [a.name, a]));
  const used = new Set<string>();

  const groups: AllergenCategoryGroup[] = [];
  for (const category of ALLERGEN_CATEGORIES) {
    const matched: Allergen[] = [];
    for (const name of category.allergenNames) {
      const allergen = byName.get(name);
      if (allergen) {
        matched.push(allergen);
        used.add(allergen.id);
      }
    }
    if (matched.length > 0) {
      groups.push({ label: category.label, allergens: matched });
    }
  }

  const leftover = allergens.filter((a) => !used.has(a.id));
  if (leftover.length > 0) {
    groups.push({ label: OTHER_ALLERGEN_CATEGORY_LABEL, allergens: leftover });
  }

  return groups;
}
