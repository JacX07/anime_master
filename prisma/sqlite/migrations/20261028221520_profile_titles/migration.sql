-- AlterTable
ALTER TABLE "User" ADD COLUMN "title" TEXT;

-- CreateTable
CREATE TABLE "ShowcaseCharacter" (
    "userId" TEXT NOT NULL,
    "characterId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    PRIMARY KEY ("userId", "characterId"),
    CONSTRAINT "ShowcaseCharacter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShowcaseCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
