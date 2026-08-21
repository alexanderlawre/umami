"use client";

import { ThinkingOrb } from "thinking-orbs";

/**
 * App-wide loading indicator. Wraps thinking-orbs' <ThinkingOrb /> with a
 * fixed state ("composing") and theme ("light" = dark/black dots, for this
 * app's white background) so every loading state in the app looks the same.
 */
export function LoadingOrb({
  size = 20,
  theme = "light",
  className,
  "aria-label": ariaLabel,
}: {
  size?: 20 | 64;
  /** Dot color: "light" = black dots (default, for light backgrounds),
   * "dark" = white dots (for dark backgrounds, e.g. the black Apple button). */
  theme?: "light" | "dark";
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <ThinkingOrb
      state="composing"
      theme={theme}
      size={size}
      className={className}
      aria-label={ariaLabel}
    />
  );
}
