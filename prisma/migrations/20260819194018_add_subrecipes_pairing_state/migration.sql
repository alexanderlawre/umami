-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "pairingSuggestion" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "state" TEXT;

-- CreateTable
CREATE TABLE "SubRecipe" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "ingredients" JSONB NOT NULL,
    "steps" JSONB NOT NULL,

    CONSTRAINT "SubRecipe_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SubRecipe" ADD CONSTRAINT "SubRecipe_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
