-- CreateTable
CREATE TABLE "UserCookbook" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCookbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCookbookRecipe" (
    "id" TEXT NOT NULL,
    "userCookbookId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCookbookRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserCookbook_userId_idx" ON "UserCookbook"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCookbook_userId_name_key" ON "UserCookbook"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "UserCookbookRecipe_userCookbookId_recipeId_key" ON "UserCookbookRecipe"("userCookbookId", "recipeId");

-- AddForeignKey
ALTER TABLE "UserCookbook" ADD CONSTRAINT "UserCookbook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCookbookRecipe" ADD CONSTRAINT "UserCookbookRecipe_userCookbookId_fkey" FOREIGN KEY ("userCookbookId") REFERENCES "UserCookbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCookbookRecipe" ADD CONSTRAINT "UserCookbookRecipe_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
