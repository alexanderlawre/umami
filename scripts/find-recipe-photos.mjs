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
    "turkey-chili": ["turkey chili bowl", "chili con carne minced turkey", "ground turkey chili stew"],
    "vegetable-green-curry": ["Thai green curry vegetables", "green curry tofu vegetables", "Thai vegetable curry"],
    "vegetable-yaki-udon": ["vegetable yakisoba", "yaki udon vegetables stir fry", "stir fried udon noodles vegetables"],
    "baked-falafel-bowl": ["falafel bowl", "baked falafel", "falafel plate"],
    "sheet-pan-salmon-and-asparagus": ["roasted salmon asparagus", "baked salmon asparagus sheet pan", "salmon asparagus dinner"],
    "korean-beef-bowl": ["bulgogi rice bowl", "Korean beef bulgogi", "Korean beef rice bowl"],
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
