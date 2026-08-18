-- CreateTable
CREATE TABLE "RefreshUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "section" "DashboardCategory" NOT NULL,
    "windowKey" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshUsage_userId_section_windowKey_key" ON "RefreshUsage"("userId", "section", "windowKey");

-- AddForeignKey
ALTER TABLE "RefreshUsage" ADD CONSTRAINT "RefreshUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
