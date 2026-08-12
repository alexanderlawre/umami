-- AlterTable: add uniqueness on (userId, windowKey, servedAt, position) so
-- each served batch has a deterministic, race-safe set of card positions.
-- Backfill for pre-existing rows was already run manually before this
-- migration (see Prisma agent session notes) and verified duplicate-free.
CREATE UNIQUE INDEX "ServedCard_userId_windowKey_servedAt_position_key" ON "ServedCard"("userId", "windowKey", "servedAt", "position");
