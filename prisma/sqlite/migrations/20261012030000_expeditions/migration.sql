-- CreateTable
CREATE TABLE "Expedition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "breachId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME NOT NULL,
    "seed" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "outcome" TEXT,
    "ryo" INTEGER NOT NULL DEFAULT 0,
    "crystals" INTEGER NOT NULL DEFAULT 0,
    "special" INTEGER NOT NULL DEFAULT 0,
    "claimedAt" DATETIME,
    "notifiedAt" DATETIME,
    CONSTRAINT "Expedition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpeditionCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expeditionId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "characterId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "power" INTEGER NOT NULL,
    CONSTRAINT "ExpeditionCard_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "Expedition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExpeditionCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    CONSTRAINT "Card_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Card_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Card_packOpeningId_fkey" FOREIGN KEY ("packOpeningId") REFERENCES "PackOpening" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Card" ("characterId", "finish", "forTrade", "id", "inAuction", "locked", "obtainedAt", "ownerId", "packOpeningId", "rarityAtPull", "serial") SELECT "characterId", "finish", "forTrade", "id", "inAuction", "locked", "obtainedAt", "ownerId", "packOpeningId", "rarityAtPull", "serial" FROM "Card";
DROP TABLE "Card";
ALTER TABLE "new_Card" RENAME TO "Card";
CREATE INDEX "Card_ownerId_characterId_idx" ON "Card"("ownerId", "characterId");
CREATE UNIQUE INDEX "Card_characterId_serial_key" ON "Card"("characterId", "serial");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "crystals" INTEGER NOT NULL DEFAULT 30,
    "crystalsUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cardsSinceSSR" INTEGER NOT NULL DEFAULT 0,
    "cardsSinceUR" INTEGER NOT NULL DEFAULT 0,
    "specialCrystals" INTEGER NOT NULL DEFAULT 0,
    "welcomeDraws" INTEGER NOT NULL DEFAULT 20,
    "welcomeBannerId" TEXT,
    "expeditionsDone" INTEGER NOT NULL DEFAULT 0,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lastDailyBonusAt" DATETIME,
    "crystalsBoughtToday" INTEGER NOT NULL DEFAULT 0,
    "crystalsBoughtDate" DATETIME,
    "elo" INTEGER NOT NULL DEFAULT 1000,
    "duelsStartedToday" INTEGER NOT NULL DEFAULT 0,
    "duelsStartedDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("balance", "cardsSinceSSR", "cardsSinceUR", "createdAt", "crystals", "crystalsBoughtDate", "crystalsBoughtToday", "crystalsUpdatedAt", "duelsStartedDate", "duelsStartedToday", "elo", "email", "emailVerified", "id", "image", "lastDailyBonusAt", "name", "specialCrystals", "updatedAt", "username", "welcomeBannerId", "welcomeDraws") SELECT "balance", "cardsSinceSSR", "cardsSinceUR", "createdAt", "crystals", "crystalsBoughtDate", "crystalsBoughtToday", "crystalsUpdatedAt", "duelsStartedDate", "duelsStartedToday", "elo", "email", "emailVerified", "id", "image", "lastDailyBonusAt", "name", "specialCrystals", "updatedAt", "username", "welcomeBannerId", "welcomeDraws" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Expedition_userId_status_idx" ON "Expedition"("userId", "status");

-- CreateIndex
CREATE INDEX "Expedition_status_endsAt_idx" ON "Expedition"("status", "endsAt");

