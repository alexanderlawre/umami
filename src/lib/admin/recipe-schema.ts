import { z } from "zod";

// Shared between the admin recipe create (POST) and edit (PATCH) routes.

export const ingredientSchema = z.object({
  component: z.string().trim().nullable().optional(),
  quantity: z.string().trim(),
  unit: z.string().trim().nullable().optional(),
  item: z.string().trim().min(1),
  prepNote: z.string().trim().nullable().optional(),
  optional: z.boolean().optional().default(false),
});

export const stepSchema = z.object({
  text: z.string().trim().min(1),
  durationMinutes: z.number().int().positive().nullable().optional(),
});

export const DIFFICULTIES = ["EASY", "MEDIUM", "INVOLVED"] as const;
export const MEAL_SLOTS = ["BREAKFAST", "TAPAS", "LUNCH", "DINNER"] as const;
export const EFFORT_TIERS = ["WEEKNIGHT", "WEEKEND", "PROJECT"] as const;

export const recipeFieldsSchema = z.object({
  title: z.string().trim().min(1),
  shortDescription: z.string().trim().min(1),
  note: z.string().trim(),
  introCopy: z.string().trim(),
  servings: z.number().int().positive(),
  prepMinutes: z.number().int().min(0),
  cookMinutes: z.number().int().min(0),
  difficulty: z.enum(DIFFICULTIES),
  cuisineId: z.string().min(1),
  mealSlot: z.enum(MEAL_SLOTS),
  effortTier: z.enum(EFFORT_TIERS),
  batchFriendly: z.boolean().optional().default(false),
  attributes: z.array(z.string()).optional().default([]),
  heroColor: z.string().trim().min(1),
  imageCredit: z.string().trim().nullable().optional(),
  caloriesPerServing: z.number().int().positive().nullable().optional(),
  proteinGrams: z.number().int().positive().nullable().optional(),
  carbsGrams: z.number().int().positive().nullable().optional(),
  fatGrams: z.number().int().positive().nullable().optional(),
  dietIds: z.array(z.string()).optional().default([]),
  allergenIds: z.array(z.string()).optional().default([]),
  ingredients: z.array(ingredientSchema).min(1),
  steps: z.array(stepSchema).min(1),
});

// Built from `.partial()`, but re-overrides every field that had a
// `.default(...)` in `recipeFieldsSchema`. Zod's `.partial()` does NOT strip
// `.default()` — an omitted field still resolves to its default value (e.g.
// `[]`) rather than `undefined`. For a PATCH/partial-update schema that is
// dangerous: route handlers use `field ? { ... } : {}` to decide whether to
// touch a relation, and a truthy `[]` default silently wipes it. Re-declaring
// these fields here as plain `.optional()` (no default) ensures an omitted
// field truly stays `undefined`, which both the route's `? :` checks and
// Prisma's update `data` object correctly treat as "leave unchanged".
export const recipeUpdateSchema = recipeFieldsSchema.partial().extend({
  batchFriendly: z.boolean().optional(),
  attributes: z.array(z.string()).optional(),
  dietIds: z.array(z.string()).optional(),
  allergenIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  archivedReason: z.string().nullable().optional(),
  allergenReviewStatus: z.enum(["UNVERIFIED", "IN_REVIEW", "VERIFIED"]).optional(),
});
