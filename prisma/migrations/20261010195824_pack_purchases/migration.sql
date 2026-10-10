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
    "packsStored" INTEGER NOT NULL DEFAULT 10,
    "lastPackAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "packsSinceSSR" INTEGER NOT NULL DEFAULT 0,
    "packsSinceUR" INTEGER NOT NULL DEFAULT 0,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lastDailyBonusAt" DATETIME,
    "packsBoughtToday" INTEGER NOT NULL DEFAULT 0,
    "packsBoughtDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("balance", "createdAt", "email", "emailVerified", "id", "image", "lastDailyBonusAt", "lastPackAt", "name", "packsSinceSSR", "packsSinceUR", "packsStored", "updatedAt", "username") SELECT "balance", "createdAt", "email", "emailVerified", "id", "image", "lastDailyBonusAt", "lastPackAt", "name", "packsSinceSSR", "packsSinceUR", "packsStored", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
