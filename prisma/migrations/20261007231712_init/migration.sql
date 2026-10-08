-- CreateTable
CREATE TABLE "Character" (
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
    "mainMediaId" INTEGER,
    "mainRole" TEXT NOT NULL,
    "pullCount" INTEGER NOT NULL DEFAULT 0,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Character_mainMediaId_fkey" FOREIGN KEY ("mainMediaId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Media" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titleRomaji" TEXT NOT NULL,
    "titleEnglish" TEXT,
    "titleNative" TEXT,
    "format" TEXT,
    "year" INTEGER,
    "coverUrl" TEXT,
    "popularity" INTEGER NOT NULL,
    "genres" JSONB NOT NULL,
    "studio" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CharacterMedia" (
    "characterId" INTEGER NOT NULL,
    "mediaId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,

    PRIMARY KEY ("characterId", "mediaId"),
    CONSTRAINT "CharacterMedia_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CharacterMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Character_rarity_idx" ON "Character"("rarity");

-- CreateIndex
CREATE INDEX "Character_type_idx" ON "Character"("type");

-- CreateIndex
CREATE INDEX "Character_favourites_idx" ON "Character"("favourites");

-- CreateIndex
CREATE INDEX "CharacterMedia_mediaId_idx" ON "CharacterMedia"("mediaId");
