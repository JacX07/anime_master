-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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

