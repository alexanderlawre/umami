// Converts a human-readable name into a stable, uppercase snake_case code
// suitable for a machine identifier (e.g. AttributeTag.code). Mirrors
// slugify()'s approach but produces "HIGH_PROTEIN" style output instead of
// "high-protein".
export function codify(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
}
