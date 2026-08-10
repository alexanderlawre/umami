import { PrismaClient } from "@prisma/client";
import { FOOD_GROUPS, DIETS, ALLERGENS } from "./seed/reference";
import baseRecipes from "./seed/recipes.json";
import spanishRecipes from "./seed/recipes-spanish.json";
import portugueseRecipes from "./seed/recipes-portuguese.json";
import frenchRecipes2a from "./seed/recipes-french-2a.json";
import frenchRecipes2b from "./seed/recipes-french-2b.json";
import italianRecipes2a from "./seed/recipes-italian-2a.json";
import italianRecipes2b from "./seed/recipes-italian-2b.json";
import middleEasternRecipes2 from "./seed/recipes-middle-eastern-2.json";
import northAfricanRecipes from "./seed/recipes-north-african.json";
import brazilianRecipes2 from "./seed/recipes-brazilian-2.json";
import colombianRecipes from "./seed/recipes-colombian.json";
import peruvianRecipes from "./seed/recipes-peruvian.json";
import chileanRecipes from "./seed/recipes-chilean.json";
import argentinianRecipes from "./seed/recipes-argentinian.json";
import venezuelanRecipes from "./seed/recipes-venezuelan.json";
import caribbeanRecipes from "./seed/recipes-caribbean.json";
import mexicanRecipes2 from "./seed/recipes-mexican-2.json";
import { slugify } from "../src/lib/slugify";

const recipesData = [
  ...baseRecipes,
  ...spanishRecipes,
  ...portugueseRecipes,
  ...frenchRecipes2a,
  ...frenchRecipes2b,
  ...italianRecipes2a,
  ...italianRecipes2b,
  ...middleEasternRecipes2,
  ...northAfricanRecipes,
  ...brazilianRecipes2,
  ...colombianRecipes,
  ...peruvianRecipes,
  ...chileanRecipes,
  ...argentinianRecipes,
  ...venezuelanRecipes,
  ...caribbeanRecipes,
  ...mexicanRecipes2,
];

const prisma = new PrismaClient();

type RecipeSeed = {
  slug: string;
  title: string;
  shortDescription: string;
  note: string;
  introCopy: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  difficulty: "EASY" | "MEDIUM" | "INVOLVED";
  cuisine: string;
  mealSlot: string[];
  effortTier: "WEEKNIGHT" | "WEEKEND" | "PROJECT";
  batchFriendly: boolean;
  attributes: string[];
  heroColor: string;
  imageUrl?: string;
  imageCredit?: string;
  allergenReviewStatus: "UNVERIFIED" | "VERIFIED";
  // Bulk-seeded recipes awaiting photo/review start hidden; defaults to true
  // (matching the schema default) when omitted, so existing seed data that
  // doesn't set this is unaffected.
  isActive?: boolean;
  ingredients: {
    component: string | null;
    order: number;
    quantity: string;
    unit: string | null;
    item: string;
    prepNote: string | null;
    optional: boolean;
  }[];
  steps: { order: number; text: string; durationMinutes: number | null }[];
  foodGroupProfile: { foodGroup: string; weight: number }[];
  dietTags: string[];
  allergenTags: string[];
};

async function main() {
  console.log("Seeding food groups, diets, allergens...");

  for (const fg of FOOD_GROUPS) {
    await prisma.foodGroup.upsert({
      where: { name: fg.name },
      create: fg,
      update: fg,
    });
  }

  for (const name of DIETS) {
    await prisma.diet.upsert({ where: { name }, create: { name }, update: {} });
  }

  for (const name of ALLERGENS) {
    await prisma.allergen.upsert({ where: { name }, create: { name }, update: {} });
  }

  const cuisineNames = [...new Set((recipesData as RecipeSeed[]).map((r) => r.cuisine))];
  for (const name of cuisineNames) {
    const slug = slugify(name);
    await prisma.cuisine.upsert({
      where: { name },
      create: { name, slug },
      update: { slug },
    });
  }

  console.log(`Seeding ${(recipesData as RecipeSeed[]).length} recipes...`);

  for (const recipe of recipesData as RecipeSeed[]) {
    const existing = await prisma.recipe.findUnique({
      where: { slug: recipe.slug },
      select: { id: true },
    });

    if (existing) {
      // Re-seeding an existing recipe: replace ingredients/steps/food-group
      // profile wholesale (delete + recreate) so edits to the source JSON —
      // e.g. adding a mandatory side — are picked up, mirroring the admin
      // recipe-edit API's PATCH behavior.
      await prisma.$transaction([
        prisma.ingredient.deleteMany({ where: { recipeId: existing.id } }),
        prisma.step.deleteMany({ where: { recipeId: existing.id } }),
        prisma.recipeFoodGroup.deleteMany({ where: { recipeId: existing.id } }),
        prisma.recipe.update({
          where: { id: existing.id },
          data: {
            title: recipe.title,
            shortDescription: recipe.shortDescription,
            note: recipe.note,
            introCopy: recipe.introCopy,
            servings: recipe.servings,
            prepMinutes: recipe.prepMinutes,
            cookMinutes: recipe.cookMinutes,
            difficulty: recipe.difficulty,
            cuisine: { connect: { name: recipe.cuisine } },
            mealSlot: recipe.mealSlot as never,
            effortTier: recipe.effortTier,
            batchFriendly: recipe.batchFriendly,
            attributeTags: { set: recipe.attributes.map((code) => ({ code })) },
            heroColor: recipe.heroColor,
            imageUrl: recipe.imageUrl,
            imageCredit: recipe.imageCredit,
            // Deliberately not syncing allergenReviewStatus/isActive here:
            // once a recipe exists, its moderation state is owned by the
            // admin UI (verify/publish toggles), and re-running the seed
            // must not silently revert an admin's review decision.
            ingredients: { create: recipe.ingredients },
            steps: { create: recipe.steps },
            foodGroupProfile: {
              create: recipe.foodGroupProfile.map((fgp) => ({
                weight: fgp.weight,
                foodGroup: { connect: { name: fgp.foodGroup } },
              })),
            },
            dietTags: { set: recipe.dietTags.map((name) => ({ name })) },
            allergenTags: { set: recipe.allergenTags.map((name) => ({ name })) },
          },
        }),
      ]);
      continue;
    }

    await prisma.recipe.create({
      data: {
        slug: recipe.slug,
        title: recipe.title,
        shortDescription: recipe.shortDescription,
        note: recipe.note,
        introCopy: recipe.introCopy,
        servings: recipe.servings,
        prepMinutes: recipe.prepMinutes,
        cookMinutes: recipe.cookMinutes,
        difficulty: recipe.difficulty,
        cuisine: { connect: { name: recipe.cuisine } },
        mealSlot: recipe.mealSlot as never,
        effortTier: recipe.effortTier,
        batchFriendly: recipe.batchFriendly,
        attributeTags: { connect: recipe.attributes.map((code) => ({ code })) },
        heroColor: recipe.heroColor,
        imageUrl: recipe.imageUrl,
        imageCredit: recipe.imageCredit,
        allergenReviewStatus: recipe.allergenReviewStatus,
        isActive: recipe.isActive ?? true,
        ingredients: { create: recipe.ingredients },
        steps: { create: recipe.steps },
        foodGroupProfile: {
          create: recipe.foodGroupProfile.map((fgp) => ({
            weight: fgp.weight,
            foodGroup: { connect: { name: fgp.foodGroup } },
          })),
        },
        dietTags: { connect: recipe.dietTags.map((name) => ({ name })) },
        allergenTags: { connect: recipe.allergenTags.map((name) => ({ name })) },
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
