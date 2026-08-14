-- CreateEnum
CREATE TYPE "EffortPreference" AS ENUM ('QUICK', 'ANY', 'PROJECT');

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "spiceLevel" INTEGER,
ADD COLUMN     "spiceLevelInferred" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UserPreferences" ADD COLUMN     "effortPreference" "EffortPreference" NOT NULL DEFAULT 'ANY',
ADD COLUMN     "spiceMax" INTEGER;
