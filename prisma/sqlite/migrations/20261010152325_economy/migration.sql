-- CreateTable
CREATE TABLE "CurrencyLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "refId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CurrencyLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    CONSTRAINT "Card_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Card_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Card_packOpeningId_fkey" FOREIGN KEY ("packOpeningId") REFERENCES "PackOpening" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Card" ("characterId", "finish", "id", "obtainedAt", "ownerId", "packOpeningId", "rarityAtPull", "serial") SELECT "characterId", "finish", "id", "obtainedAt", "ownerId", "packOpeningId", "rarityAtPull", "serial" FROM "Card";
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
    "packsStored" INTEGER NOT NULL DEFAULT 10,
    "lastPackAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "packsSinceSSR" INTEGER NOT NULL DEFAULT 0,
    "packsSinceUR" INTEGER NOT NULL DEFAULT 0,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lastDailyBonusAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "emailVerified", "id", "image", "lastPackAt", "name", "packsSinceSSR", "packsSinceUR", "packsStored", "updatedAt", "username") SELECT "createdAt", "email", "emailVerified", "id", "image", "lastPackAt", "name", "packsSinceSSR", "packsSinceUR", "packsStored", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CurrencyLedger_userId_createdAt_idx" ON "CurrencyLedger"("userId", "createdAt");
