CREATE TABLE "DungeonProgress" (
  "userId" TEXT NOT NULL,
  "dungeon" TEXT NOT NULL,
  "maxLevel" INTEGER NOT NULL DEFAULT 0,
  "nextSlot" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "DungeonProgress_pkey" PRIMARY KEY ("userId", "dungeon"),
  CONSTRAINT "DungeonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "Artifact" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "setKey" TEXT NOT NULL,
  "slot" TEXT NOT NULL,
  "rarity" TEXT NOT NULL,
  "level" INTEGER NOT NULL DEFAULT 0,
  "mainStat" TEXT NOT NULL,
  "mainValue" REAL NOT NULL,
  "subStats" TEXT NOT NULL DEFAULT '[]',
  "equippedCardId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Artifact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Artifact_equippedCardId_fkey" FOREIGN KEY ("equippedCardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Artifact_userId_equippedCardId_slot_key" ON "Artifact"("userId", "equippedCardId", "slot");
CREATE INDEX "Artifact_userId_setKey_slot_idx" ON "Artifact"("userId", "setKey", "slot");
