-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Rarity" AS ENUM ('N', 'R', 'SR', 'SSR', 'UR');

-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('COMBAT', 'MYSTERE', 'MAGIE', 'COEUR', 'AVENTURE');

-- CreateEnum
CREATE TYPE "CharacterRole" AS ENUM ('MAIN', 'SUPPORTING', 'BACKGROUND');

-- CreateEnum
CREATE TYPE "Finish" AS ENUM ('NORMAL', 'HOLO', 'GOLD');

-- CreateEnum
CREATE TYPE "PityTrigger" AS ENUM ('NONE', 'SSR', 'UR');

-- CreateEnum
CREATE TYPE "BannerCost" AS ENUM ('NORMAL', 'SPECIAL', 'WELCOME');

-- CreateEnum
CREATE TYPE "SpecialCrystalReason" AS ENUM ('ACHIEVEMENT', 'EXPEDITION', 'BANNER_SPEND');

-- CreateEnum
CREATE TYPE "LedgerReason" AS ENUM ('ARTIFACT_UPGRADE', 'QUICK_SELL', 'DAILY', 'PACK_BUY', 'CRYSTAL_BUY', 'BID_HOLD', 'BID_REFUND', 'AUCTION_SALE', 'AUCTION_FEE', 'TRADE_IN', 'TRADE_OUT', 'DUEL_REWARD', 'ACHIEVEMENT', 'EXPEDITION', 'STORY', 'TOWER');

-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REFUSED', 'CANCELLED', 'EXPIRED', 'INVALID');

-- CreateEnum
CREATE TYPE "TradeSide" AS ENUM ('FROM', 'TO');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('ACTIVE', 'SOLD', 'UNSOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DuelStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DONE', 'DECLINED', 'EXPIRED', 'FORFEIT');

-- CreateEnum
CREATE TYPE "ExpeditionStatus" AS ENUM ('RUNNING', 'CLAIMED');

-- CreateEnum
CREATE TYPE "TeamKind" AS ENUM ('ATTACK', 'DEFENSE');

-- CreateEnum
CREATE TYPE "BattleMode" AS ENUM ('TEST', 'STORY', 'RAID', 'TOWER', 'DUNGEON', 'ARENA');

-- CreateEnum
CREATE TYPE "BattleStatus" AS ENUM ('RUNNING', 'DONE', 'ABANDONED');

-- CreateTable
CREATE TABLE "Character" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nameNative" TEXT,
    "imageUrl" TEXT NOT NULL,
    "descriptionRaw" TEXT,
    "description" TEXT,
    "gender" TEXT,
    "age" TEXT,
    "birthMonth" INTEGER,
    "birthDay" INTEGER,
    "favourites" INTEGER NOT NULL,
    "rarity" "Rarity" NOT NULL,
    "type" "CardType" NOT NULL,
    "attack" INTEGER NOT NULL,
    "defense" INTEGER NOT NULL,
    "power" INTEGER NOT NULL DEFAULT 0,
    "mainMediaId" INTEGER,
    "mainRole" "CharacterRole" NOT NULL,
    "pullCount" INTEGER NOT NULL DEFAULT 0,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" INTEGER NOT NULL,
    "titleRomaji" TEXT NOT NULL,
    "titleEnglish" TEXT,
    "titleNative" TEXT,
    "format" TEXT,
    "year" INTEGER,
    "coverUrl" TEXT,
    "popularity" INTEGER NOT NULL,
    "genres" JSONB NOT NULL,
    "tags" JSONB,
    "studio" TEXT,
    "franchiseId" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterMedia" (
    "characterId" INTEGER NOT NULL,
    "mediaId" INTEGER NOT NULL,
    "role" "CharacterRole" NOT NULL,

    CONSTRAINT "CharacterMedia_pkey" PRIMARY KEY ("characterId","mediaId")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "crystals" INTEGER NOT NULL DEFAULT 30,
    "crystalsUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cardsSinceSSR" INTEGER NOT NULL DEFAULT 0,
    "cardsSinceUR" INTEGER NOT NULL DEFAULT 0,
    "specialCrystals" INTEGER NOT NULL DEFAULT 0,
    "welcomeDraws" INTEGER NOT NULL DEFAULT 20,
    "welcomeBannerId" TEXT,
    "expeditionsDone" INTEGER NOT NULL DEFAULT 0,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lastDailyBonusAt" TIMESTAMP(3),
    "crystalsBoughtToday" INTEGER NOT NULL DEFAULT 0,
    "crystalsBoughtDate" TIMESTAMP(3),
    "title" TEXT,
    "elo" INTEGER NOT NULL DEFAULT 1000,
    "duelsStartedToday" INTEGER NOT NULL DEFAULT 0,
    "duelsStartedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "characterId" INTEGER NOT NULL,
    "finish" "Finish" NOT NULL,
    "serial" INTEGER NOT NULL,
    "rarityAtPull" "Rarity" NOT NULL,
    "packOpeningId" TEXT NOT NULL,
    "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "forTrade" BOOLEAN NOT NULL DEFAULT false,
    "inAuction" BOOLEAN NOT NULL DEFAULT false,
    "inExpedition" BOOLEAN NOT NULL DEFAULT false,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "weaponKey" TEXT,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackOpening" (
    "id" TEXT NOT NULL,
    "lotSize" INTEGER NOT NULL DEFAULT 5,
    "userId" TEXT NOT NULL,
    "pityTriggered" "PityTrigger" NOT NULL,
    "bannerId" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackOpening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "costKind" "BannerCost" NOT NULL DEFAULT 'NORMAL',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BannerCharacter" (
    "bannerId" TEXT NOT NULL,
    "characterId" INTEGER NOT NULL,

    CONSTRAINT "BannerCharacter_pkey" PRIMARY KEY ("bannerId","characterId")
);

-- CreateTable
CREATE TABLE "SpecialCrystalLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "SpecialCrystalReason" NOT NULL,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecialCrystalLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrencyLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "LedgerReason" NOT NULL,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CurrencyLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "fromCurrency" INTEGER NOT NULL DEFAULT 0,
    "toCurrency" INTEGER NOT NULL DEFAULT 0,
    "status" "TradeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeItem" (
    "tradeId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "side" "TradeSide" NOT NULL,

    CONSTRAINT "TradeItem_pkey" PRIMARY KEY ("tradeId","cardId")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auction" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "startPrice" INTEGER NOT NULL,
    "buyNowPrice" INTEGER,
    "currentBid" INTEGER,
    "currentBidderId" TEXT,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "AuctionStatus" NOT NULL DEFAULT 'ACTIVE',
    "finalPrice" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Auction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "bidderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" INTEGER NOT NULL,
    "finish" "Finish",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowcaseCharacter" (
    "userId" TEXT NOT NULL,
    "characterId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "ShowcaseCharacter_pkey" PRIMARY KEY ("userId","characterId")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("userId","key")
);

-- CreateTable
CREATE TABLE "Duel" (
    "id" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "opponentId" TEXT NOT NULL,
    "status" "DuelStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptDeadline" TIMESTAMP(3) NOT NULL,
    "playDeadline" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "winnerId" TEXT,
    "result" JSONB,
    "eloChangeChallenger" INTEGER,
    "eloChangeOpponent" INTEGER,
    "rewarded" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Duel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuelSlot" (
    "duelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "cardId" TEXT NOT NULL,
    "characterId" INTEGER NOT NULL,
    "type" "CardType" NOT NULL,
    "attack" INTEGER NOT NULL,
    "defense" INTEGER NOT NULL,

    CONSTRAINT "DuelSlot_pkey" PRIMARY KEY ("duelId","userId","position")
);

-- CreateTable
CREATE TABLE "DuelDefense" (
    "duelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "DuelDefense_pkey" PRIMARY KEY ("duelId","userId")
);

-- CreateTable
CREATE TABLE "DuelQuestion" (
    "id" TEXT NOT NULL,
    "duelId" TEXT NOT NULL,
    "defenderId" TEXT NOT NULL,
    "slotPosition" INTEGER NOT NULL,
    "index" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "prompt" JSONB NOT NULL,
    "choices" JSONB NOT NULL,
    "correctIndex" INTEGER NOT NULL,
    "servedAt" TIMESTAMP(3),
    "answeredAt" TIMESTAMP(3),
    "answerIndex" INTEGER,

    CONSTRAINT "DuelQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expedition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "breachId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "seed" INTEGER NOT NULL,
    "status" "ExpeditionStatus" NOT NULL DEFAULT 'RUNNING',
    "outcome" TEXT,
    "ryo" INTEGER NOT NULL DEFAULT 0,
    "crystals" INTEGER NOT NULL DEFAULT 0,
    "special" INTEGER NOT NULL DEFAULT 0,
    "claimedAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "Expedition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpeditionCard" (
    "id" TEXT NOT NULL,
    "expeditionId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "characterId" INTEGER NOT NULL,
    "type" "CardType" NOT NULL,
    "power" INTEGER NOT NULL,

    CONSTRAINT "ExpeditionCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleTeam" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "TeamKind" NOT NULL,

    CONSTRAINT "BattleTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Squad" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cardIds" JSONB NOT NULL,

    CONSTRAINT "Squad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleTeamSlot" (
    "teamId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "cardId" TEXT NOT NULL,

    CONSTRAINT "BattleTeamSlot_pkey" PRIMARY KEY ("teamId","position")
);

-- CreateTable
CREATE TABLE "Battle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "BattleMode" NOT NULL,
    "opponent" TEXT NOT NULL,
    "manual" BOOLEAN NOT NULL,
    "seed" INTEGER NOT NULL,
    "teams" JSONB NOT NULL,
    "actions" JSONB NOT NULL DEFAULT '[]',
    "steps" INTEGER NOT NULL DEFAULT 0,
    "status" "BattleStatus" NOT NULL DEFAULT 'RUNNING',
    "winner" TEXT,
    "log" JSONB,
    "loot" JSONB,
    "storyStars" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Battle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryProgress" (
    "userId" TEXT NOT NULL,
    "universe" TEXT NOT NULL,
    "maxLevel" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StoryProgress_pkey" PRIMARY KEY ("userId","universe")
);

-- CreateTable
CREATE TABLE "StoryStageStar" (
    "userId" TEXT NOT NULL,
    "universe" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "stars" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StoryStageStar_pkey" PRIMARY KEY ("userId","universe","level")
);

-- CreateTable
CREATE TABLE "StoryStarClaim" (
    "userId" TEXT NOT NULL,
    "universe" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryStarClaim_pkey" PRIMARY KEY ("userId","universe","tier")
);

-- CreateTable
CREATE TABLE "TowerProgress" (
    "userId" TEXT NOT NULL,
    "maxFloor" INTEGER NOT NULL DEFAULT 0,
    "reachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TowerProgress_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ResourceStock" (
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ResourceStock_pkey" PRIMARY KEY ("userId","key")
);

-- CreateTable
CREATE TABLE "RaidBest" (
    "userId" TEXT NOT NULL,
    "boss" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "bestShare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "won" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaidBest_pkey" PRIMARY KEY ("userId","boss","difficulty")
);

-- CreateTable
CREATE TABLE "DailyGain" (
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyGain_pkey" PRIMARY KEY ("userId","day","source")
);

-- CreateTable
CREATE TABLE "DungeonProgress" (
    "userId" TEXT NOT NULL,
    "dungeon" TEXT NOT NULL,
    "maxLevel" INTEGER NOT NULL DEFAULT 0,
    "nextSlot" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DungeonProgress_pkey" PRIMARY KEY ("userId","dungeon")
);

-- CreateTable
CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "setKey" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "rarity" "Rarity" NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "mainStat" TEXT NOT NULL,
    "mainValue" DOUBLE PRECISION NOT NULL,
    "subStats" JSONB NOT NULL DEFAULT '[]',
    "equippedCardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpellOverride" (
    "characterId" INTEGER NOT NULL,
    "spell" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "wish" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpellOverride_pkey" PRIMARY KEY ("characterId")
);

-- CreateTable
CREATE TABLE "MechanicJob" (
    "id" TEXT NOT NULL,
    "characterId" INTEGER NOT NULL,
    "wish" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "branch" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "report" TEXT,
    "draft" JSONB,
    "log" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MechanicJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdventureRecord" (
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdventureRecord_pkey" PRIMARY KEY ("userId","key")
);

-- CreateIndex
CREATE INDEX "Character_rarity_idx" ON "Character"("rarity");

-- CreateIndex
CREATE INDEX "Character_type_idx" ON "Character"("type");

-- CreateIndex
CREATE INDEX "Character_favourites_idx" ON "Character"("favourites");

-- CreateIndex
CREATE INDEX "Media_franchiseId_idx" ON "Media"("franchiseId");

-- CreateIndex
CREATE INDEX "CharacterMedia_mediaId_idx" ON "CharacterMedia"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE INDEX "Card_ownerId_characterId_idx" ON "Card"("ownerId", "characterId");

-- CreateIndex
CREATE UNIQUE INDEX "Card_characterId_serial_key" ON "Card"("characterId", "serial");

-- CreateIndex
CREATE INDEX "PackOpening_userId_openedAt_idx" ON "PackOpening"("userId", "openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Banner_key_key" ON "Banner"("key");

-- CreateIndex
CREATE INDEX "Banner_costKind_startsAt_endsAt_idx" ON "Banner"("costKind", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "BannerCharacter_characterId_idx" ON "BannerCharacter"("characterId");

-- CreateIndex
CREATE INDEX "SpecialCrystalLedger_userId_createdAt_idx" ON "SpecialCrystalLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CurrencyLedger_userId_createdAt_idx" ON "CurrencyLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Trade_fromId_status_idx" ON "Trade"("fromId", "status");

-- CreateIndex
CREATE INDEX "Trade_toId_status_idx" ON "Trade"("toId", "status");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Auction_status_endsAt_idx" ON "Auction"("status", "endsAt");

-- CreateIndex
CREATE INDEX "Auction_sellerId_status_idx" ON "Auction"("sellerId", "status");

-- CreateIndex
CREATE INDEX "Auction_cardId_idx" ON "Auction"("cardId");

-- CreateIndex
CREATE INDEX "Bid_auctionId_createdAt_idx" ON "Bid"("auctionId", "createdAt");

-- CreateIndex
CREATE INDEX "WishlistItem_characterId_idx" ON "WishlistItem"("characterId");

-- CreateIndex
CREATE INDEX "WishlistItem_userId_idx" ON "WishlistItem"("userId");

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

-- CreateIndex
CREATE INDEX "Expedition_userId_status_idx" ON "Expedition"("userId", "status");

-- CreateIndex
CREATE INDEX "Expedition_status_endsAt_idx" ON "Expedition"("status", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "BattleTeam_userId_kind_key" ON "BattleTeam"("userId", "kind");

-- CreateIndex
CREATE INDEX "Squad_userId_idx" ON "Squad"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BattleTeamSlot_teamId_cardId_key" ON "BattleTeamSlot"("teamId", "cardId");

-- CreateIndex
CREATE INDEX "Battle_userId_status_idx" ON "Battle"("userId", "status");

-- CreateIndex
CREATE INDEX "Battle_status_createdAt_idx" ON "Battle"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TowerProgress_maxFloor_idx" ON "TowerProgress"("maxFloor");

-- CreateIndex
CREATE INDEX "Artifact_userId_setKey_slot_idx" ON "Artifact"("userId", "setKey", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "Artifact_userId_equippedCardId_slot_key" ON "Artifact"("userId", "equippedCardId", "slot");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_mainMediaId_fkey" FOREIGN KEY ("mainMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterMedia" ADD CONSTRAINT "CharacterMedia_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterMedia" ADD CONSTRAINT "CharacterMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_packOpeningId_fkey" FOREIGN KEY ("packOpeningId") REFERENCES "PackOpening"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackOpening" ADD CONSTRAINT "PackOpening_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackOpening" ADD CONSTRAINT "PackOpening_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "Banner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BannerCharacter" ADD CONSTRAINT "BannerCharacter_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "Banner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BannerCharacter" ADD CONSTRAINT "BannerCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialCrystalLedger" ADD CONSTRAINT "SpecialCrystalLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurrencyLedger" ADD CONSTRAINT "CurrencyLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeItem" ADD CONSTRAINT "TradeItem_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeItem" ADD CONSTRAINT "TradeItem_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_currentBidderId_fkey" FOREIGN KEY ("currentBidderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowcaseCharacter" ADD CONSTRAINT "ShowcaseCharacter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowcaseCharacter" ADD CONSTRAINT "ShowcaseCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Duel" ADD CONSTRAINT "Duel_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Duel" ADD CONSTRAINT "Duel_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuelSlot" ADD CONSTRAINT "DuelSlot_duelId_fkey" FOREIGN KEY ("duelId") REFERENCES "Duel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuelSlot" ADD CONSTRAINT "DuelSlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuelDefense" ADD CONSTRAINT "DuelDefense_duelId_fkey" FOREIGN KEY ("duelId") REFERENCES "Duel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuelDefense" ADD CONSTRAINT "DuelDefense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuelQuestion" ADD CONSTRAINT "DuelQuestion_duelId_fkey" FOREIGN KEY ("duelId") REFERENCES "Duel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expedition" ADD CONSTRAINT "Expedition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpeditionCard" ADD CONSTRAINT "ExpeditionCard_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "Expedition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpeditionCard" ADD CONSTRAINT "ExpeditionCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleTeam" ADD CONSTRAINT "BattleTeam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Squad" ADD CONSTRAINT "Squad_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleTeamSlot" ADD CONSTRAINT "BattleTeamSlot_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "BattleTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleTeamSlot" ADD CONSTRAINT "BattleTeamSlot_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryProgress" ADD CONSTRAINT "StoryProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryStageStar" ADD CONSTRAINT "StoryStageStar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryStarClaim" ADD CONSTRAINT "StoryStarClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TowerProgress" ADD CONSTRAINT "TowerProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceStock" ADD CONSTRAINT "ResourceStock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidBest" ADD CONSTRAINT "RaidBest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyGain" ADD CONSTRAINT "DailyGain_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DungeonProgress" ADD CONSTRAINT "DungeonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_equippedCardId_fkey" FOREIGN KEY ("equippedCardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdventureRecord" ADD CONSTRAINT "AdventureRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
