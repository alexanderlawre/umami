-- CreateEnum
CREATE TYPE "CookingFor" AS ENUM ('SELF', 'PARTNER', 'FAMILY', 'MIXED', 'HOSTING');

-- CreateEnum
CREATE TYPE "CookFrequency" AS ENUM ('DAILY', 'EVERY_OTHER_DAY', 'FEW_TIMES_WEEK', 'MEAL_PREP', 'WEEKENDS_ONLY');

-- CreateEnum
CREATE TYPE "Goal" AS ENUM ('EAT_MORE_VEG', 'MORE_PROTEIN', 'LESS_TIME', 'SPEND_LESS', 'LEARN_TECHNIQUE', 'EAT_WIDER');

-- CreateEnum
CREATE TYPE "FoodGroupCategory" AS ENUM ('PRODUCE', 'PROTEIN', 'GRAIN', 'DAIRY', 'FLAVOR', 'OTHER');

-- CreateEnum
CREATE TYPE "PreferenceSource" AS ENUM ('ONBOARDING', 'LEARNED');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'INVOLVED');

-- CreateEnum
CREATE TYPE "MealSlot" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateEnum
CREATE TYPE "EffortTier" AS ENUM ('WEEKNIGHT', 'WEEKEND', 'PROJECT');

-- CreateEnum
CREATE TYPE "AllergenReviewStatus" AS ENUM ('UNVERIFIED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('IMPRESSION', 'OPEN', 'DISMISS', 'MUTE', 'COOK', 'STAR', 'UNSTAR', 'COSIGN');

-- CreateEnum
CREATE TYPE "CooldownReason" AS ENUM ('SHOWN', 'DISMISSED', 'COOKED', 'MUTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customAllergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cookingFor" "CookingFor",
    "cookFrequency" "CookFrequency",
    "favoriteFoods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "goals" "Goal"[] DEFAULT ARRAY[]::"Goal"[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodGroupPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "foodGroupId" TEXT NOT NULL,
    "declaredValue" INTEGER NOT NULL,
    "learnedValue" INTEGER NOT NULL,
    "source" "PreferenceSource" NOT NULL DEFAULT 'ONBOARDING',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodGroupPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "FoodGroupCategory" NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "FoodGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Diet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Diet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allergen" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Allergen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "introCopy" TEXT NOT NULL,
    "servings" INTEGER NOT NULL,
    "prepMinutes" INTEGER NOT NULL,
    "cookMinutes" INTEGER NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "cuisine" TEXT NOT NULL,
    "mealSlot" "MealSlot"[],
    "effortTier" "EffortTier" NOT NULL,
    "batchFriendly" BOOLEAN NOT NULL DEFAULT false,
    "attributes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "heroColor" TEXT NOT NULL,
    "allergenReviewStatus" "AllergenReviewStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "component" TEXT,
    "order" INTEGER NOT NULL,
    "quantity" TEXT NOT NULL,
    "unit" TEXT,
    "item" TEXT NOT NULL,
    "prepNote" TEXT,
    "optional" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Step" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "durationMinutes" INTEGER,

    CONSTRAINT "Step_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeFoodGroup" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "foodGroupId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,

    CONSTRAINT "RecipeFoodGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "type" "InteractionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "localHour" INTEGER NOT NULL,
    "localDayOfWeek" INTEGER NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cooldown" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "suppressedUntil" TIMESTAMP(3),
    "reason" "CooldownReason" NOT NULL,

    CONSTRAINT "Cooldown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CookLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "cookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "servings" INTEGER NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "cosignNote" TEXT,

    CONSTRAINT "CookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServedCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "servedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scoreBreakdown" JSONB,

    CONSTRAINT "ServedCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DietToUserPreferences" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DietToUserPreferences_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DietToRecipe" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DietToRecipe_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AllergenToUserPreferences" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AllergenToUserPreferences_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AllergenToRecipe" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AllergenToRecipe_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FoodGroupPreference_userId_foodGroupId_key" ON "FoodGroupPreference"("userId", "foodGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "FoodGroup_name_key" ON "FoodGroup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Diet_name_key" ON "Diet"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Allergen_name_key" ON "Allergen"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_slug_key" ON "Recipe"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeFoodGroup_recipeId_foodGroupId_key" ON "RecipeFoodGroup"("recipeId", "foodGroupId");

-- CreateIndex
CREATE INDEX "Interaction_userId_type_createdAt_idx" ON "Interaction"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "Interaction_recipeId_type_idx" ON "Interaction"("recipeId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Cooldown_userId_recipeId_key" ON "Cooldown"("userId", "recipeId");

-- CreateIndex
CREATE INDEX "ServedCard_userId_servedAt_idx" ON "ServedCard"("userId", "servedAt");

-- CreateIndex
CREATE INDEX "_DietToUserPreferences_B_index" ON "_DietToUserPreferences"("B");

-- CreateIndex
CREATE INDEX "_DietToRecipe_B_index" ON "_DietToRecipe"("B");

-- CreateIndex
CREATE INDEX "_AllergenToUserPreferences_B_index" ON "_AllergenToUserPreferences"("B");

-- CreateIndex
CREATE INDEX "_AllergenToRecipe_B_index" ON "_AllergenToRecipe"("B");

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodGroupPreference" ADD CONSTRAINT "FoodGroupPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodGroupPreference" ADD CONSTRAINT "FoodGroupPreference_foodGroupId_fkey" FOREIGN KEY ("foodGroupId") REFERENCES "FoodGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Step" ADD CONSTRAINT "Step_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeFoodGroup" ADD CONSTRAINT "RecipeFoodGroup_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeFoodGroup" ADD CONSTRAINT "RecipeFoodGroup_foodGroupId_fkey" FOREIGN KEY ("foodGroupId") REFERENCES "FoodGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cooldown" ADD CONSTRAINT "Cooldown_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cooldown" ADD CONSTRAINT "Cooldown_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CookLog" ADD CONSTRAINT "CookLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CookLog" ADD CONSTRAINT "CookLog_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServedCard" ADD CONSTRAINT "ServedCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServedCard" ADD CONSTRAINT "ServedCard_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DietToUserPreferences" ADD CONSTRAINT "_DietToUserPreferences_A_fkey" FOREIGN KEY ("A") REFERENCES "Diet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DietToUserPreferences" ADD CONSTRAINT "_DietToUserPreferences_B_fkey" FOREIGN KEY ("B") REFERENCES "UserPreferences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DietToRecipe" ADD CONSTRAINT "_DietToRecipe_A_fkey" FOREIGN KEY ("A") REFERENCES "Diet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DietToRecipe" ADD CONSTRAINT "_DietToRecipe_B_fkey" FOREIGN KEY ("B") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AllergenToUserPreferences" ADD CONSTRAINT "_AllergenToUserPreferences_A_fkey" FOREIGN KEY ("A") REFERENCES "Allergen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AllergenToUserPreferences" ADD CONSTRAINT "_AllergenToUserPreferences_B_fkey" FOREIGN KEY ("B") REFERENCES "UserPreferences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AllergenToRecipe" ADD CONSTRAINT "_AllergenToRecipe_A_fkey" FOREIGN KEY ("A") REFERENCES "Allergen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AllergenToRecipe" ADD CONSTRAINT "_AllergenToRecipe_B_fkey" FOREIGN KEY ("B") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
