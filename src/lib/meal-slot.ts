// Timezone-aware meal-slot windows. `scoreRecipe`'s meal-slot bonus (see
// score.ts) only ever compares against Lunch/Dinner, so there are only two
// time-of-day windows: Lunch is weighted more heavily 6:00am-11:59am, and
// Dinner dominates the rest of the day (noon through 5:59am the next local
// day). The dashboard's Meals/Tapas/Breakfast category control (see
// select-daily.ts's activePoolFor) reuses this same window's boundary/key
// for all three categories — Tapas and Breakfast just suffix the key rather
// than defining their own cadence.
//
// Built entirely on Intl.DateTimeFormat's `timeZone` option — no timezone
// library dependency needed. We only ever need (a) the local hour/minute to
// classify the current window, and (b) a *duration* until the next boundary
// (not an absolute wall-clock conversion), which is timezone-offset-safe
// without needing full zoned-datetime arithmetic.

export type MealSlot = "LUNCH" | "DINNER";

export const DEFAULT_TIMEZONE = "UTC";

const BOUNDARY_HOURS = [6, 12] as const;

function localParts(timezone: string, now: Date) {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
  } catch {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: DEFAULT_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
  }

  const parts = Object.fromEntries(formatter.formatToParts(now).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // hour12: false can still report "24" for midnight in some locales/engines.
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
  };
}

export function getCurrentMealSlot(timezone: string | null | undefined, now: Date = new Date()): MealSlot {
  const { hour } = localParts(timezone || DEFAULT_TIMEZONE, now);
  if (hour >= 6 && hour < 12) return "LUNCH";
  return "DINNER";
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Stable key identifying "this window" — changes exactly at each boundary and
// is otherwise constant, so repeated loads within the same window agree.
export function getMealSlotWindowKey(timezone: string | null | undefined, now: Date = new Date()): string {
  const tz = timezone || DEFAULT_TIMEZONE;
  const { year, month, day, hour } = localParts(tz, now);

  if (hour < 6) {
    // Hours 0-5 are still part of the *previous* local calendar day's Dinner
    // window (Dinner spans 12:00 -> 05:59), not a fresh Lunch window yet.
    const prevDay = new Date(Date.UTC(year, month - 1, day));
    prevDay.setUTCDate(prevDay.getUTCDate() - 1);
    return `${prevDay.getUTCFullYear()}-${pad(prevDay.getUTCMonth() + 1)}-${pad(prevDay.getUTCDate())}:DINNER`;
  }

  const slot = getCurrentMealSlot(tz, now);
  return `${year}-${pad(month)}-${pad(day)}:${slot}`;
}

export function minutesUntilNextMealSlotBoundary(
  timezone: string | null | undefined,
  now: Date = new Date(),
): number {
  const { hour, minute } = localParts(timezone || DEFAULT_TIMEZONE, now);
  const nowMinutes = hour * 60 + minute;
  const boundaryMinutes = BOUNDARY_HOURS.map((h) => h * 60);
  const next = boundaryMinutes.find((b) => b > nowMinutes);
  const nextBoundary = next ?? boundaryMinutes[0] + 24 * 60;
  return nextBoundary - nowMinutes;
}

export function nextMealSlotWindowAt(timezone: string | null | undefined, now: Date = new Date()): Date {
  return new Date(now.getTime() + minutesUntilNextMealSlotBoundary(timezone, now) * 60_000);
}

