// Shared types/constants for the recipe create/edit form, used by both the
// admin `RecipeEditor` and the public `/submit-recipe` submission form so
// the ~650-line form markup (`RecipeFormFields`) isn't duplicated.

export type EditorCuisine = { id: string; name: string; slug: string };
export type EditorDiet = { id: string; name: string };
export type EditorAllergen = { id: string; name: string };
export type EditorAttributeTag = { id: string; name: string; code: string };

export type EditorIngredient = {
  component: string | null;
  quantity: string;
  unit: string | null;
  item: string;
  prepNote: string | null;
  optional: boolean;
};

export type EditorStep = {
  text: string;
  durationMinutes: number | null;
};

export type EditorRecipe = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  note: string;
  introCopy: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  difficulty: "EASY" | "MEDIUM" | "INVOLVED";
  cuisineId: string;
  mealSlot: string[];
  effortTier: "WEEKNIGHT" | "WEEKEND" | "PROJECT";
  batchFriendly: boolean;
  attributes: string[];
  heroColor: string;
  imageUrl: string | null;
  imageCredit: string | null;
  isActive: boolean;
  allergenReviewStatus: "UNVERIFIED" | "VERIFIED";
  caloriesPerServing: number | null;
  proteinGrams: number | null;
  carbsGrams: number | null;
  fatGrams: number | null;
  dietIds: string[];
  allergenIds: string[];
  ingredients: EditorIngredient[];
  steps: EditorStep[];
};

// The subset of EditorRecipe actually edited via the form — excludes
// server-assigned/admin-only fields (id/slug/imageUrl/isActive/allergenReviewStatus).
export type RecipeFormValues = Omit<
  EditorRecipe,
  "id" | "slug" | "imageUrl" | "isActive" | "allergenReviewStatus"
>;

export const EMPTY_RECIPE: RecipeFormValues = {
  title: "",
  shortDescription: "",
  note: "",
  introCopy: "",
  servings: 4,
  prepMinutes: 15,
  cookMinutes: 20,
  difficulty: "EASY",
  cuisineId: "",
  mealSlot: ["DINNER"],
  effortTier: "WEEKNIGHT",
  batchFriendly: false,
  attributes: [],
  heroColor: "#1F5F45",
  imageCredit: null,
  caloriesPerServing: null,
  proteinGrams: null,
  carbsGrams: null,
  fatGrams: null,
  dietIds: [],
  allergenIds: [],
  ingredients: [{ component: null, quantity: "", unit: null, item: "", prepNote: null, optional: false }],
  steps: [{ text: "", durationMinutes: null }],
};

export const DIFFICULTIES = ["EASY", "MEDIUM", "INVOLVED"] as const;
export const MEAL_SLOTS = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;
export const EFFORT_TIERS = ["WEEKNIGHT", "WEEKEND", "PROJECT"] as const;
