-- CreateTable
CREATE TABLE "Duel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challengerId" TEXT NOT NULL,
    "opponentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptDeadline" DATETIME NOT NULL,
    "playDeadline" DATETIME,
    "resolvedAt" DATETIME,
    "winnerId" TEXT,
    "result" JSONB,
    "eloChangeChallenger" INTEGER,
    "eloChangeOpponent" INTEGER,
    "rewarded" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Duel_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Duel_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DuelSlot" (
    "duelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "cardId" TEXT NOT NULL,
    "characterId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "attack" INTEGER NOT NULL,
    "defense" INTEGER NOT NULL,

    PRIMARY KEY ("duelId", "userId", "position"),
    CONSTRAINT "DuelSlot_duelId_fkey" FOREIGN KEY ("duelId") REFERENCES "Duel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DuelSlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DuelDefense" (
    "duelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,

    PRIMARY KEY ("duelId", "userId"),
    CONSTRAINT "DuelDefense_duelId_fkey" FOREIGN KEY ("duelId") REFERENCES "Duel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DuelDefense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DuelQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "duelId" TEXT NOT NULL,
    "defenderId" TEXT NOT NULL,
    "slotPosition" INTEGER NOT NULL,
    "index" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "prompt" JSONB NOT NULL,
    "choices" JSONB NOT NULL,
    "correctIndex" INTEGER NOT NULL,
    "servedAt" DATETIME,
    "answeredAt" DATETIME,
    "answerIndex" INTEGER,
    CONSTRAINT "DuelQuestion_duelId_fkey" FOREIGN KEY ("duelId") REFERENCES "Duel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "elo" INTEGER NOT NULL DEFAULT 1000,
    "duelsStartedToday" INTEGER NOT NULL DEFAULT 0,
    "duelsStartedDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("balance", "createdAt", "email", "emailVerified", "id", "image", "lastDailyBonusAt", "lastPackAt", "name", "packsBoughtDate", "packsBoughtToday", "packsSinceSSR", "packsSinceUR", "packsStored", "updatedAt", "username") SELECT "balance", "createdAt", "email", "emailVerified", "id", "image", "lastDailyBonusAt", "lastPackAt", "name", "packsBoughtDate", "packsBoughtToday", "packsSinceSSR", "packsSinceUR", "packsStored", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Duel_challengerId_status_idx" ON "Duel"("challengerId", "status");

-- CreateIndex
CREATE INDEX "Duel_opponentId_status_idx" ON "Duel"("opponentId", "status");

-- CreateIndex
CREATE INDEX "Duel_status_acceptDeadline_idx" ON "Duel"("status", "acceptDeadline");

-- CreateIndex
CREATE INDEX "Duel_status_playDeadline_idx" ON "Duel"("status", "playDeadline");

-- CreateIndex
CREATE UNIQUE INDEX "DuelQuestion_duelId_defenderId_slotPosition_index_key" ON "DuelQuestion"("duelId", "defenderId", "slotPosition", "index");
