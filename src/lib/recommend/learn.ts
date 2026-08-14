// Learned-preference updates: the only place `FoodGroupPreference.learnedValue`
// is ever written. Everywhere else (scoring, dashboard) only ever reads it.
// Called (best-effort, never blocking the request that triggered it) from
// the three behavioral signal sources: cooking a recipe, saving it to Cook
// Later, and dismissing/muting it.
//
// Mechanic: each recipe is tagged with 0-100 `weight` values against one or
// more FoodGroups (RecipeFoodGroup). A positive signal nudges the user's
// learnedValue for each touched food group a fixed fraction of the distance
// toward that recipe's weight; a negative signal nudges it a smaller
// fraction toward 0 (so a single dismissal doesn't overcorrect as hard as a
// real cook/star does). This is a simple exponential moving average, so
// repeated consistent signals compound while a single outlier barely moves
// the needle. Always clamped to [0, 100].
//
// Free-tier feed intelligence v1: recency decay. Before a fresh signal is
// applied, `learnedValue` is first relaxed part-way back toward the user's
// `declaredValue` (their deliberate onboarding baseline) based on how long
// it's been since the last signal for that food group — so a preference
// nudged hard weeks ago gradually fades rather than staying pinned forever.
// This only changes what "current" means going into the existing EMA step
// below; the step size/cold-start behavior are untouched.

import { prisma } from "@/lib/prisma";

const POSITIVE_STEP = 0.15;
const NEGATIVE_STEP = 0.08;

// After this many days with no signal for a food group, half of the gap
// between learnedValue and declaredValue has faded back toward declared.
// Chosen to match the spec's own "adapts/fades over weeks, not days"
// framing — noticeable drift within a month, but no single day's silence
// meaningfully resets anything.
const DECAY_HALF_LIFE_DAYS = 21;

function decayTowardDeclared(
  learnedValue: number,
  declaredValue: number,
  updatedAt: Date,
  now: Date,
): number {
  const daysSinceSignal = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceSignal <= 0) return learnedValue;
  const remaining = Math.pow(0.5, daysSinceSignal / DECAY_HALF_LIFE_DAYS);
  return declaredValue + (learnedValue - declaredValue) * remaining;
}

export type LearningDirection = "positive" | "negative";

export async function updateLearnedPreferences(
  userId: string,
  recipeId: string,
  direction: LearningDirection,
): Promise<void> {
  const recipeFoodGroups = await prisma.recipeFoodGroup.findMany({
    where: { recipeId },
    select: { foodGroupId: true, weight: true },
  });

  if (recipeFoodGroups.length === 0) return;

  const foodGroupIds = recipeFoodGroups.map((rfg) => rfg.foodGroupId);
  const existingPrefs = await prisma.foodGroupPreference.findMany({
    where: { userId, foodGroupId: { in: foodGroupIds } },
  });
  const existingByFoodGroup = new Map(existingPrefs.map((p) => [p.foodGroupId, p]));
  const now = new Date();

  await Promise.all(
    recipeFoodGroups.map(async (rfg) => {
      const existing = existingByFoodGroup.get(rfg.foodGroupId);
      // Cold-start: no preference row yet for this user+foodGroup — seed
      // from a neutral midpoint (50) rather than requiring onboarding to
      // have declared every single food group up front. A brand-new row
      // has no prior signal to decay, so it skips straight to the EMA step.
      const current = existing
        ? decayTowardDeclared(existing.learnedValue, existing.declaredValue, existing.updatedAt, now)
        : 50;
      const target = direction === "positive" ? rfg.weight : 0;
      const step = direction === "positive" ? POSITIVE_STEP : NEGATIVE_STEP;
      const next = Math.round(current + (target - current) * step);
      const clamped = Math.max(0, Math.min(100, next));

      await prisma.foodGroupPreference.upsert({
        where: { userId_foodGroupId: { userId, foodGroupId: rfg.foodGroupId } },
        create: {
          userId,
          foodGroupId: rfg.foodGroupId,
          declaredValue: existing?.declaredValue ?? 50,
          learnedValue: clamped,
          source: "LEARNED",
        },
        update: {
          learnedValue: clamped,
          source: "LEARNED",
        },
      });
    }),
  );
}
