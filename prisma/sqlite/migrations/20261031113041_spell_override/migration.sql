-- CreateTable
CREATE TABLE "SpellOverride" (
    "characterId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "spell" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "wish" TEXT,
    "updatedAt" DATETIME NOT NULL
);
