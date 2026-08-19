// Parses and formats ingredient `quantity` strings for the recipe detail
// page's servings stepper. Quantities are stored as free-form strings
// (plain numbers, simple/mixed fractions, or non-numeric amounts like
// "to taste") — scaling them naively and stringifying the raw decimal
// produces ugly output like "0.67" and silently fails to scale anything
// already stored as a fraction (`Number("1/4")` is NaN). This module parses
// every numeric form into a value, then formats the scaled result back into
// a friendly cooking fraction instead of a raw decimal.

const UNICODE_FRACTIONS: Record<string, number> = {
  "¼": 1 / 4,
  "½": 1 / 2,
  "¾": 3 / 4,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅕": 1 / 5,
  "⅖": 2 / 5,
  "⅗": 3 / 5,
  "⅘": 4 / 5,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 1 / 8,
  "⅜": 3 / 8,
  "⅝": 5 / 8,
  "⅞": 7 / 8,
};

const UNICODE_FRACTION_CHARS = Object.keys(UNICODE_FRACTIONS).join("");

/**
 * Parses a quantity string into a number. Returns null for anything that
 * isn't meaningfully numeric (free-text amounts like "to taste", ranges
 * like "1-2") so callers can pass those through unscaled.
 */
export function parseQuantity(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (UNICODE_FRACTIONS[trimmed] != null) return UNICODE_FRACTIONS[trimmed];

  const mixedUnicode = trimmed.match(
    new RegExp(`^(\\d+)\\s*([${UNICODE_FRACTION_CHARS}])$`),
  );
  if (mixedUnicode) {
    return Number(mixedUnicode[1]) + UNICODE_FRACTIONS[mixedUnicode[2]];
  }

  const mixedNumber = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedNumber) {
    const [, whole, num, den] = mixedNumber;
    return Number(whole) + Number(num) / Number(den);
  }

  const fraction = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const [, num, den] = fraction;
    return Number(num) / Number(den);
  }

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  return null;
}

// The standard measuring-cup/spoon fractions recipe apps round to. Thirds
// are included alongside eighths since 1/3 and 2/3 cup are common amounts
// that eighths alone can't represent well.
const NICE_FRACTIONS: { value: number; label: string }[] = [
  { value: 0, label: "" },
  { value: 1 / 8, label: "1/8" },
  { value: 1 / 4, label: "1/4" },
  { value: 1 / 3, label: "1/3" },
  { value: 3 / 8, label: "3/8" },
  { value: 1 / 2, label: "1/2" },
  { value: 5 / 8, label: "5/8" },
  { value: 2 / 3, label: "2/3" },
  { value: 3 / 4, label: "3/4" },
  { value: 7 / 8, label: "7/8" },
  { value: 1, label: "" }, // rolls into the next whole number
];

/**
 * Formats a (possibly fractional) quantity as a friendly cooking fraction,
 * e.g. 0.667 -> "2/3", 2.5 -> "2 1/2", 3 -> "3".
 */
export function formatQuantity(value: number): string {
  if (value <= 0) return "0";

  const whole = Math.floor(value);
  const remainder = value - whole;

  let best = NICE_FRACTIONS[0];
  let bestDiff = Infinity;
  for (const candidate of NICE_FRACTIONS) {
    const diff = Math.abs(remainder - candidate.value);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = candidate;
    }
  }

  const finalWhole = best.value === 1 ? whole + 1 : whole;
  const fractionLabel = best.value === 1 ? "" : best.label;

  if (finalWhole === 0 && fractionLabel === "") {
    // Rounded a nonzero amount down to nothing (e.g. a 1/4-cup ingredient
    // scaled way down) — floor to the smallest unit instead of showing "0".
    return "1/8";
  }
  if (finalWhole === 0) return fractionLabel;
  if (fractionLabel === "") return String(finalWhole);
  return `${finalWhole} ${fractionLabel}`;
}

/**
 * Scales an ingredient quantity string by `factor` and formats it as a
 * friendly fraction. Non-numeric quantities ("to taste", "1-2", "pinch")
 * pass through unchanged.
 */
export function scaleQuantity(quantity: string, factor: number): string {
  const parsed = parseQuantity(quantity);
  if (parsed == null) return quantity;
  return formatQuantity(parsed * factor);
}
