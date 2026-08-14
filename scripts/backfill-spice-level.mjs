// One-off script: seeds Recipe.spiceLevel (0-3) for every existing recipe
// from its already-tagged "Chilli & heat" RecipeFoodGroup weight (0-100),
// rather than guessing from scratch or requiring a new LLM pass. Recipes
// with no "Chilli & heat" row are left untouched (spiceLevel stays null),
// which UserPreferences.spiceMax's filter already treats as unfiltered —
// matches the product decision to leave genuinely-unknown recipes alone
// instead of assuming a heat level for them.
//
// Every row this script writes is flagged spiceLevelInferred: true so it
// can be distinguished later from a reviewed/authored value (e.g. for an
// admin queue that surfaces inferred rows for manual confirmation).
//
// Bucketing (0-100 weight -> 0-3 spice level):
//   weight <  15  -> 0 (no meaningful chilli/heat presence)
//   weight <  40  -> 1 (mild)
//   weight <  70  -> 2 (medium)
//   weight >= 70  -> 3 (hot)
//
// Read + write, but scoped to a single FoodGroup lookup and direct
// Recipe.spiceLevel writes — no external calls, no manifest/review step
// needed (unlike estimate-recipe-nutrition.mjs, this reuses data that's
// already been curated as RecipeFoodGroup weights rather than estimating
// anything new).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function bucketSpiceLevel(weight) {
  if (weight < 15) return 0;
  if (weight < 40) return 1;
  if (weight < 70) return 2;
  return 3;
}

async function main() {
  const chilliGroup = await prisma.foodGroup.findUnique({
    where: { name: "Chilli & heat" },
  });

  if (!chilliGroup) {
    console.error('FoodGroup "Chilli & heat" not found — nothing to backfill.');
    process.exit(1);
  }

  const rows = await prisma.recipeFoodGroup.findMany({
    where: { foodGroupId: chilliGroup.id },
    select: { recipeId: true, weight: true },
  });

  console.log(`Found ${rows.length} recipes with a "Chilli & heat" weight.`);

  let updated = 0;
  for (const row of rows) {
    const spiceLevel = bucketSpiceLevel(row.weight);
    await prisma.recipe.update({
      where: { id: row.recipeId },
      data: { spiceLevel, spiceLevelInferred: true },
    });
    updated++;
  }

  const totalRecipes = await prisma.recipe.count();
  console.log(
    `Backfilled spiceLevel for ${updated} recipes (inferred). ` +
      `${totalRecipes - updated} recipes have no "Chilli & heat" tag and remain null (unfiltered).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
