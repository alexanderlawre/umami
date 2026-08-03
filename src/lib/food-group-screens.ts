// Onboarding shows one consolidated "personalize" screen with ~12 broad
// sliders instead of the full 27-row FoodGroup catalog spread across 5
// screens — narrower/niche groups (e.g. "Nightshades", "Alliums") are
// clustered under a broader, plain-language label so a new user isn't
// stalled by unfamiliar categories. Moving a cluster's slider writes the
// same declared value to every underlying FoodGroup id in that cluster.
//
// This clustering is a presentation-layer convenience only — the underlying
// FoodGroup catalog (used for recipe profiling and admin aggregate views)
// is untouched and still has all 27 rows.
export const FOOD_GROUP_CLUSTERS: { title: string; groups: string[] }[] = [
  {
    title: "Vegetables",
    groups: [
      "Leafy greens",
      "Cruciferous veg",
      "Root veg",
      "Nightshades",
      "Alliums",
      "Mushrooms",
    ],
  },
  { title: "Fruit", groups: ["Fruit"] },
  { title: "Whole grains", groups: ["Whole grains"] },
  { title: "Refined grains & starchy sides", groups: ["Refined grains", "Starchy veg"] },
  { title: "Legumes & plant proteins", groups: ["Legumes & pulses"] },
  { title: "Red meat", groups: ["Red meat", "Pork"] },
  { title: "Poultry", groups: ["Poultry"] },
  { title: "Fish & shellfish", groups: ["Oily fish", "White fish", "Shellfish"] },
  { title: "Eggs & dairy", groups: ["Eggs", "Dairy", "Fermented foods"] },
  { title: "Nuts, seeds & soy", groups: ["Nuts & seeds", "Soy & tofu"] },
  { title: "Spice & heat", groups: ["Fresh herbs", "Warm spices", "Chilli & heat"] },
  { title: "Sweets & fried indulgence", groups: ["Added sugar", "Fried & rich"] },
];
