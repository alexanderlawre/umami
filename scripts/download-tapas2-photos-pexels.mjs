// Downloads the chosen Pexels photo for each entry in
// scripts/tapas2-photo-manifest.json into public/recipe-photos/<slug>.jpg
// and writes imageUrl + imageCredit directly to the matching Recipe row in
// the database. Mirrors download-recipe-photos-pexels.mjs.
import fs from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const manifestUrl = new URL("./tapas2-photo-manifest.json", import.meta.url);
const outDir = new URL("../public/recipe-photos/", import.meta.url);
await fs.mkdir(outDir, { recursive: true });

const manifest = JSON.parse(await fs.readFile(manifestUrl, "utf8"));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, attempt = 1) {
  const res = await fetch(url);
  if (res.status === 429 || res.status === 503) {
    if (attempt >= 6) throw new Error(`HTTP ${res.status} after ${attempt} attempts`);
    const backoffMs = 5000 * attempt;
    console.log(`  rate-limited (${res.status}), backing off ${backoffMs}ms (attempt ${attempt})...`);
    await sleep(backoffMs);
    return fetchWithRetry(url, attempt + 1);
  }
  return res;
}

let downloaded = 0;
let failed = 0;
let skipped = 0;

for (const entry of manifest) {
  if (!entry.chosen) {
    skipped++;
    continue;
  }

  const filename = `${entry.slug}.jpg`;
  const outPath = new URL(filename, outDir);
  const imageUrl = `/recipe-photos/${filename}`;
  const imageCredit = `Photo by ${entry.chosen.photographer} / Pexels`;

  try {
    const res = await fetchWithRetry(entry.chosen.src);
    if (!res.ok) {
      console.log(`${entry.slug.padEnd(45)} FAILED (${res.status})`);
      failed++;
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(outPath, buf);

    await prisma.recipe.update({ where: { slug: entry.slug }, data: { imageUrl, imageCredit } });

    downloaded++;
    console.log(`${entry.slug.padEnd(45)} -> ${filename} (${(buf.length / 1024).toFixed(0)} KB)`);
  } catch (err) {
    if (err.code === "P2025") {
      console.log(`${entry.slug.padEnd(45)} SKIP (not in this DB)`);
      skipped++;
    } else {
      console.log(`${entry.slug.padEnd(45)} FAILED (${err.message})`);
      failed++;
    }
  }

  await sleep(300);
}

await prisma.$disconnect();
console.log(`\nDone. Downloaded/updated ${downloaded}, skipped ${skipped}, failed ${failed} (of ${manifest.length} total).`);
