-- Paliers de récompense d'étoiles de l'histoire réclamés.
CREATE TABLE "StoryStarClaim" (
    "userId" TEXT NOT NULL,
    "universe" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "claimedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("userId", "universe", "tier"),
    CONSTRAINT "StoryStarClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
