-- CreateEnum
CREATE TYPE "GuildRole" AS ENUM ('OWNER', 'OFFICER', 'MEMBER');

-- CreateEnum
CREATE TYPE "GuildJoinMode" AS ENUM ('OPEN', 'REQUEST');

-- CreateEnum
CREATE TYPE "GuildRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REFUSED');

-- AlterEnum
ALTER TYPE "LedgerReason" ADD VALUE 'GUILD_CREATE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "guildId" TEXT,
ADD COLUMN     "guildLeftAt" TIMESTAMP(3),
ADD COLUMN     "guildRole" "GuildRole" NOT NULL DEFAULT 'MEMBER';

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT 'squads',
    "joinMode" "GuildJoinMode" NOT NULL DEFAULT 'REQUEST',
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildJoinRequest" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "GuildRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Guild_nameKey_key" ON "Guild"("nameKey");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_tag_key" ON "Guild"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_ownerId_key" ON "Guild"("ownerId");

-- CreateIndex
CREATE INDEX "GuildJoinRequest_guildId_status_idx" ON "GuildJoinRequest"("guildId", "status");

-- CreateIndex
CREATE INDEX "GuildJoinRequest_userId_status_idx" ON "GuildJoinRequest"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GuildJoinRequest_guildId_userId_key" ON "GuildJoinRequest"("guildId", "userId");

-- CreateIndex
CREATE INDEX "User_guildId_idx" ON "User"("guildId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guild" ADD CONSTRAINT "Guild_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildJoinRequest" ADD CONSTRAINT "GuildJoinRequest_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildJoinRequest" ADD CONSTRAINT "GuildJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Accès par le serveur uniquement, comme les autres données de jeu privées.
ALTER TABLE "Guild" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GuildJoinRequest" ENABLE ROW LEVEL SECURITY;
