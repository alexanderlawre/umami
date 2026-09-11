// Generates the umami brand mark (a stylized "u" with a leaf sprouting from
// its right stroke) and derived assets: standalone mark PNGs/SVG, a
// "umami" wordmark that uses the mark as its initial letter, app-icon-style
// covers, and a single presentation sheet for reference. Re-run any time
// colors/sizes need to change: `node scripts/generate-brand-assets.mjs`.
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SVG_DIR = path.join(ROOT, "public/brand/svg");
const PNG_DIR = path.join(ROOT, "public/brand/png");

const COLORS = {
  green: "#1B4332",
  black: "#1A1D1B",
  white: "#FFFFFF",
};

// ---- The glyph -------------------------------------------------------
// A thick rounded stroke forms the "u" body. The leaf shares the same
// fill color and overlaps the stem's round cap so the two merge into one
// continuous shape, then a thin evenodd "vein" is cut through the leaf so
// it reads as foliage rather than a blade.
function glyphMarkup(color) {
  return `
    <path d="M30 24 L30 60 C30 75 41 83 52 83 C63 83 71 76 71 61 L71 28"
          fill="none" stroke="${color}" stroke-width="15"
          stroke-linecap="round" stroke-linejoin="round" />
    <path fill-rule="evenodd" fill="${color}" d="
      M67 23
      C74 12 85 4 96 0
      C90 10 82 20 76 30
      Z
      M70 22
      C78 14 86 8 93 2
      C89 6 80 13 72 20
      Z
    " />
  `;
}

const GLYPH_VIEWBOX = "-5 -10 110 110";

function glyphSvg(color, canvasSize = 800) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize}" height="${canvasSize}" viewBox="${GLYPH_VIEWBOX}">${glyphMarkup(color)}</svg>`;
}

// ---- The wordmark ------------------------------------------------------
// The glyph followed by "mami" set in a bold serif, echoing the app's own
// headline font (Bitter) with a safe system fallback so rendering doesn't
// depend on a font being installed on this machine.
//
// Glyph and text are measured (via a one-off sharp trim()-offset calibration
// script, since discarded) in their own native coordinate systems, then the
// glyph is scaled/translated
// so its baseline (bottom of the "u") lands on the text baseline and its
// height roughly matches the text's cap-height (dot-of-i to baseline), so
// the leaf tip sits level with the "i" dot instead of towering over it.
const GLYPH = { left: 22.5, bottom: 90.5, height: 90.5 };
const TEXT_FONT_SIZE = 300;
const TEXT_CAP_HEIGHT = 232; // measured at font-size 300
const TEXT_BASELINE_Y = 400;

function wordmarkSvg(color) {
  const scale = TEXT_CAP_HEIGHT / GLYPH.height;
  const marginLeft = 20;
  const tx = marginLeft - GLYPH.left * scale;
  const ty = TEXT_BASELINE_Y - GLYPH.bottom * scale;
  const glyphRight = 96 * scale + tx;
  const textX = glyphRight + 40;
  const canvasWidth = textX + 900;
  const canvasHeight = TEXT_BASELINE_Y + 120;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">
    <g transform="translate(${tx},${ty}) scale(${scale})">${glyphMarkup(color)}</g>
    <text x="${textX}" y="${TEXT_BASELINE_Y}" font-family="Bitter, Georgia, 'Times New Roman', serif" font-weight="700"
          font-size="${TEXT_FONT_SIZE}" letter-spacing="-6" fill="${color}">mami</text>
  </svg>`;
}

// ---- Render helpers ------------------------------------------------------
async function renderTrimmed(svg) {
  return sharp(Buffer.from(svg)).png().trim({ threshold: 8 }).toBuffer();
}

async function exportTransparentPng(svg, size, outPath) {
  const trimmed = await renderTrimmed(svg);
  const meta = await sharp(trimmed).metadata();
  const pad = Math.round(size * 0.08);
  const box = size - pad * 2;
  const scaleFactor = Math.min(box / meta.width, box / meta.height);
  const resized = await sharp(trimmed)
    .resize(Math.round(meta.width * scaleFactor), Math.round(meta.height * scaleFactor))
    .toBuffer();
  const resizedMeta = await sharp(resized).metadata();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: resized,
        left: Math.round((size - resizedMeta.width) / 2),
        top: Math.round((size - resizedMeta.height) / 2),
      },
    ])
    .png()
    .toFile(outPath);
}

async function exportTransparentPngRect(svg, targetWidth, outPath) {
  const trimmed = await renderTrimmed(svg);
  const meta = await sharp(trimmed).metadata();
  const scaleFactor = targetWidth / meta.width;
  const targetHeight = Math.round(meta.height * scaleFactor);
  await sharp(trimmed).resize(targetWidth, targetHeight).png().toFile(outPath);
  return { width: targetWidth, height: targetHeight };
}

// A square "app icon" style cover: mark centered on a solid background,
// full-bleed (the OS applies its own corner mask on top of this).
async function exportIconCover({ markColor, bgColor, size, outPath, markScale = 0.56 }) {
  const trimmed = await renderTrimmed(glyphSvg(markColor));
  const meta = await sharp(trimmed).metadata();
  const box = Math.round(size * markScale);
  const scaleFactor = Math.min(box / meta.width, box / meta.height);
  const resized = await sharp(trimmed)
    .resize(Math.round(meta.width * scaleFactor), Math.round(meta.height * scaleFactor))
    .toBuffer();
  const resizedMeta = await sharp(resized).metadata();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: bgColor,
    },
  })
    .composite([
      {
        input: resized,
        left: Math.round((size - resizedMeta.width) / 2),
        top: Math.round((size - resizedMeta.height) / 2),
      },
    ])
    .png()
    .toFile(outPath);
}

function hexToRgb(hex) {
  const n = hex.replace("#", "");
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

// ---- Presentation sheet ---------------------------------------------------
// A single reference PNG assembling every variant on labeled cards, for
// sharing with designers/stakeholders. Built entirely by compositing the
// already-exported PNGs (read back from disk) plus small SVG-rendered text
// labels and card backgrounds.
async function renderLabel(text, { size = 28, color = "#6B7370", weight = 600 } = {}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="80">
    <text x="0" y="55" font-family="Work Sans, Helvetica, Arial, sans-serif" font-weight="${weight}"
          font-size="${size}" letter-spacing="0.5" fill="${color}">${text}</text>
  </svg>`;
  return renderTrimmed(svg);
}

async function roundedRect(width, height, color, radius = 24) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="${color}" />
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// A card is a rounded-rect background with an image centered in it, plus an
// optional 1px hairline border (useful for the white card, which would
// otherwise disappear against the sheet's own white background).
async function buildCard({ cardW, cardH, bg, border, contentPath, contentBox, contentRadius }) {
  const layers = [{ input: await roundedRect(cardW, cardH, bg), left: 0, top: 0 }];
  if (border) {
    const borderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cardW}" height="${cardH}">
      <rect x="0.75" y="0.75" width="${cardW - 1.5}" height="${cardH - 1.5}" rx="24" ry="24"
            fill="none" stroke="${border}" stroke-width="1.5" />
    </svg>`;
    layers.push({ input: await sharp(Buffer.from(borderSvg)).png().toBuffer(), left: 0, top: 0 });
  }
  let content = await sharp(contentPath).resize({
    width: contentBox,
    height: contentBox,
    fit: "inside",
  }).toBuffer();
  // For opaque full-bleed assets (app icon covers), mask rounded corners so
  // the square icon boundary reads clearly as an "icon", and drop a subtle
  // shadow beneath it so it lifts off the card background.
  if (contentRadius) {
    const contentMeta0 = await sharp(content).metadata();
    const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${contentMeta0.width}" height="${contentMeta0.height}">
      <rect x="0" y="0" width="${contentMeta0.width}" height="${contentMeta0.height}" rx="${contentRadius}" ry="${contentRadius}" fill="#fff" />
    </svg>`;
    const mask = await sharp(Buffer.from(maskSvg)).png().toBuffer();
    content = await sharp(content).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
    const shadowSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${contentMeta0.width}" height="${contentMeta0.height}">
      <rect x="6" y="10" width="${contentMeta0.width - 12}" height="${contentMeta0.height - 12}" rx="${contentRadius}" ry="${contentRadius}" fill="#000000" opacity="0.18" />
    </svg>`;
    const shadow = await sharp(Buffer.from(shadowSvg)).blur(10).png().toBuffer();
    layers.push({
      input: shadow,
      left: Math.round((cardW - contentMeta0.width) / 2),
      top: Math.round((cardH - contentMeta0.height) / 2),
    });
  }
  const contentMeta = await sharp(content).metadata();
  layers.push({
    input: content,
    left: Math.round((cardW - contentMeta.width) / 2),
    top: Math.round((cardH - contentMeta.height) / 2),
  });
  return sharp({
    create: { width: cardW, height: cardH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(layers)
    .png()
    .toBuffer();
}

async function buildLabeledCard({ cardW, labelH, gap = 16, label, ...cardOpts }) {
  const cardH = cardOpts.cardH;
  const labelPng = await renderLabel(label);
  const labelMeta = await sharp(labelPng).metadata();
  const labelScale = Math.min(1, (cardW - 8) / labelMeta.width, (labelH - 8) / labelMeta.height);
  const resizedLabel = await sharp(labelPng)
    .resize(Math.round(labelMeta.width * labelScale), Math.round(labelMeta.height * labelScale))
    .toBuffer();
  const resizedLabelMeta = await sharp(resizedLabel).metadata();
  const card = await buildCard({ cardW, ...cardOpts });
  const totalH = cardH + gap + labelH;
  return sharp({
    create: { width: cardW, height: totalH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: card, left: 0, top: 0 },
      {
        input: resizedLabel,
        left: Math.round((cardW - resizedLabelMeta.width) / 2),
        top: cardH + gap,
      },
    ])
    .png()
    .toBuffer();
}

async function buildPresentationSheet() {
  const MARGIN = 80;
  const GAP = 48;
  const CARD_W = 420;
  const CARD_H = 300;
  const LABEL_H = 40;
  const ROW_H = CARD_H + 16 + LABEL_H;

  const wordmarkCardW = CARD_W * 2 + GAP;

  const wordmarkCards = await Promise.all([
    buildLabeledCard({
      cardW: wordmarkCardW,
      cardH: CARD_H,
      labelH: LABEL_H,
      label: "Wordmark — green on white",
      bg: "#FFFFFF",
      border: "#E8E6E0",
      contentPath: path.join(PNG_DIR, "wordmark-green.png"),
      contentBox: Math.round(wordmarkCardW * 0.8),
    }),
    buildLabeledCard({
      cardW: wordmarkCardW,
      cardH: CARD_H,
      labelH: LABEL_H,
      label: "Wordmark — white on black",
      bg: "#1A1D1B",
      contentPath: path.join(PNG_DIR, "wordmark-white.png"),
      contentBox: Math.round(wordmarkCardW * 0.8),
    }),
    buildLabeledCard({
      cardW: wordmarkCardW,
      cardH: CARD_H,
      labelH: LABEL_H,
      label: "Wordmark — white on green",
      bg: "#1B4332",
      contentPath: path.join(PNG_DIR, "wordmark-white.png"),
      contentBox: Math.round(wordmarkCardW * 0.8),
    }),
  ]);

  const markCards = await Promise.all([
    buildLabeledCard({
      cardW: CARD_W,
      cardH: CARD_H,
      labelH: LABEL_H,
      label: "Mark — green on white",
      bg: "#FFFFFF",
      border: "#E8E6E0",
      contentPath: path.join(PNG_DIR, "mark-green.png"),
      contentBox: Math.round(CARD_H * 0.62),
    }),
    buildLabeledCard({
      cardW: CARD_W,
      cardH: CARD_H,
      labelH: LABEL_H,
      label: "Mark — white on black",
      bg: "#1A1D1B",
      contentPath: path.join(PNG_DIR, "mark-white.png"),
      contentBox: Math.round(CARD_H * 0.62),
    }),
    buildLabeledCard({
      cardW: CARD_W,
      cardH: CARD_H,
      labelH: LABEL_H,
      label: "Mark — white on green",
      bg: "#1B4332",
      contentPath: path.join(PNG_DIR, "mark-white.png"),
      contentBox: Math.round(CARD_H * 0.62),
    }),
    buildLabeledCard({
      cardW: CARD_W,
      cardH: CARD_H,
      labelH: LABEL_H,
      label: "App icon — light",
      bg: "#EDF3EF",
      contentPath: path.join(PNG_DIR, "app-icon-light-1024.png"),
      contentBox: Math.round(CARD_H * 0.62),
      contentRadius: 40,
    }),
    buildLabeledCard({
      cardW: CARD_W,
      cardH: CARD_H,
      labelH: LABEL_H,
      label: "App icon — dark",
      bg: "#EDF3EF",
      contentPath: path.join(PNG_DIR, "app-icon-dark-1024.png"),
      contentBox: Math.round(CARD_H * 0.62),
      contentRadius: 40,
    }),
  ]);

  // Layout: title, then a row of 3 wordmark cards, then a row of mark/icon
  // cards (wraps to 2 rows of up-to-3 since there are 5 of them).
  const wordmarkRowW = wordmarkCardW * 3 + GAP * 2;
  const markRowW = CARD_W * 3 + GAP * 2;
  const sheetW = MARGIN * 2 + Math.max(wordmarkRowW, markRowW);

  const titlePng = await renderLabel("umami — brand mark", { size: 44, color: "#1A1D1B", weight: 700 });
  const titleMeta = await sharp(titlePng).metadata();
  const subtitlePng = await renderLabel("Reference sheet — generated asset, not final approval", {
    size: 20,
    color: "#6B7370",
    weight: 500,
  });
  const subtitleMeta = await sharp(subtitlePng).metadata();

  const titleBlockH = titleMeta.height + 12 + subtitleMeta.height;
  const wordmarkRowY = MARGIN + titleBlockH + 56;
  const markRow1Y = wordmarkRowY + ROW_H + 56;
  const markRow2Y = markRow1Y + ROW_H + 40;
  const sheetH = markRow2Y + ROW_H + MARGIN;

  const composites = [
    { input: titlePng, left: MARGIN, top: MARGIN },
    { input: subtitlePng, left: MARGIN, top: MARGIN + titleMeta.height + 12 },
  ];

  wordmarkCards.forEach((card, i) => {
    composites.push({ input: card, left: MARGIN + i * (wordmarkCardW + GAP), top: wordmarkRowY });
  });

  markCards.slice(0, 3).forEach((card, i) => {
    composites.push({ input: card, left: MARGIN + i * (CARD_W + GAP), top: markRow1Y });
  });
  markCards.slice(3).forEach((card, i) => {
    composites.push({ input: card, left: MARGIN + i * (CARD_W + GAP), top: markRow2Y });
  });

  await sharp({
    create: { width: sheetW, height: sheetH, channels: 4, background: { r: 250, g: 249, b: 246, alpha: 1 } },
  })
    .composite(composites)
    .png()
    .toFile(path.join(PNG_DIR, "brand-sheet.png"));
}

async function main() {
  await mkdir(SVG_DIR, { recursive: true });
  await mkdir(PNG_DIR, { recursive: true });

  // --- SVG source files (black) ---
  await writeFile(path.join(SVG_DIR, "mark-black.svg"), glyphSvg(COLORS.black, 200));
  await writeFile(path.join(SVG_DIR, "wordmark-black.svg"), wordmarkSvg(COLORS.black));

  // --- Mark-only PNGs, transparent bg, 3 colors, 1024px square ---
  for (const [name, hex] of Object.entries(COLORS)) {
    await exportTransparentPng(glyphSvg(hex), 1024, path.join(PNG_DIR, `mark-${name}.png`));
  }

  // --- Wordmark PNGs, transparent bg, 3 colors, 1600px wide ---
  for (const [name, hex] of Object.entries(COLORS)) {
    await exportTransparentPngRect(wordmarkSvg(hex), 1600, path.join(PNG_DIR, `wordmark-${name}.png`));
  }

  // --- App icon covers ---
  const iconSizes = [1024, 512, 192, 180, 32];
  for (const size of iconSizes) {
    await exportIconCover({
      markColor: COLORS.green,
      bgColor: { ...hexToRgb(COLORS.white), alpha: 1 },
      size,
      outPath: path.join(PNG_DIR, `app-icon-light-${size}.png`),
    });
    await exportIconCover({
      markColor: COLORS.white,
      bgColor: { ...hexToRgb(COLORS.green), alpha: 1 },
      size,
      outPath: path.join(PNG_DIR, `app-icon-dark-${size}.png`),
    });
  }

  await buildPresentationSheet();

  console.log("Brand assets generated in public/brand/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
