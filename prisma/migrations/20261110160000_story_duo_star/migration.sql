-- Étoile bonus de l'histoire (v0.3.0) : une victoire en duo devient une 4ᵉ étoile à part.
-- Avant, le 3ᵉ étoile = victoire en duo : ces combats gardent leurs 3 étoiles et reçoivent l'étoile bonus.
ALTER TABLE "StoryStageStar" ADD COLUMN "duo" BOOLEAN NOT NULL DEFAULT false;
UPDATE "StoryStageStar" SET "duo" = true WHERE "stars" >= 3;
