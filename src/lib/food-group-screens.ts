// Groups the 27 food groups into 5 onboarding screens of ~5-6 sliders each.
// This grouping is for onboarding UX pacing only and is independent of the
// FoodGroup.category field (which is used for admin aggregate views).
export const FOOD_GROUP_SCREENS: { title: string; groups: string[] }[] = [
  {
    title: "Produce",
    groups: [
      "Leafy greens",
      "Cruciferous veg",
      "Root veg",
      "Nightshades",
      "Alliums",
      "Mushrooms",
    ],
  },
  {
    title: "Grains, legumes & fruit",
    groups: ["Fruit", "Starchy veg", "Whole grains", "Refined grains", "Legumes & pulses"],
  },
  {
    title: "Proteins",
    groups: ["Red meat", "Poultry", "Pork", "Oily fish", "White fish", "Shellfish"],
  },
  {
    title: "Dairy, eggs & extras",
    groups: [
      "Dairy",
      "Eggs",
      "Nuts & seeds",
      "Soy & tofu",
      "Fermented foods",
      "Chilli & heat",
    ],
  },
  {
    title: "Flavour & indulgence",
    groups: ["Fresh herbs", "Warm spices", "Added sugar", "Fried & rich"],
  },
];
