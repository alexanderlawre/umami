export type LoggedInteractionType =
  | "IMPRESSION"
  | "OPEN"
  | "DISMISS"
  | "MUTE"
  | "COOK"
  | "STAR"
  | "UNSTAR"
  | "COSIGN";

export function logInteraction(
  recipeId: string,
  type: LoggedInteractionType,
  metadata?: Record<string, unknown>,
) {
  const now = new Date();

  fetch("/api/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipeId,
      type,
      localHour: now.getHours(),
      localDayOfWeek: now.getDay(),
      metadata,
    }),
    keepalive: true,
  }).catch(() => {
    // Best-effort logging; a dropped interaction shouldn't break the UI.
  });
}
