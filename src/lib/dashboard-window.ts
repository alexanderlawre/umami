// The dashboard shows the same four recipes for a fixed 12-hour window (i.e.
// twice a day), with at most one manual reshuffle allowed per window. Windows
// are anchored to the Unix epoch so they're deterministic and don't depend on
// user timezone.

export const REFRESH_WINDOW_HOURS = 12;
const WINDOW_MS = REFRESH_WINDOW_HOURS * 60 * 60 * 1000;

export function currentWindowStart(now: Date = new Date()): Date {
  return new Date(Math.floor(now.getTime() / WINDOW_MS) * WINDOW_MS);
}

export function nextWindowStart(now: Date = new Date()): Date {
  return new Date(currentWindowStart(now).getTime() + WINDOW_MS);
}
