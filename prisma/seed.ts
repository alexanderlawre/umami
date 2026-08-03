import { PrismaClient } from "@prisma/client";
import { FOOD_GROUPS, DIETS, ALLERGENS } from "./seed/reference";
import recipesData from "./seed/recipes.json";
import { slugify } from "../src/lib/slugify";

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
    await prisma.recipe.upsert({
      where: { slug: recipe.slug },
      create: {
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
        attributes: recipe.attributes,
        heroColor: recipe.heroColor,
        imageUrl: recipe.imageUrl,
        imageCredit: recipe.imageCredit,
        allergenReviewStatus: recipe.allergenReviewStatus,
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
      update: {
        imageUrl: recipe.imageUrl,
        imageCredit: recipe.imageCredit,
        dietTags: { set: recipe.dietTags.map((name) => ({ name })) },
        allergenTags: { set: recipe.allergenTags.map((name) => ({ name })) },
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
