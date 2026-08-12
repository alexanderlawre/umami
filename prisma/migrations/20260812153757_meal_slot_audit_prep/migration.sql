-- AlterEnum
ALTER TYPE "MealSlot" ADD VALUE 'TAPAS';

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "archivedReason" TEXT,
ADD COLUMN     "mealSlotPrimary" "MealSlot";
