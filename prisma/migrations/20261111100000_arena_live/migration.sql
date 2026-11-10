-- Arène live 4v4 (v0.3.0)
CREATE TYPE "ArenaStatus" AS ENUM ('QUEUED', 'RUNNING', 'DONE', 'ABANDONED');

CREATE TABLE "ArenaMatch" (
    "id" TEXT NOT NULL,
    "playerAId" TEXT NOT NULL,
    "playerBId" TEXT,
    "ghost" BOOLEAN NOT NULL DEFAULT false,
    "status" "ArenaStatus" NOT NULL DEFAULT 'QUEUED',
    "seed" INTEGER NOT NULL,
    "teamA" JSONB NOT NULL,
    "teamB" JSONB,
    "actions" JSONB NOT NULL DEFAULT '[]',
    "steps" INTEGER NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3),
    "missedA" INTEGER NOT NULL DEFAULT 0,
    "missedB" INTEGER NOT NULL DEFAULT 0,
    "winner" TEXT,
    "eloA" INTEGER,
    "eloB" INTEGER,
    "eloChangeA" INTEGER,
    "eloChangeB" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "ArenaMatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArenaMatch_status_createdAt_idx" ON "ArenaMatch"("status", "createdAt");
CREATE INDEX "ArenaMatch_playerAId_status_idx" ON "ArenaMatch"("playerAId", "status");
CREATE INDEX "ArenaMatch_playerBId_status_idx" ON "ArenaMatch"("playerBId", "status");

ALTER TABLE "ArenaMatch" ADD CONSTRAINT "ArenaMatch_playerAId_fkey" FOREIGN KEY ("playerAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArenaMatch" ADD CONSTRAINT "ArenaMatch_playerBId_fkey" FOREIGN KEY ("playerBId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
