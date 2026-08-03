/*
  Warnings:

  - You are about to drop the column `cuisine` on the `Recipe` table. All the data in the column will be lost.
  - You are about to drop the column `cookFrequency` on the `UserPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `cookingFor` on the `UserPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `favoriteFoods` on the `UserPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `goals` on the `UserPreferences` table. All the data in the column will be lost.
  - Added the required column `cuisineId` to the `Recipe` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Recipe" DROP COLUMN "cuisine",
ADD COLUMN     "cuisineId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "birthday" TIMESTAMP(3),
ADD COLUMN     "city" TEXT;

-- AlterTable
ALTER TABLE "UserPreferences" DROP COLUMN "cookFrequency",
DROP COLUMN "cookingFor",
DROP COLUMN "favoriteFoods",
DROP COLUMN "goals",
ADD COLUMN     "favoriteCuisines" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "foodGroupFeedback" TEXT;

-- DropEnum
DROP TYPE "CookFrequency";

-- DropEnum
DROP TYPE "CookingFor";

-- DropEnum
DROP TYPE "Goal";

-- CreateTable
CREATE TABLE "Cuisine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Cuisine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cuisine_name_key" ON "Cuisine"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Cuisine_slug_key" ON "Cuisine"("slug");

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_cuisineId_fkey" FOREIGN KEY ("cuisineId") REFERENCES "Cuisine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
