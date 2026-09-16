// "Cook Later" saves auto-expire from the user's view after this many days.
// Expired rows are left in the DB (not deleted) — see DECISIONS.md pattern of
// simple lazy filtering over scheduled cleanup jobs.
export const SAVED_RECIPE_TTL_DAYS = 5;

export function savedRecipeExpiryCutoff(): Date {
  return new Date(Date.now() - SAVED_RECIPE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

// Compact "time left" label for the Cook Later countdown badge. Day-
// granularity only (no hours/minutes, no live ticking) — with a 5-day
// window there's no need for a client-side interval timer the way
// refresh-blocked-modal.tsx's formatCountdown needs one for its ≤18h
// window; recomputing once per page load (cook-later is a server
// component, refetched on every visit) is sufficient.
export function formatSavedRecipeTimeLeft(savedAt: string | Date): string {
  const expiresMs = new Date(savedAt).getTime() + SAVED_RECIPE_TTL_DAYS * 24 * 60 * 60 * 1000;
  const msRemaining = expiresMs - Date.now();
  if (msRemaining <= 0) return "Expiring";
  const daysRemaining = Math.max(1, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
  return `${daysRemaining}d left`;
}
