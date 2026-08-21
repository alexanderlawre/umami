/*
  Warnings:

  - You are about to drop the `_DietToUserPreferences` table. Existing rows
    are migrated into the new `UserDietPreference` table (as STRICT
    commitments, the default for the old implicit-relation behavior) before
    the old join table is dropped, so no diet preference data is lost.

*/
-- CreateEnum
CREATE TYPE "DietCommitment" AS ENUM ('STRICT', 'MODERATE', 'FLEXIBLE');

-- CreateTable
CREATE TABLE "UserDietPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dietId" TEXT NOT NULL,
    "commitment" "DietCommitment" NOT NULL DEFAULT 'STRICT',

    CONSTRAINT "UserDietPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserDietPreference_userId_dietId_key" ON "UserDietPreference"("userId", "dietId");

-- AddForeignKey
ALTER TABLE "UserDietPreference" ADD CONSTRAINT "UserDietPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDietPreference" ADD CONSTRAINT "UserDietPreference_dietId_fkey" FOREIGN KEY ("dietId") REFERENCES "Diet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: preserve existing diet selections as STRICT commitments
CREATE EXTENSION IF NOT EXISTS pgcrypto;
INSERT INTO "UserDietPreference" ("id", "userId", "dietId", "commitment")
SELECT gen_random_uuid()::text, up."userId", dtu."A", 'STRICT'
FROM "_DietToUserPreferences" dtu
JOIN "UserPreferences" up ON up.id = dtu."B"
ON CONFLICT ("userId", "dietId") DO NOTHING;

-- DropForeignKey
ALTER TABLE "_DietToUserPreferences" DROP CONSTRAINT "_DietToUserPreferences_A_fkey";

-- DropForeignKey
ALTER TABLE "_DietToUserPreferences" DROP CONSTRAINT "_DietToUserPreferences_B_fkey";

-- DropTable
DROP TABLE "_DietToUserPreferences";
