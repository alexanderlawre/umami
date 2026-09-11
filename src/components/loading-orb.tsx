"use client";

// App-wide loading indicator: the umami leaf-U mark, gently pulsing. Path
// data is duplicated from scripts/generate-brand-assets.mjs's glyphMarkup()/
// GLYPH_VIEWBOX (the brand mark generator) — keep them in sync if the mark
// ever changes.
const GLYPH_VIEWBOX = "-5 -10 110 110";

function GlyphPaths() {
  return (
    <>
      <path
        d="M30 24 L30 60 C30 75 41 83 52 83 C63 83 71 76 71 61 L71 28"
        fill="none"
        stroke="currentColor"
        strokeWidth={15}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M67 23 C74 12 85 4 96 0 C90 10 82 20 76 30 Z M70 22 C78 14 86 8 93 2 C89 6 80 13 72 20 Z"
      />
    </>
  );
}

/**
 * App-wide loading indicator. Renders the umami brand mark (leaf-U glyph)
 * in a slow pulse/breathe loop, in a fixed color per theme, so every
 * loading state in the app looks the same.
 */
export function LoadingOrb({
  size = 20,
  theme = "light",
  className,
  "aria-label": ariaLabel,
}: {
  size?: 20 | 64;
  /** Mark color: "light" = near-black (default, for light backgrounds),
   * "dark" = white (for dark backgrounds, e.g. the black Apple button). */
  theme?: "light" | "dark";
  className?: string;
  "aria-label"?: string;
}) {
  const color = theme === "dark" ? "#FFFFFF" : "#1A1D1B";

  return (
    <svg
      width={size}
      height={size}
      viewBox={GLYPH_VIEWBOX}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      className={`animate-loading-mark ${className ?? ""}`}
      style={{ color }}
    >
      <GlyphPaths />
    </svg>
  );
}
