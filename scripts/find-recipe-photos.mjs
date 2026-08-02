// One-off script: finds a candidate, openly-licensed photo per recipe via the
// public Wikimedia Commons API (no API key / account required). Writes a
// manifest for review — does NOT download any image bytes itself.
// Resumable: re-running skips recipes already resolved in the manifest.
import fs from "node:fs/promises";

const recipesUrl = new URL("../prisma/seed/recipes.json", import.meta.url);
const manifestUrl = new URL("../prisma/seed/photo-manifest.json", import.meta.url);

const recipes = JSON.parse(await fs.readFile(recipesUrl));

let existing = [];
try {
  existing = JSON.parse(await fs.readFile(manifestUrl));
} catch {
  // no manifest yet
}
const existingBySlug = new Map(existing.map((r) => [r.slug, r]));

const ACCEPTABLE_LICENSES = [
  "cc0",
  "public domain",
  "cc by",
  "cc by-sa",
  "cc-by",
  "cc-by-sa",
];

function isAcceptableLicense(license) {
  if (!license) return false;
  const l = license.toLowerCase();
  return ACCEPTABLE_LICENSES.some((ok) => l.includes(ok));
}

function looksLikePhoto(title) {
  const t = title.toLowerCase();
  if (t.endsWith(".svg")) return false;
  if (/(logo|icon|map|flag|diagram|chart)/.test(t)) return false;
  return /\.(jpg|jpeg|png)$/.test(t);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJsonWithRetry(url, attempt = 1) {
  const res = await fetch(url, {
    headers: { "User-Agent": "UmamiRecipeApp/0.1 (prototype; contact: n/a)" },
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (attempt >= 6) {
      throw new Error(`non-JSON response after ${attempt} attempts: ${text.slice(0, 120)}`);
    }
    const backoffMs = 3000 * attempt;
    console.log(`  rate-limited, backing off ${backoffMs}ms (attempt ${attempt})...`);
    await sleep(backoffMs);
    return fetchJsonWithRetry(url, attempt + 1);
  }
}

async function searchCommons(query) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    query,
  )}&srnamespace=6&format=json&srlimit=6`;
  const data = await fetchJsonWithRetry(url);
  return (data.query?.search ?? []).map((r) => r.title);
}

async function getImageInfo(fileTitle) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(
    fileTitle,
  )}&prop=imageinfo&iiprop=url|extmetadata|size&format=json`;
  const data = await fetchJsonWithRetry(url);
  const pages = data.query?.pages ?? {};
  const page = Object.values(pages)[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  return {
    url: info.url,
    width: info.width,
    height: info.height,
    license: info.extmetadata?.LicenseShortName?.value ?? null,
    artist: (info.extmetadata?.Artist?.value ?? "").replace(/<[^>]+>/g, ""),
  };
}

const results = [];

for (const recipe of recipes) {
  const already = existingBySlug.get(recipe.slug);
  if (already && already.chosen) {
    results.push(already);
    console.log(`${recipe.slug.padEnd(32)} -> (cached) ${already.chosen.fileTitle}`);
    continue;
  }

  // Hand-picked overrides for recipes where generic title queries returned
  // wrong-subject or diet-inappropriate photos (e.g. "Turkey Chili" matching
  // the country Turkey; vegan/vegetarian recipes matching photos containing
  // meat or seafood).
  const QUERY_OVERRIDES = {
    "turkey-chili": ["turkey chili bowl toppings", "ground turkey chili bowl", "chili con carne minced turkey", "Turkey Chili", "chili bowl beans toppings"],
    "vegetable-green-curry": ["Thai green curry vegetables bowl", "green curry tofu vegetables plate", "Thai vegetable curry rice"],
    "vegetable-yaki-udon": ["yaki udon noodles plate", "stir fried udon vegetables plate", "vegetable yakisoba"],
    "baked-falafel-bowl": ["falafel bowl plate hummus", "falafel grain bowl", "baked falafel plate"],
    "sheet-pan-salmon-and-asparagus": ["roasted salmon asparagus", "baked salmon asparagus sheet pan", "salmon asparagus dinner"],
    "korean-beef-bowl": ["bulgogi rice bowl", "Korean beef bulgogi", "Korean beef rice bowl"],
    "baked-ziti": ["baked ziti pasta casserole close up", "baked ziti tomato sauce mozzarella", "baked ziti slice plate", "Baked Ziti", "ziti pasta bake cheese"],
    "butter-chicken": ["butter chicken curry naan", "chicken makhani curry dish", "murgh makhani plate"],
    "chicken-tinga-tacos": ["chicken tinga tacos plate", "tinga de pollo tacos", "shredded chicken tacos plate"],
    "classic-smash-burger": ["smash burger cheeseburger plate", "smashburger patty cheese", "diner cheeseburger plate"],
    "kimchi-fried-rice": ["kimchi fried rice bokkeumbap plate", "kimchi bokkeum bap fried egg", "Korean kimchi fried rice bowl"],
    "miso-glazed-salmon": ["miso glazed salmon plate", "miso salmon fillet dish", "grilled miso salmon dinner", "Miso Salmon", "salmon fillet glaze dinner plate"],
    "saag-paneer": ["saag paneer plate restaurant", "palak paneer curry dish", "saag paneer bowl"],
    "bibimbap": ["bibimbap bowl plated", "Korean bibimbap dish", "dolsot bibimbap"],
    "chicken-piccata": ["chicken piccata plate lemon capers", "chicken piccata dish", "chicken piccata pasta plate"],
    "ratatouille": ["ratatouille plate vegetables", "ratatouille dish tian", "ratatouille vegetable stew plate"],
    "chicken-enchiladas-verdes": ["enchiladas verdes plate", "green enchiladas chicken", "Mexican enchiladas salsa verde"],
    "hummus-veggie-mezze": ["mezze platter hummus vegetables", "hummus mezze plate", "Middle Eastern mezze spread"],
    "loaded-baked-potato-soup": ["Potato soup bacon", "Loaded potato soup", "Baked potato soup"],
    "buffalo-cauliflower-bites": ["cauliflower wings", "roasted cauliflower florets bowl", "buffalo cauliflower", "spicy cauliflower bites"],
    "bulgogi-lettuce-wraps": ["bulgogi lettuce wrap plate", "Korean beef lettuce wrap", "bulgogi ssam plate"],
    "gochujang-glazed-salmon": ["glazed salmon fillet plate", "gochujang salmon dish", "spicy glazed salmon dinner"],
    "greek-lemon-orzo-soup": ["Avgolemono", "Avgolemono soup", "Greek lemon soup"],
    "brazilian-shrimp-moqueca": ["moqueca shrimp stew bowl", "Brazilian fish stew coconut", "moqueca de camarao"],
    "mushroom-risotto": ["mushroom risotto plate creamy", "risotto ai funghi porcini", "creamy mushroom risotto bowl parmesan"],
    "chicken-parmesan": ["Chicken Parmesan", "Chicken parmigiana", "Chicken parmesan dish"],
    "lemon-ricotta-pasta": ["Ricotta pasta", "Pasta al limone", "Lemon pasta dish"],
    "pork-carnitas": ["carnitas tacos plate shredded pork", "pork carnitas plated dish", "carnitas de puerco tacos plate"],
    "veggie-quesadillas": ["Vegetable quesadilla", "Cheese quesadilla", "Quesadilla plate"],
    "teriyaki-chicken-donburi": ["teriyaki chicken rice bowl donburi", "chicken donburi bowl Japanese", "teriyaki chicken over rice bowl"],
    "beef-sukiyaki": ["sukiyaki hot pot Japanese", "sukiyaki nabe beef pot", "Japanese sukiyaki beef vegetables pot"],
    "tofu-katsu-curry": ["tofu katsu curry plate rice", "vegetable katsu curry rice plate", "katsu curry tofu cutlet plate"],
    "moroccan-chicken-tagine": ["chicken tagine olives preserved lemon", "Moroccan tagine dish clay pot", "chicken tagine apricot plate"],
    "beef-kebabs-with-rice": ["Beef kebab", "Beef shish kebab", "Kebab plate"],
    "vegetable-fried-rice": ["vegetable fried rice plate Chinese", "Chinese vegetable fried rice bowl", "fried rice with mixed vegetables plate"],
    "chicken-provencal": ["Poulet provencal", "Chicken provencal", "Provencal chicken tomato olives"],
    "banh-mi-sandwich": ["banh mi sandwich close up", "Vietnamese banh mi sandwich plate", "banh mi baguette sandwich pork"],
    "turkish-lamb-kebabs": ["lamb shish kebab plate grilled", "Turkish lamb kebab skewers plate", "adana kebab plate grilled"],
    "turkish-menemen": ["menemen Turkish eggs tomato pepper", "menemen tomato pepper eggs pan", "Turkish menemen skillet eggs"],
  };

  const queries = QUERY_OVERRIDES[recipe.slug] ?? [
    recipe.title,
    `${recipe.title} food`,
    `${recipe.cuisine} ${recipe.title}`,
  ];
  let candidateTitles = [];
  let chosen = null;
  let usedQuery = queries[0];

  try {
    for (const query of queries) {
      if (chosen) break;
      usedQuery = query;
      await sleep(4000); // stay well under Commons' anonymous rate limit
      candidateTitles = (await searchCommons(query)).filter(looksLikePhoto);

      for (const fileTitle of candidateTitles.slice(0, 3)) {
        await sleep(2500);
        const info = await getImageInfo(fileTitle);
        if (!info) continue;
        if (info.width < 800 || info.height < 500) continue; // avoid tiny thumbnails
        if (!isAcceptableLicense(info.license)) continue;
        chosen = { fileTitle, ...info };
        break;
      }
    }
  } catch (err) {
    console.error(`  failed for ${recipe.slug}: ${err.message}`);
  }

  const entry = {
    slug: recipe.slug,
    title: recipe.title,
    query: usedQuery,
    candidatesConsidered: candidateTitles.length,
    chosen,
  };
  results.push(entry);

  // Write incrementally so a crash mid-run doesn't lose earlier progress.
  await fs.writeFile(manifestUrl, JSON.stringify(results, null, 2));

  console.log(`${recipe.slug.padEnd(32)} -> ${chosen ? chosen.fileTitle : "NO MATCH"}`);
}

const missing = results.filter((r) => !r.chosen);
console.log(`\nDone. ${results.length - missing.length}/${results.length} matched.`);
if (missing.length) {
  console.log("No match found for:", missing.map((m) => m.slug).join(", "));
}
