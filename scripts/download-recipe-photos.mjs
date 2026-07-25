// Downloads the chosen photo for each recipe (from prisma/seed/photo-manifest.json)
// into public/recipe-photos/<slug>.<ext>, requesting a resized ~1200px-wide
// version from Wikimedia Commons (not the full-resolution original) to keep
// the app lightweight on mobile. Also updates prisma/seed/recipes.json with
// imageUrl + imageCredit for each recipe so a fresh `prisma/seed.ts` run
// carries photos too.
import fs from "node:fs/promises";
import path from "node:path";

const manifestUrl = new URL("../prisma/seed/photo-manifest.json", import.meta.url);
const recipesUrl = new URL("../prisma/seed/recipes.json", import.meta.url);
const outDir = new URL("../public/recipe-photos/", import.meta.url);

await fs.mkdir(outDir, { recursive: true });

const manifest = JSON.parse(await fs.readFile(manifestUrl));
const recipes = JSON.parse(await fs.readFile(recipesUrl));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, attempt = 1) {
  const res = await fetch(url, {
    headers: { "User-Agent": "UmamiRecipeApp/0.1 (prototype; contact: n/a)" },
  });
  if (res.status === 429 || res.status === 503) {
    if (attempt >= 6) throw new Error(`HTTP ${res.status} after ${attempt} attempts`);
    const backoffMs = 4000 * attempt;
    console.log(`  rate-limited (${res.status}), backing off ${backoffMs}ms (attempt ${attempt})...`);
    await sleep(backoffMs);
    return fetchWithRetry(url, attempt + 1);
  }
  return res;
}

async function fetchJsonWithRetry(url, attempt = 1) {
  const res = await fetchWithRetry(url);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (attempt >= 6) {
      throw new Error(`non-JSON response after ${attempt} attempts: ${text.slice(0, 120)}`);
    }
    const backoffMs = 4000 * attempt;
    console.log(`  rate-limited, backing off ${backoffMs}ms (attempt ${attempt})...`);
    await sleep(backoffMs);
    return fetchJsonWithRetry(url, attempt + 1);
  }
}

async function getThumbUrl(fileTitle) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(
    fileTitle,
  )}&prop=imageinfo&iiprop=url&iiurlwidth=1200&format=json`;
  const data = await fetchJsonWithRetry(url);
  const pages = data.query?.pages ?? {};
  const page = Object.values(pages)[0];
  const info = page?.imageinfo?.[0];
  return info?.thumburl ?? info?.url;
}

function cleanArtist(artist) {
  const stripped = (artist ?? "").replace(/\s+/g, " ").trim();
  return stripped || "Wikimedia Commons contributor";
}

let downloaded = 0;
for (const entry of manifest) {
  if (!entry.chosen) {
    console.log(`${entry.slug.padEnd(32)} SKIP (no chosen photo)`);
    continue;
  }

  const ext = path.extname(entry.chosen.fileTitle).toLowerCase() || ".jpg";
  const filename = `${entry.slug}${ext}`;
  const outPath = new URL(filename, outDir);

  const alreadyOnDisk = await fs.stat(outPath).then(() => true).catch(() => false);
  const recipe = recipes.find((r) => r.slug === entry.slug);
  if (alreadyOnDisk) {
    if (recipe && !recipe.imageUrl) {
      recipe.imageUrl = `/recipe-photos/${filename}`;
      recipe.imageCredit = `${cleanArtist(entry.chosen.artist)} / Wikimedia Commons (${entry.chosen.license})`;
    }
    downloaded++;
    console.log(`${entry.slug.padEnd(32)} (cached on disk) ${filename}`);
    continue;
  }

  try {
    const thumbUrl = await getThumbUrl(entry.chosen.fileTitle);
    if (!thumbUrl) {
      console.log(`${entry.slug.padEnd(32)} FAILED (no thumb url)`);
      continue;
    }

    await sleep(1500);
    const imgRes = await fetchWithRetry(thumbUrl);
    if (!imgRes.ok) {
      console.log(`${entry.slug.padEnd(32)} FAILED (${imgRes.status})`);
      continue;
    }
    const buf = Buffer.from(await imgRes.arrayBuffer());
    await fs.writeFile(outPath, buf);

    if (recipe) {
      recipe.imageUrl = `/recipe-photos/${filename}`;
      recipe.imageCredit = `${cleanArtist(entry.chosen.artist)} / Wikimedia Commons (${entry.chosen.license})`;
    }

    downloaded++;
    console.log(`${entry.slug.padEnd(32)} -> ${filename} (${(buf.length / 1024).toFixed(0)} KB)`);
  } catch (err) {
    console.log(`${entry.slug.padEnd(32)} FAILED (${err.message})`);
  }

  // Write incrementally so a crash/rate-limit mid-run doesn't lose earlier progress.
  await fs.writeFile(recipesUrl, JSON.stringify(recipes, null, 2) + "\n");
  await sleep(3000);
}

await fs.writeFile(recipesUrl, JSON.stringify(recipes, null, 2) + "\n");
console.log(`\nDone. Downloaded ${downloaded}/${manifest.length} photos.`);
