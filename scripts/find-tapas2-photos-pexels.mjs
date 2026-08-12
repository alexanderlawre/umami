// Searches the Pexels API for a good photo for each of the 30 new Spanish
// tapas recipes (prisma/seed/recipes-spanish-tapas-2.json). Writes
// scripts/tapas2-photo-manifest.json; does NOT download anything or touch
// the DB (see download-tapas2-photos-pexels.mjs for that, run only after
// manifest review). Mirrors the pattern in find-recipe-photos-pexels.mjs.
import fs from "node:fs/promises";
import recipesData from "../prisma/seed/recipes-spanish-tapas-2.json" with { type: "json" };

const API_KEY = process.env.PEXELS_API_KEY;
if (!API_KEY) throw new Error("PEXELS_API_KEY env var required");

// The recipe titles are Spanish, but Pexels' alt text is English, so a
// direct title search scores badly (or matches spuriously on words like
// "plancha"). Give each recipe an explicit plain-English search query
// describing what's actually in the photo.
const QUERY_OVERRIDES = {
  "alcachofas-a-la-plancha": "grilled baby artichokes halved",
  "gildas": "olive anchovy pepper skewer appetizer",
  "navajas-a-la-plancha": "grilled razor clams seafood",
  "almejas-a-la-marinera": "clams in white wine sauce bowl",
  "ensalada-de-naranja-y-bacalao": "orange salad with fish",
  "pimientos-rellenos-de-atun": "stuffed red peppers tuna",
  "tomates-alinados": "sliced tomato salad olive oil",
  "judias-blancas-con-almejas": "white beans with clams stew",
  "espinacas-con-garbanzos": "spinach and chickpeas stew",
  "ensalada-de-pulpo-y-patata": "octopus and potato salad",
  "bacalao-con-tomate": "fish in tomato sauce",
  "coca-de-verduras": "vegetable flatbread roasted peppers",
  "alcachofas-confitadas": "artichoke hearts in olive oil",
  "ensaladilla-de-marisco": "potato salad with shrimp and peas",
  "boquerones-a-la-plancha": "grilled fresh anchovies fish",
  "tosta-de-aguacate-y-gambas": "avocado toast with shrimp",
  "zanahorias-alinadas": "marinated carrot salad",
  "remojon-granadino": "orange salad with egg and olives",
  "champinones-rellenos": "stuffed mushrooms baked",
  "esparragos-trigueros-a-la-plancha": "grilled asparagus spears",
  "pincho-moruno": "spiced pork skewers grilled",
  "berberechos-al-natural": "steamed cockles seafood bowl",
  "tortillitas-de-camarones": "shrimp fritters crispy",
  "queso-manchego-con-membrillo": "manchego cheese with quince paste",
  "jamon-con-melon": "cured ham with melon slices",
  "ensalada-de-judias-verdes-con-almendras": "green beans with almonds",
  "vieiras-a-la-plancha": "seared scallops plate",
  "calamares-a-la-plancha": "grilled squid seafood plate",
  "rape-a-la-plancha-con-ajada": "seared white fish fillet garlic sauce",
  "habitas-con-menta": "fava beans with mint",
};

const STOPWORDS = new Set([
  "the", "a", "an", "de", "la", "el", "los", "las", "con", "and", "with",
  "style", "food", "dish", "recipe", "classic", "traditional", "of", "in",
  "al", "alla", "du", "des", "le", "les", "da", "do", "dos", "for", "a",
]);

function normalize(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function tokenize(text) {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

function buildQueries(slug, title, shortDescription) {
  const queries = [];
  if (QUERY_OVERRIDES[slug]) queries.push(QUERY_OVERRIDES[slug]);
  queries.push(shortDescription);
  queries.push(title.replace(/[()]/g, ""));
  return [...new Set(queries)];
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function searchPexels(query) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=8&orientation=landscape`;
  const res = await fetch(url, { headers: { Authorization: API_KEY } });
  if (res.status === 429) {
    console.log("  rate-limited, backing off 60s...");
    await sleep(60000);
    return searchPexels(query);
  }
  if (!res.ok) {
    console.log(`  Pexels error ${res.status} for query "${query}"`);
    return [];
  }
  const data = await res.json();
  return data.photos ?? [];
}

function scoreCandidate(titleTokens, photo) {
  const altTokens = new Set(tokenize(photo.alt ?? ""));
  const overlap = [...titleTokens].filter((t) => altTokens.has(t));
  return overlap.length;
}

const results = [];
let matched = 0;
let noMatch = 0;

for (const recipe of recipesData) {
  // Score against the English query tokens (override or shortDescription),
  // not the Spanish title — Pexels alt text is English, so matching against
  // Spanish tokens would never overlap.
  const scoreTokens = new Set(
    tokenize(QUERY_OVERRIDES[recipe.slug] ?? recipe.shortDescription),
  );
  const queries = buildQueries(recipe.slug, recipe.title, recipe.shortDescription);

  let best = null;
  let bestScore = -1;
  let bestQuery = null;

  for (const query of queries) {
    const photos = await searchPexels(query);
    for (const photo of photos) {
      const score = scoreCandidate(scoreTokens, photo);
      if (score > bestScore) {
        bestScore = score;
        best = photo;
        bestQuery = query;
      }
    }
    await sleep(1000);
    if (bestScore >= 2) break;
  }

  if (best && bestScore >= 1) {
    matched++;
    results.push({
      slug: recipe.slug,
      title: recipe.title,
      query: bestQuery,
      score: bestScore,
      chosen: {
        id: best.id,
        alt: best.alt,
        photographer: best.photographer,
        photographerUrl: best.photographer_url,
        pexelsUrl: best.url,
        src: best.src.large,
        width: best.width,
        height: best.height,
      },
    });
    console.log(`${recipe.slug.padEnd(45)} score=${bestScore} "${best.alt}"`);
  } else {
    noMatch++;
    results.push({ slug: recipe.slug, title: recipe.title, chosen: null });
    console.log(`${recipe.slug.padEnd(45)} NO GOOD MATCH`);
  }
}

await fs.writeFile(
  new URL("./tapas2-photo-manifest.json", import.meta.url),
  JSON.stringify(results, null, 2) + "\n",
);

console.log(`\nDone. ${recipesData.length} recipes processed. Matched: ${matched}, no match: ${noMatch}.`);
