-- CreateTable
CREATE TABLE "BattleTeam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    CONSTRAINT "BattleTeam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BattleTeamSlot" (
    "teamId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "cardId" TEXT NOT NULL,

    PRIMARY KEY ("teamId", "position"),
    CONSTRAINT "BattleTeamSlot_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "BattleTeam" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BattleTeamSlot_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Battle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "opponent" TEXT NOT NULL,
    "manual" BOOLEAN NOT NULL,
    "seed" INTEGER NOT NULL,
    "teams" JSONB NOT NULL,
    "actions" JSONB NOT NULL DEFAULT [],
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "winner" TEXT,
    "log" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    CONSTRAINT "Battle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Card" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "characterId" INTEGER NOT NULL,
    "finish" TEXT NOT NULL,
    "serial" INTEGER NOT NULL,
    "rarityAtPull" TEXT NOT NULL,
    "packOpeningId" TEXT NOT NULL,
    "obtainedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "forTrade" BOOLEAN NOT NULL DEFAULT false,
    "inAuction" BOOLEAN NOT NULL DEFAULT false,
    "inExpedition" BOOLEAN NOT NULL DEFAULT false,
    "stars" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Card_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Card_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Card_packOpeningId_fkey" FOREIGN KEY ("packOpeningId") REFERENCES "PackOpening" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Card" ("characterId", "finish", "forTrade", "id", "inAuction", "inExpedition", "locked", "obtainedAt", "ownerId", "packOpeningId", "rarityAtPull", "serial") SELECT "characterId", "finish", "forTrade", "id", "inAuction", "inExpedition", "locked", "obtainedAt", "ownerId", "packOpeningId", "rarityAtPull", "serial" FROM "Card";
DROP TABLE "Card";
ALTER TABLE "new_Card" RENAME TO "Card";
CREATE INDEX "Card_ownerId_characterId_idx" ON "Card"("ownerId", "characterId");
CREATE UNIQUE INDEX "Card_characterId_serial_key" ON "Card"("characterId", "serial");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "BattleTeam_userId_kind_key" ON "BattleTeam"("userId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "BattleTeamSlot_teamId_cardId_key" ON "BattleTeamSlot"("teamId", "cardId");

-- CreateIndex
CREATE INDEX "Battle_userId_status_idx" ON "Battle"("userId", "status");

-- CreateIndex
CREATE INDEX "Battle_status_createdAt_idx" ON "Battle"("status", "createdAt");
