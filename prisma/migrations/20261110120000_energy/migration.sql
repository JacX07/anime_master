-- Énergie (v0.3.0) : réserve du joueur et énergie payée par combat (rendue en cas de défaite). Ajouts seulement.
ALTER TABLE "User" ADD COLUMN "energy" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "User" ADD COLUMN "energyUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Battle" ADD COLUMN "energy" INTEGER NOT NULL DEFAULT 0;
