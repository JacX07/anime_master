-- CreateTable
CREATE TABLE "TowerProgress" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "maxFloor" INTEGER NOT NULL DEFAULT 0,
    "reachedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TowerProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TowerProgress_maxFloor_idx" ON "TowerProgress"("maxFloor");
