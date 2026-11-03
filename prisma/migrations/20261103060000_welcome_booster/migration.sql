-- AlterTable : booster de bienvenue ×10 (SPEC collection §8 ter). Nullable : aucun compte existant n'est modifié.
ALTER TABLE "User" ADD COLUMN "welcomeBoosterClaimedAt" TIMESTAMP(3);
