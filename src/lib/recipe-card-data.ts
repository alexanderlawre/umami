// Shared Prisma select + mapper for producing a SavedRecipeData-shaped
// object (see src/components/recipe-card-shell.tsx) from a Recipe row.
// Used by the cookbook management page and the public cookbook view so both
// render recipe cards identically without duplicating the select shape.
export const recipeCardSelect = {
  id: true,
  slug: true,
  title: true,
  shortDescription: true,
  note: true,
  mealSlot: true,
  prepMinutes: true,
  cookMinutes: true,
  imageUrl: true,
  imageCredit: true,
  cuisine: { select: { name: true } },
  dietTags: { select: { name: true } },
  attributeTags: { select: { code: true } },
  ingredients: { select: { item: true } },
} as const;

type RecipeCardSource = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  note: string;
  mealSlot: string;
  prepMinutes: number;
  cookMinutes: number;
  imageUrl: string | null;
  imageCredit: string | null;
  cuisine: { name: string };
  dietTags: { name: string }[];
  attributeTags: { code: string }[];
  ingredients: { item: string }[];
};

export function toRecipeCardData(recipe: RecipeCardSource) {
  return {
    id: recipe.id,
    slug: recipe.slug,
    title: recipe.title,
    shortDescription: recipe.shortDescription,
    note: recipe.note,
    cuisine: recipe.cuisine.name,
    mealSlot: recipe.mealSlot,
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    attributes: recipe.attributeTags.map((t) => t.code),
    dietTags: recipe.dietTags.map((d) => d.name),
    ingredientItems: recipe.ingredients.map((i) => i.item),
    imageUrl: recipe.imageUrl,
    imageCredit: recipe.imageCredit,
  };
}
