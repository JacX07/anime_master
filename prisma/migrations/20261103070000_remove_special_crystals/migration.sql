-- Suppression des cristaux spéciaux (décision du 2026-11-03).
-- Rien n'est perdu : les cristaux spéciaux déjà possédés deviennent des cristaux normaux.
UPDATE "User" SET "crystals" = "crystals" + "specialCrystals" WHERE "specialCrystals" > 0;

-- Les bannières d'événement se paient désormais en cristaux normaux.
UPDATE "Banner" SET "costKind" = 'NORMAL' WHERE "costKind" = 'SPECIAL';

ALTER TABLE "User" DROP COLUMN "specialCrystals";
ALTER TABLE "Expedition" DROP COLUMN "special";
DROP TABLE "SpecialCrystalLedger";
DROP TYPE "SpecialCrystalReason";

-- Retrait de la valeur SPECIAL de l'énumération BannerCost
CREATE TYPE "BannerCost_new" AS ENUM ('NORMAL', 'WELCOME');
ALTER TABLE "Banner" ALTER COLUMN "costKind" DROP DEFAULT;
ALTER TABLE "Banner" ALTER COLUMN "costKind" TYPE "BannerCost_new" USING ("costKind"::text::"BannerCost_new");
ALTER TABLE "Banner" ALTER COLUMN "costKind" SET DEFAULT 'NORMAL';
DROP TYPE "BannerCost";
ALTER TYPE "BannerCost_new" RENAME TO "BannerCost";
