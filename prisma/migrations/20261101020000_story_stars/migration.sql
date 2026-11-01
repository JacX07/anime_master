-- Add per-stage best score and preserve every already cleared stage at one star.
ALTER TABLE "Battle" ADD COLUMN "storyStars" INTEGER;

CREATE TABLE "StoryStageStar" (
    "userId" TEXT NOT NULL,
    "universe" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "stars" INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY ("userId", "universe", "level"),
    CONSTRAINT "StoryStageStar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

WITH RECURSIVE levels(level) AS (
    SELECT 1
    UNION ALL SELECT level + 1 FROM levels WHERE level < 15
)
INSERT INTO "StoryStageStar" ("userId", "universe", "level", "stars")
SELECT progress."userId", progress."universe", levels.level, 1
FROM "StoryProgress" progress CROSS JOIN levels
WHERE levels.level <= progress."maxLevel";
