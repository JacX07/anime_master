-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Battle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "opponent" TEXT NOT NULL,
    "manual" BOOLEAN NOT NULL,
    "seed" INTEGER NOT NULL,
    "teams" JSONB NOT NULL,
    "actions" JSONB NOT NULL DEFAULT [],
    "steps" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "winner" TEXT,
    "log" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    CONSTRAINT "Battle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Battle" ("actions", "createdAt", "endedAt", "id", "log", "manual", "mode", "opponent", "seed", "status", "teams", "userId", "winner") SELECT "actions", "createdAt", "endedAt", "id", "log", "manual", "mode", "opponent", "seed", "status", "teams", "userId", "winner" FROM "Battle";
DROP TABLE "Battle";
ALTER TABLE "new_Battle" RENAME TO "Battle";
CREATE INDEX "Battle_userId_status_idx" ON "Battle"("userId", "status");
CREATE INDEX "Battle_status_createdAt_idx" ON "Battle"("status", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
