-- Compteur de la 10ᵉ invocation boostée (une carte sur 10, quel que soit le format du lot). Aucun compte existant n'est modifié.
ALTER TABLE "User" ADD COLUMN "cardsSinceBoost" INTEGER NOT NULL DEFAULT 0;
