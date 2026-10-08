-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Media" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titleRomaji" TEXT NOT NULL,
    "titleEnglish" TEXT,
    "titleNative" TEXT,
    "format" TEXT,
    "year" INTEGER,
    "coverUrl" TEXT,
    "popularity" INTEGER NOT NULL,
    "genres" JSONB NOT NULL,
    "tags" JSONB NOT NULL DEFAULT [],
    "studio" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Media" ("coverUrl", "format", "genres", "id", "popularity", "studio", "titleEnglish", "titleNative", "titleRomaji", "updatedAt", "year") SELECT "coverUrl", "format", "genres", "id", "popularity", "studio", "titleEnglish", "titleNative", "titleRomaji", "updatedAt", "year" FROM "Media";
DROP TABLE "Media";
ALTER TABLE "new_Media" RENAME TO "Media";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
