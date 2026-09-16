// One-off content-ops script: adds "To complete the meal" ingredient groups
// and/or refines pairingSuggestion text for a curated list of centerpiece
// recipes across prisma/seed/*.json. Finds each recipe by slug (across all
// seed files), then:
//   - if `renameComponent` is set, renames any existing ingredient rows with
//     that exact `component` value to the reserved COMPLETE_THE_MEAL string
//   - if `mergeItemMatch` is set, finds existing no-component ingredient rows
//     whose `item` contains that substring and moves them into the group too
//   - appends any `items` entries as new ingredient rows in that group,
//     continuing the recipe's existing `order` sequence
//   - sets/overwrites `pairingSuggestion` if provided
//
// Safe to re-run: matches are done by slug + exact text, and a JSON
// parse/stringify round trip naturally validates each file's syntax.
//
// Usage: node scripts/add-complete-the-meal.mjs

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_DIR = path.join(__dirname, "..", "prisma", "seed");
const COMPLETE_THE_MEAL_COMPONENT = "To complete the meal";

/** @typedef {{ quantity: string, unit?: string|null, item: string, prepNote?: string|null, optional?: boolean }} NewItem */
/**
 * @typedef {{
 *   slug: string,
 *   renameComponent?: string,
 *   mergeItemMatch?: string,
 *   items?: NewItem[],
 *   pairingSuggestion?: string,
 * }} Entry
 */

/** @type {Entry[]} */
const entries = [
  {
    slug: "carne-asada",
    items: [
      { quantity: "12", unit: null, item: "corn tortillas", prepNote: "warmed" },
      { quantity: "2", unit: null, item: "extra limes", prepNote: "cut into wedges" },
      { quantity: "6", unit: null, item: "radishes", prepNote: "thinly sliced" },
      { quantity: "1", unit: "cup", item: "salsa of choice" },
      { quantity: "4", unit: null, item: "Mexican lagers", optional: true },
    ],
    pairingSuggestion:
      "Serve taco-style in warm tortillas with radish, salsa, and lime — pairs well with a cold Mexican lager or a glass of red wine.",
  },
  {
    slug: "brazilian-picanha",
    renameComponent: "For the sides",
    mergeItemMatch: "chimichurri",
    pairingSuggestion:
      "Pairs well with a cold beer or a caipirinha — round out the spread with extra grilled cuts for a full churrasco.",
  },
  {
    slug: "korean-fried-chicken",
    items: [
      { quantity: "1", unit: "cup", item: "pickled daikon radish (chikin-mu)" },
      { quantity: "2", unit: null, item: "scallions", prepNote: "thinly sliced, for garnish" },
      { quantity: "4", unit: null, item: "cold beers", optional: true },
    ],
  },
  {
    slug: "bulgogi-lettuce-wraps",
    items: [
      { quantity: "3", unit: "cups", item: "steamed short-grain rice" },
      { quantity: "1/2", unit: "cup", item: "kimchi" },
      { quantity: "2", unit: null, item: "scallions", prepNote: "sliced, for garnish" },
    ],
    pairingSuggestion: "Pairs well with a cold Korean lager or a glass of makgeolli.",
  },
  {
    slug: "tandoori-chicken",
    items: [
      { quantity: "4", unit: null, item: "naan breads", prepNote: "warmed" },
      { quantity: "1", unit: "cup", item: "mint-yogurt chutney" },
      {
        quantity: "1",
        unit: null,
        item: "red onion",
        prepNote: "thinly sliced with lemon, for kachumber salad",
      },
    ],
  },
  {
    slug: "turkish-lamb-kebabs",
    items: [
      { quantity: "2", unit: "cups", item: "bulgur or rice pilaf" },
      { quantity: "1", unit: "cup", item: "grilled tomatoes and peppers" },
      { quantity: "1", unit: "cup", item: "garlicky yogurt sauce (cacık)" },
    ],
    pairingSuggestion: "Pairs well with a glass of ayran or a light Turkish red.",
  },
  {
    slug: "greek-chicken-souvlaki",
    items: [
      { quantity: "2", unit: "cups", item: "Greek salad (tomato, cucumber, olives, feta)" },
      { quantity: "1", unit: "lb", item: "lemon potatoes", optional: true },
    ],
  },
  {
    slug: "suya-skewers",
    items: [
      { quantity: "4", unit: null, item: "agege bread or flatbread slices" },
      { quantity: "2", unit: "tbsp", item: "extra yaji (suya spice)", prepNote: "for dusting", optional: true },
      { quantity: "4", unit: null, item: "cold Nigerian lagers", optional: true },
    ],
    pairingSuggestion: "Pairs well with a cold Nigerian lager (Star or Gulder) and extra yaji spice on the side.",
  },
  {
    slug: "beef-rendang",
    items: [
      { quantity: "1/2", unit: "cup", item: "fried shallots", prepNote: "for garnish" },
      { quantity: "1", unit: "cup", item: "cucumber and pineapple acar (pickle)", optional: true },
      { quantity: "1", unit: "cup", item: "prawn crackers (kerupuk)", optional: true },
    ],
    pairingSuggestion: "Pairs well with a cold beer — the richness of the rendang can handle it.",
  },
  {
    slug: "chicken-satay",
    items: [
      { quantity: "12", unit: null, item: "bamboo skewers", prepNote: "soaked in water" },
      { quantity: "4", unit: null, item: "rice cakes (lontong) or steamed rice" },
      { quantity: "1", unit: "cup", item: "cucumber and shallot pickle (acar)" },
    ],
    pairingSuggestion: "Pairs well with a cold beer or iced Thai tea.",
  },
  {
    slug: "moroccan-chicken-tagine",
    items: [
      { quantity: "1", unit: "loaf", item: "crusty bread or khobz", prepNote: "for scooping" },
      { quantity: "1", unit: "pot", item: "fresh mint tea", optional: true },
    ],
    pairingSuggestion: "Pairs well with fresh mint tea or a glass of light Moroccan rosé.",
  },
  {
    slug: "lamb-kofta",
    items: [
      { quantity: "4", unit: null, item: "pita or flatbreads", prepNote: "warmed" },
      { quantity: "1", unit: "cup", item: "cucumber-yogurt sauce" },
      { quantity: "1", unit: "cup", item: "tomato and onion salad" },
    ],
  },
  {
    slug: "argentinian-asado-with-chimichurri",
    renameComponent: "For serving",
    items: [{ quantity: "1", unit: "cup", item: "ensalada criolla (tomato, onion, red wine vinegar salad)" }],
  },
  {
    slug: "puerto-rican-pernil",
    items: [
      { quantity: "2", unit: "cups", item: "tostones (fried green plantains)" },
      { quantity: "1/2", unit: "cup", item: "pique criollo (Puerto Rican hot sauce)", optional: true },
    ],
    pairingSuggestion: "Pairs well with a cold Medalla lager.",
  },
  {
    slug: "cuban-ropa-vieja",
    items: [
      { quantity: "1", unit: "cup", item: "black beans", prepNote: "cooked" },
      { quantity: "2", unit: "cups", item: "maduros (sweet fried plantains)" },
    ],
    pairingSuggestion: "Pairs well with a Cuban mojito or a cold beer.",
  },
  {
    slug: "jamaican-curry-goat",
    items: [
      { quantity: "2", unit: "cups", item: "fried ripe plantain" },
      { quantity: "4", unit: null, item: "roti or hard dough bread" },
    ],
    pairingSuggestion: "Pairs well with a cold Red Stripe.",
  },
  {
    slug: "lechona-tolimense",
    items: [{ quantity: "1", unit: "cup", item: "Colombian ají picante (tomato-cilantro hot sauce)" }],
    pairingSuggestion: "Pairs well with a cold Colombian beer (Club Colombia or Águila).",
  },
  {
    slug: "confit-de-canard",
    items: [{ quantity: "4", unit: "cups", item: "frisée salad with mustard vinaigrette" }],
    pairingSuggestion: "Pairs well with a glass of red Bordeaux or Cahors.",
  },
  {
    slug: "poulet-rôti-au-citron",
    items: [
      { quantity: "500", unit: "g", item: "green beans", prepNote: "sautéed with butter" },
      { quantity: "1", unit: null, item: "crusty baguette" },
    ],
    pairingSuggestion: "Pairs well with a chilled white Burgundy.",
  },
  {
    slug: "steak-au-poivre",
    items: [{ quantity: "4", unit: "cups", item: "simple green salad with vinaigrette" }],
  },
  {
    slug: "bistecca-fiorentina",
    items: [
      { quantity: "2", unit: "cups", item: "cannellini beans", prepNote: "dressed with olive oil (fagioli all'uccelletto)" },
      { quantity: "500", unit: "g", item: "roasted potatoes" },
    ],
  },
  {
    slug: "osso-buco-milanese",
    items: [
      { quantity: "500", unit: "g", item: "saffron risotto alla Milanese" },
      { quantity: "1", unit: null, item: "crusty bread" },
    ],
    pairingSuggestion: "Pairs well with a glass of Barolo or Barbaresco.",
  },
  {
    slug: "mole-poblano-chicken",
    items: [{ quantity: "12", unit: null, item: "warm corn tortillas" }],
  },
  {
    slug: "cochinita-pibil-yucatan",
    items: [{ quantity: "2", unit: "cups", item: "refried black beans" }],
    pairingSuggestion: "Pairs well with an ice-cold Mexican lager.",
  },
  {
    slug: "birria-de-res-consomme",
    pairingSuggestion: "Serve the consommé alongside for dipping — pairs well with an ice-cold Mexican beer.",
  },
  {
    slug: "chicken-kebabs-grilled",
    items: [
      { quantity: "2", unit: "cups", item: "fattoush salad" },
      { quantity: "1", unit: "cup", item: "pickled turnips" },
    ],
    pairingSuggestion: "Pairs well with a glass of ayran or a crisp white wine.",
  },
  {
    slug: "lamb-kofta-kebabs",
    items: [
      { quantity: "2", unit: "cups", item: "Lebanese rice pilaf with vermicelli" },
      { quantity: "1", unit: "cup", item: "grilled tomatoes and peppers" },
    ],
    pairingSuggestion: "Pairs well with a glass of ayran or a light red wine.",
  },
  {
    slug: "moroccan-lamb-tagine-with-apricots",
    items: [{ quantity: "1", unit: null, item: "warm khobz (Moroccan bread)" }],
    pairingSuggestion: "Pairs well with fresh mint tea or a glass of light red wine.",
  },
  {
    slug: "classic-moroccan-chicken-tagine-preserved-lemons",
    items: [{ quantity: "1", unit: null, item: "warm khobz (Moroccan bread)" }],
    pairingSuggestion: "Pairs well with fresh mint tea or a crisp white wine.",
  },
  {
    slug: "merguez-sausages-with-peppers",
    items: [{ quantity: "2", unit: "cups", item: "couscous salad" }],
    pairingSuggestion: "Pairs well with a cold beer or a glass of rosé.",
  },
  {
    slug: "anticuchos-de-corazon",
    items: [{ quantity: "1", unit: "cup", item: "ají verde (Peruvian green sauce)" }],
    pairingSuggestion: "Pairs well with a cold Peruvian lager (Cristal or Pilsen).",
  },
  {
    slug: "pollo-a-la-brasa",
    items: [{ quantity: "2", unit: "cups", item: "simple green salad" }],
    pairingSuggestion: "Pairs well with a cold Cristal beer or a glass of Inca Kola.",
  },
  {
    slug: "frango-piri-piri",
    items: [
      { quantity: "500", unit: "g", item: "Portuguese-style fries" },
      { quantity: "2", unit: "cups", item: "simple side salad" },
    ],
    pairingSuggestion: "Pairs well with a chilled Vinho Verde or a cold beer.",
  },
  {
    slug: "cochinillo-asado",
    items: [
      { quantity: "4", unit: "cups", item: "simple green salad" },
      { quantity: "1", unit: null, item: "crusty bread" },
    ],
    pairingSuggestion: "Pairs well with a Ribera del Duero red wine.",
  },
  {
    slug: "solomillo-al-whisky",
    items: [{ quantity: "1", unit: null, item: "crusty bread", prepNote: "for the sauce" }],
    pairingSuggestion: "Pairs well with a glass of Rioja.",
  },
  {
    slug: "asado-negro",
    items: [
      { quantity: "3", unit: "cups", item: "steamed white rice" },
      { quantity: "2", unit: "cups", item: "tajadas (fried sweet plantains)" },
      { quantity: "1", unit: "cup", item: "black beans", prepNote: "cooked" },
    ],
    pairingSuggestion: "Pairs well with a cold Venezuelan beer (Polar) or a glass of red wine.",
  },
];

const files = fs.readdirSync(SEED_DIR).filter((f) => f.endsWith(".json") && f !== "photo-manifest.json");

const remainingSlugs = new Set(entries.map((e) => e.slug));
let totalItemsAdded = 0;
let totalPairingsSet = 0;
let totalRenamed = 0;

for (const file of files) {
  const filePath = path.join(SEED_DIR, file);
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) continue;

  let changed = false;

  for (const recipe of data) {
    const entry = entries.find((e) => e.slug === recipe.slug);
    if (!entry) continue;
    remainingSlugs.delete(entry.slug);

    if (!Array.isArray(recipe.ingredients)) {
      console.warn(`  ! ${recipe.slug}: no ingredients array, skipping`);
      continue;
    }

    if (entry.renameComponent) {
      let renamedAny = false;
      for (const ing of recipe.ingredients) {
        if (ing.component === entry.renameComponent) {
          ing.component = COMPLETE_THE_MEAL_COMPONENT;
          renamedAny = true;
        }
      }
      if (renamedAny) {
        totalRenamed++;
        changed = true;
      } else {
        console.warn(`  ! ${recipe.slug}: renameComponent "${entry.renameComponent}" matched nothing`);
      }
    }

    if (entry.mergeItemMatch) {
      let mergedAny = false;
      for (const ing of recipe.ingredients) {
        if (!ing.component && ing.item?.toLowerCase().includes(entry.mergeItemMatch.toLowerCase())) {
          ing.component = COMPLETE_THE_MEAL_COMPONENT;
          mergedAny = true;
        }
      }
      if (mergedAny) changed = true;
      else console.warn(`  ! ${recipe.slug}: mergeItemMatch "${entry.mergeItemMatch}" matched nothing`);
    }

    if (entry.items?.length) {
      const maxOrder = recipe.ingredients.reduce((max, ing) => Math.max(max, ing.order ?? 0), 0);
      let nextOrder = maxOrder + 1;
      for (const item of entry.items) {
        recipe.ingredients.push({
          component: COMPLETE_THE_MEAL_COMPONENT,
          order: nextOrder++,
          quantity: item.quantity,
          unit: item.unit ?? null,
          item: item.item,
          prepNote: item.prepNote ?? null,
          optional: item.optional ?? false,
        });
        totalItemsAdded++;
      }
      changed = true;
    }

    if (entry.pairingSuggestion) {
      recipe.pairingSuggestion = entry.pairingSuggestion;
      totalPairingsSet++;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
    console.log(`Updated ${file}`);
  }
}

console.log(`\nDone. Added ${totalItemsAdded} ingredient rows, set ${totalPairingsSet} pairingSuggestions, renamed ${totalRenamed} component groups.`);
if (remainingSlugs.size) {
  console.log("NOT FOUND (check slugs):", [...remainingSlugs]);
}
