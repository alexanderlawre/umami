"use client";

// App-wide loading indicator: three dots, bouncing in sequence.
const DOT_DELAYS = [0, 0.15, 0.3];

/**
 * App-wide loading indicator. Renders three dots in a staggered bounce
 * loop, in a fixed color per theme, so every loading state in the app
 * looks the same.
 */
export function LoadingOrb({
  size = 20,
  theme = "light",
  className,
  "aria-label": ariaLabel,
}: {
  size?: 20 | 64;
  /** Dot color: "light" = near-black (default, for light backgrounds),
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
      viewBox="0 0 100 100"
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      className={className}
      style={{ color }}
    >
      {DOT_DELAYS.map((delay, i) => (
        <circle
          key={i}
          cx={20 + i * 30}
          cy={50}
          r={11}
          fill="currentColor"
          className="animate-loading-dot"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </svg>
  );
}
