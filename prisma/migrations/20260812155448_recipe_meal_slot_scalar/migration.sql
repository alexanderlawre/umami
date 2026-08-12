-- Converts Recipe.mealSlot from a multi-value array to a single required
-- value. The old array column is dropped (every recipe was already audited
-- and assigned a single mealSlotPrimary value in a prior migration/script
-- run), and mealSlotPrimary is renamed to take its place — this preserves
-- the audited data instead of losing it, unlike Prisma's auto-generated
-- drop+recreate for this kind of change.
ALTER TABLE "Recipe" DROP COLUMN "mealSlot";
ALTER TABLE "Recipe" RENAME COLUMN "mealSlotPrimary" TO "mealSlot";
ALTER TABLE "Recipe" ALTER COLUMN "mealSlot" SET NOT NULL;
