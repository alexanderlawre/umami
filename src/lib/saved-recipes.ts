// "Cook Later" saves auto-expire from the user's view after this many days.
// Expired rows are left in the DB (not deleted) — see DECISIONS.md pattern of
// simple lazy filtering over scheduled cleanup jobs.
export const SAVED_RECIPE_TTL_DAYS = 5;

export function savedRecipeExpiryCutoff(): Date {
  return new Date(Date.now() - SAVED_RECIPE_TTL_DAYS * 24 * 60 * 60 * 1000);
}
