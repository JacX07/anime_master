-- AlterTable
ALTER TABLE "Battle" ADD COLUMN "loot" JSONB;

-- CreateTable
CREATE TABLE "StoryProgress" (
    "userId" TEXT NOT NULL,
    "universe" TEXT NOT NULL,
    "maxLevel" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("userId", "universe"),
    CONSTRAINT "StoryProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResourceStock" (
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("userId", "key"),
    CONSTRAINT "ResourceStock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyGain" (
    "userId" TEXT NOT NULL,
    "day" DATETIME NOT NULL,
    "source" TEXT NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("userId", "day", "source"),
    CONSTRAINT "DailyGain_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
