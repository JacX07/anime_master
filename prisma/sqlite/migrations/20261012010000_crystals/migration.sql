-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PackOpening" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lotSize" INTEGER NOT NULL DEFAULT 5,
    "userId" TEXT NOT NULL,
    "pityTriggered" TEXT NOT NULL,
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PackOpening_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PackOpening" ("id", "openedAt", "pityTriggered", "userId") SELECT "id", "openedAt", "pityTriggered", "userId" FROM "PackOpening";
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
-- Conversion des données : 1 paquet = 5 cristaux, 1 compteur de pity en paquets = 5 cartes
INSERT INTO "new_User" ("balance", "createdAt", "crystals", "crystalsBoughtDate", "crystalsBoughtToday", "crystalsUpdatedAt", "cardsSinceSSR", "cardsSinceUR", "duelsStartedDate", "duelsStartedToday", "elo", "email", "emailVerified", "id", "image", "lastDailyBonusAt", "name", "updatedAt", "username") SELECT "balance", "createdAt", "packsStored" * 5, "packsBoughtDate", "packsBoughtToday" * 5, "lastPackAt", "packsSinceSSR" * 5, "packsSinceUR" * 5, "duelsStartedDate", "duelsStartedToday", "elo", "email", "emailVerified", "id", "image", "lastDailyBonusAt", "name", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

