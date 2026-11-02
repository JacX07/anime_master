-- CreateTable
CREATE TABLE "MechanicJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" INTEGER NOT NULL,
    "wish" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "branch" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "report" TEXT,
    "draft" JSONB,
    "log" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
