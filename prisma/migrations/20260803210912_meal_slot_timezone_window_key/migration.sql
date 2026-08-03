-- AlterTable
ALTER TABLE "ServedCard" ADD COLUMN     "windowKey" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "timezone" TEXT;

-- CreateIndex
CREATE INDEX "ServedCard_userId_windowKey_idx" ON "ServedCard"("userId", "windowKey");
