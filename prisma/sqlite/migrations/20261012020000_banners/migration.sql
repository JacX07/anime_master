-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "costKind" TEXT NOT NULL DEFAULT 'NORMAL',
    "weight" REAL NOT NULL DEFAULT 0.5,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BannerCharacter" (
    "bannerId" TEXT NOT NULL,
    "characterId" INTEGER NOT NULL,

    PRIMARY KEY ("bannerId", "characterId"),
    CONSTRAINT "BannerCharacter_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "Banner" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BannerCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SpecialCrystalLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "refId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpecialCrystalLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PackOpening" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lotSize" INTEGER NOT NULL DEFAULT 5,
    "userId" TEXT NOT NULL,
    "pityTriggered" TEXT NOT NULL,
    "bannerId" TEXT,
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PackOpening_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PackOpening_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "Banner" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PackOpening" ("id", "lotSize", "openedAt", "pityTriggered", "userId") SELECT "id", "lotSize", "openedAt", "pityTriggered", "userId" FROM "PackOpening";
DROP TABLE "PackOpening";
ALTER TABLE "new_PackOpening" RENAME TO "PackOpening";
CREATE INDEX "PackOpening_userId_openedAt_idx" ON "PackOpening"("userId", "openedAt");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "crystals" INTEGER NOT NULL DEFAULT 50,
    "crystalsUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cardsSinceSSR" INTEGER NOT NULL DEFAULT 0,
    "cardsSinceUR" INTEGER NOT NULL DEFAULT 0,
    "specialCrystals" INTEGER NOT NULL DEFAULT 0,
    "welcomeDraws" INTEGER NOT NULL DEFAULT 0,
    "welcomeBannerId" TEXT,
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
INSERT INTO "new_User" ("balance", "cardsSinceSSR", "cardsSinceUR", "createdAt", "crystals", "crystalsBoughtDate", "crystalsBoughtToday", "crystalsUpdatedAt", "duelsStartedDate", "duelsStartedToday", "elo", "email", "emailVerified", "id", "image", "lastDailyBonusAt", "name", "updatedAt", "username") SELECT "balance", "cardsSinceSSR", "cardsSinceUR", "createdAt", "crystals", "crystalsBoughtDate", "crystalsBoughtToday", "crystalsUpdatedAt", "duelsStartedDate", "duelsStartedToday", "elo", "email", "emailVerified", "id", "image", "lastDailyBonusAt", "name", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Banner_key_key" ON "Banner"("key");

-- CreateIndex
CREATE INDEX "Banner_costKind_startsAt_endsAt_idx" ON "Banner"("costKind", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "BannerCharacter_characterId_idx" ON "BannerCharacter"("characterId");

-- CreateIndex
CREATE INDEX "SpecialCrystalLedger_userId_createdAt_idx" ON "SpecialCrystalLedger"("userId", "createdAt");

