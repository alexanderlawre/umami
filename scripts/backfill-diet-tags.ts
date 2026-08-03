// Heuristic backfill for diet tags that have sparse or zero coverage across
// the 118 seeded recipes (Kosher, Low-sodium, Diabetic-friendly, Flexitarian,
// plus a modest expansion of Keto and Whole30). This script is a one-time,
// re-runnable pass over `prisma/seed/recipes.json` (the source of truth for
// the seed data) — it only ever *adds* diet tags a recipe doesn't already
// have; it never removes an existing (presumably hand-curated) tag.
//
// IMPORTANT CAVEAT: these heuristics work off ingredient-name substring
// matching and existing `attributes` flags. They are a reasonable proxy for
// app-level filtering, not a certification. In particular the "Kosher"
// heuristic only checks for the presence of pork/shellfish ingredients and
// meat+dairy mixing — it does not (and cannot, from this data) verify kosher
// slaughter, ingredient-level certification, or Passover rules. Treat it the
// same way the app already treats other editorial diet tags: a helpful
// filter, not a guarantee.
//
// Usage: npx tsx scripts/backfill-diet-tags.ts [--write]
//   Without --write, prints a dry-run report of how many recipes would gain
//   each tag. With --write, updates prisma/seed/recipes.json in place — run
//   `npm run db:seed` afterwards to apply to the database.

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const RECIPES_PATH = join(__dirname, "..", "prisma", "seed", "recipes.json");

type IngredientSeed = { item: string };
type RecipeSeed = {
  slug: string;
  attributes: string[];
  dietTags: string[];
  ingredients: IngredientSeed[];
};

function loadRecipes(): RecipeSeed[] {
  return JSON.parse(readFileSync(RECIPES_PATH, "utf-8"));
}

function itemText(recipe: RecipeSeed): string[] {
  return recipe.ingredients.map((i) => i.item.toLowerCase());
}

function containsAny(items: string[], terms: string[]): boolean {
  return items.some((item) => terms.some((term) => item.includes(term)));
}

const PORK_TERMS = ["pork", "bacon", "ham", "prosciutto", "pepperoni", "smoked sausage"];
const SHELLFISH_TERMS = [
  "shrimp",
  "crab",
  "lobster",
  "scallop",
  "clam",
  "mussel",
  "oyster",
  "calamari",
  "squid",
];
const MEAT_TERMS = [
  "beef",
  "chicken",
  "lamb",
  "turkey",
  "pork",
  "ham",
  "bacon",
  "sausage",
  "steak",
  "veal",
];
const DAIRY_TERMS = [
  "cheese",
  "milk",
  "cream",
  "butter",
  "yogurt",
  "paneer",
  "ricotta",
  "mozzarella",
  "parmesan",
  "feta",
  "cotija",
  "gruyere",
  "monterey jack",
  "cheddar",
  "tzatziki",
];
// Ghee (clarified butter, no milk solids) is treated separately — it's
// dairy-derived but commonly used in South Asian cooking and, notably, is
// Whole30-compliant, so it's excluded from the general DAIRY_TERMS list used
// for the low-sodium/diabetic heuristics but handled explicitly below.

const HIGH_SODIUM_TERMS = [
  "soy sauce",
  "tamari",
  "fish sauce",
  "oyster sauce",
  "miso",
  "kimchi",
  "olives",
  "capers",
  "anchovy",
  "bacon",
  "ham",
  "smoked sausage",
  "pickles",
  "pickled",
  "parmesan",
  "feta",
  "cotija",
  "blue cheese",
  "gruyere",
  "ketchup",
  "bbq sauce",
  "buffalo sauce",
  "gochujang",
  "doubanjiang",
  "ssamjang",
  "sambal",
  "curry paste",
  "curry roux",
  "broth",
  "stock",
];

const SUGARY_TERMS = [
  "sugar",
  "honey",
  "ketchup",
  "bbq sauce",
  "hoisin",
  "kecap manis",
];

const REFINED_CARB_TERMS = [
  "bread",
  "baguette",
  "brioche",
  "pie crust",
  "phyllo",
  "tortilla",
  "pita",
  "breadcrumbs",
  "panko",
];

const GRAIN_TERMS = [
  "rice",
  "pasta",
  "noodle",
  "bread",
  "baguette",
  "brioche",
  "tortilla",
  "pita",
  "flatbread",
  "dumpling wrapper",
  "spring roll wrapper",
  "phyllo",
  "pie crust",
  "breadcrumbs",
  "panko",
  "oats",
  "corn",
  "cornstarch",
  "elbow macaroni",
  "spaghetti",
  "ziti",
  "orzo",
  "couscous",
  "bulgur",
];

const LEGUME_TERMS = [
  "beans",
  "lentils",
  "chickpeas",
  "hominy",
  "peanut",
  "tofu",
  "soy",
];

const HIGH_CARB_PRODUCE_TERMS = [
  "potato",
  "mango",
  "pineapple",
  "orange",
  "pear",
  "plantain flour",
  "cassava flour",
  "tapioca",
  "potato starch",
];

const ALCOHOL_TERMS = ["wine", "mirin"];

function isFlexitarian(r: RecipeSeed): boolean {
  if (
    r.dietTags.includes("Vegetarian") ||
    r.dietTags.includes("Vegan") ||
    r.dietTags.includes("Pescatarian")
  ) {
    return true;
  }
  return r.attributes.includes("EAT_MORE_VEG");
}

function isLowSodium(r: RecipeSeed): boolean {
  const items = itemText(r);
  if (r.attributes.includes("FRIED")) return false;
  return !containsAny(items, HIGH_SODIUM_TERMS);
}

function isDiabeticFriendly(r: RecipeSeed): boolean {
  const items = itemText(r);
  const hasQualifyingAttribute =
    r.attributes.includes("HIGH_PROTEIN") ||
    r.attributes.includes("HIGH_FIBER") ||
    r.attributes.includes("LOW_CARB");
  if (!hasQualifyingAttribute) return false;
  if (containsAny(items, SUGARY_TERMS)) return false;
  if (containsAny(items, REFINED_CARB_TERMS)) return false;
  return true;
}

function isKosher(r: RecipeSeed): boolean {
  const items = itemText(r);
  if (containsAny(items, PORK_TERMS)) return false;
  if (containsAny(items, SHELLFISH_TERMS)) return false;
  const hasMeat = containsAny(items, MEAT_TERMS);
  const hasDairy = containsAny(items, DAIRY_TERMS);
  if (hasMeat && hasDairy) return false;
  return true;
}

function isKeto(r: RecipeSeed): boolean {
  const items = itemText(r);
  if (containsAny(items, GRAIN_TERMS)) return false;
  if (containsAny(items, LEGUME_TERMS)) return false;
  if (containsAny(items, SUGARY_TERMS)) return false;
  if (containsAny(items, HIGH_CARB_PRODUCE_TERMS)) return false;
  return r.attributes.includes("LOW_CARB") || r.dietTags.includes("Low-carb");
}

function isWhole30(r: RecipeSeed): boolean {
  const items = itemText(r);
  // Ghee is Whole30-compliant, so drop it before checking the dairy list.
  const nonGheeItems = items.filter((i) => !i.includes("ghee"));
  if (containsAny(nonGheeItems, DAIRY_TERMS)) return false;
  if (containsAny(items, GRAIN_TERMS)) return false;
  if (containsAny(items, LEGUME_TERMS)) return false;
  if (containsAny(items, SUGARY_TERMS)) return false;
  if (containsAny(items, ALCOHOL_TERMS)) return false;
  return true;
}

const HEURISTICS: { name: string; test: (r: RecipeSeed) => boolean }[] = [
  { name: "Flexitarian", test: isFlexitarian },
  { name: "Low-sodium", test: isLowSodium },
  { name: "Diabetic-friendly", test: isDiabeticFriendly },
  { name: "Kosher", test: isKosher },
  { name: "Keto", test: isKeto },
  { name: "Whole30", test: isWhole30 },
];

function main() {
  const write = process.argv.includes("--write");
  const recipes = loadRecipes();

  const before = new Map<string, number>();
  const after = new Map<string, number>();
  const added = new Map<string, number>();
  for (const { name } of HEURISTICS) {
    before.set(name, recipes.filter((r) => r.dietTags.includes(name)).length);
    added.set(name, 0);
  }

  for (const recipe of recipes) {
    for (const { name, test } of HEURISTICS) {
      if (recipe.dietTags.includes(name)) continue;
      if (test(recipe)) {
        recipe.dietTags.push(name);
        added.set(name, (added.get(name) ?? 0) + 1);
      }
    }
  }

  for (const { name } of HEURISTICS) {
    after.set(
      name,
      recipes.filter((r) => r.dietTags.includes(name)).length,
    );
  }

  console.log(`${write ? "Applying" : "Dry run — would apply"} diet-tag backfill:\n`);
  for (const { name } of HEURISTICS) {
    console.log(
      `  ${name.padEnd(20)} ${before.get(name)} -> ${after.get(name)} (+${added.get(name)})`,
    );
  }

  if (write) {
    writeFileSync(RECIPES_PATH, JSON.stringify(recipes, null, 2) + "\n");
    console.log(`\nWrote ${RECIPES_PATH}. Run \`npm run db:seed\` to apply to the database.`);
  } else {
    console.log("\nRe-run with --write to persist these changes to recipes.json.");
  }
}

main();
