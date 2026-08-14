-- AlterTable
ALTER TABLE "UserPreferences" DROP COLUMN "effortPreference";
DROP TYPE "EffortPreference";

-- CreateEnum
CREATE TYPE "DashboardCategory" AS ENUM ('MEALS', 'TAPAS', 'BREAKFAST');

-- AlterTable
ALTER TABLE "UserPreferences" ADD COLUMN "dashboardCategory" "DashboardCategory" NOT NULL DEFAULT 'MEALS';
