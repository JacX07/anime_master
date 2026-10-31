-- CreateTable
CREATE TABLE "RaidBest" (
    "userId" TEXT NOT NULL,
    "boss" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "bestShare" REAL NOT NULL DEFAULT 0,
    "won" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "boss", "difficulty"),
    CONSTRAINT "RaidBest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
