-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Character" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "nameNative" TEXT,
    "imageUrl" TEXT NOT NULL,
    "descriptionRaw" TEXT,
    "description" TEXT,
    "gender" TEXT,
    "age" TEXT,
    "birthMonth" INTEGER,
    "birthDay" INTEGER,
    "favourites" INTEGER NOT NULL,
    "rarity" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "attack" INTEGER NOT NULL,
    "defense" INTEGER NOT NULL,
    "power" INTEGER NOT NULL DEFAULT 0,
    "mainMediaId" INTEGER,
    "mainRole" TEXT NOT NULL,
    "pullCount" INTEGER NOT NULL DEFAULT 0,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Character_mainMediaId_fkey" FOREIGN KEY ("mainMediaId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Character" ("age", "attack", "birthDay", "birthMonth", "createdAt", "defense", "description", "descriptionRaw", "disabled", "favourites", "gender", "id", "imageUrl", "mainMediaId", "mainRole", "name", "nameNative", "pullCount", "rarity", "type", "updatedAt") SELECT "age", "attack", "birthDay", "birthMonth", "createdAt", "defense", "description", "descriptionRaw", "disabled", "favourites", "gender", "id", "imageUrl", "mainMediaId", "mainRole", "name", "nameNative", "pullCount", "rarity", "type", "updatedAt" FROM "Character";
DROP TABLE "Character";
ALTER TABLE "new_Character" RENAME TO "Character";
CREATE INDEX "Character_rarity_idx" ON "Character"("rarity");
CREATE INDEX "Character_type_idx" ON "Character"("type");
CREATE INDEX "Character_favourites_idx" ON "Character"("favourites");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
