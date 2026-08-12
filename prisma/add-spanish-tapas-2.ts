// Standalone, idempotent script to add 30 new Spanish tapas recipes.
// Kept separate from prisma/seed.ts / recipes.json so it can be run
// independently without touching the existing seed data.
//
// Run with: npx tsx prisma/add-spanish-tapas-2.ts

import { PrismaClient } from "@prisma/client";
import { slugify } from "../src/lib/slugify";
import recipesData from "./seed/recipes-spanish-tapas-2.json";

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
  mealSlot: "BREAKFAST" | "TAPAS" | "LUNCH" | "DINNER";
  effortTier: "WEEKNIGHT" | "WEEKEND" | "PROJECT";
  batchFriendly: boolean;
  attributes: string[];
  heroColor: string;
  imageUrl?: string;
  imageCredit?: string;
  allergenReviewStatus: "UNVERIFIED" | "VERIFIED";
  caloriesPerServing?: number | null;
  proteinGrams?: number | null;
  carbsGrams?: number | null;
  fatGrams?: number | null;
  fiberGrams?: number | null;
  cholesterolMg?: number | null;
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

const recipes = recipesData as RecipeSeed[];

async function main() {
  const cuisineNames = [...new Set(recipes.map((r) => r.cuisine))];
  console.log(`Ensuring ${cuisineNames.length} cuisines exist...`);
  for (const name of cuisineNames) {
    const slug = slugify(name);
    await prisma.cuisine.upsert({
      where: { name },
      create: { name, slug },
      update: {},
    });
  }

  console.log(`Seeding ${recipes.length} Spanish tapas recipes...`);

  for (const recipe of recipes) {
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
        mealSlot: recipe.mealSlot,
        effortTier: recipe.effortTier,
        batchFriendly: recipe.batchFriendly,
        attributeTags: { connect: recipe.attributes.map((code) => ({ code })) },
        heroColor: recipe.heroColor,
        imageUrl: recipe.imageUrl,
        imageCredit: recipe.imageCredit,
        allergenReviewStatus: recipe.allergenReviewStatus,
        caloriesPerServing: recipe.caloriesPerServing ?? null,
        proteinGrams: recipe.proteinGrams ?? null,
        carbsGrams: recipe.carbsGrams ?? null,
        fatGrams: recipe.fatGrams ?? null,
        fiberGrams: recipe.fiberGrams ?? null,
        cholesterolMg: recipe.cholesterolMg ?? null,
        isActive: true,
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
        mealSlot: recipe.mealSlot,
        caloriesPerServing: recipe.caloriesPerServing ?? null,
        proteinGrams: recipe.proteinGrams ?? null,
        carbsGrams: recipe.carbsGrams ?? null,
        fatGrams: recipe.fatGrams ?? null,
        fiberGrams: recipe.fiberGrams ?? null,
        cholesterolMg: recipe.cholesterolMg ?? null,
        isActive: true,
        dietTags: { set: recipe.dietTags.map((name) => ({ name })) },
        allergenTags: { set: recipe.allergenTags.map((name) => ({ name })) },
        attributeTags: { set: recipe.attributes.map((code) => ({ code })) },
      },
    });
  }

  console.log("Spanish tapas batch complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
