-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "caloriesPerServing" INTEGER,
ADD COLUMN     "carbsGrams" INTEGER,
ADD COLUMN     "fatGrams" INTEGER,
ADD COLUMN     "proteinGrams" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RecipeSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "introCopy" TEXT NOT NULL,
    "servings" INTEGER NOT NULL,
    "prepMinutes" INTEGER NOT NULL,
    "cookMinutes" INTEGER NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "cuisineId" TEXT NOT NULL,
    "mealSlot" "MealSlot"[],
    "effortTier" "EffortTier" NOT NULL,
    "batchFriendly" BOOLEAN NOT NULL DEFAULT false,
    "attributes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "heroColor" TEXT NOT NULL,
    "imageUrl" TEXT,
    "imageCredit" TEXT,
    "caloriesPerServing" INTEGER,
    "proteinGrams" INTEGER,
    "carbsGrams" INTEGER,
    "fatGrams" INTEGER,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "approvedRecipeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecipeSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionIngredient" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "component" TEXT,
    "order" INTEGER NOT NULL,
    "quantity" TEXT NOT NULL,
    "unit" TEXT,
    "item" TEXT NOT NULL,
    "prepNote" TEXT,
    "optional" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SubmissionIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionStep" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "durationMinutes" INTEGER,

    CONSTRAINT "SubmissionStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SubmissionDietTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SubmissionDietTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_SubmissionAllergenTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SubmissionAllergenTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecipeSubmission_approvedRecipeId_key" ON "RecipeSubmission"("approvedRecipeId");

-- CreateIndex
CREATE INDEX "RecipeSubmission_userId_status_idx" ON "RecipeSubmission"("userId", "status");

-- CreateIndex
CREATE INDEX "RecipeSubmission_status_createdAt_idx" ON "RecipeSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "_SubmissionDietTags_B_index" ON "_SubmissionDietTags"("B");

-- CreateIndex
CREATE INDEX "_SubmissionAllergenTags_B_index" ON "_SubmissionAllergenTags"("B");

-- AddForeignKey
ALTER TABLE "RecipeSubmission" ADD CONSTRAINT "RecipeSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeSubmission" ADD CONSTRAINT "RecipeSubmission_cuisineId_fkey" FOREIGN KEY ("cuisineId") REFERENCES "Cuisine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeSubmission" ADD CONSTRAINT "RecipeSubmission_approvedRecipeId_fkey" FOREIGN KEY ("approvedRecipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionIngredient" ADD CONSTRAINT "SubmissionIngredient_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "RecipeSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionStep" ADD CONSTRAINT "SubmissionStep_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "RecipeSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubmissionDietTags" ADD CONSTRAINT "_SubmissionDietTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Diet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubmissionDietTags" ADD CONSTRAINT "_SubmissionDietTags_B_fkey" FOREIGN KEY ("B") REFERENCES "RecipeSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubmissionAllergenTags" ADD CONSTRAINT "_SubmissionAllergenTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Allergen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubmissionAllergenTags" ADD CONSTRAINT "_SubmissionAllergenTags_B_fkey" FOREIGN KEY ("B") REFERENCES "RecipeSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
