-- Lot 3 (v0.3.0) : favoris, sauvegardes d'équipement, photo de profil. Ajouts seulement.
ALTER TABLE "User" ADD COLUMN "avatarCharacterId" INTEGER;

CREATE TABLE "FavoriteCharacter" (
    "userId" TEXT NOT NULL,
    "characterId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FavoriteCharacter_pkey" PRIMARY KEY ("userId","characterId")
);
ALTER TABLE "FavoriteCharacter" ADD CONSTRAINT "FavoriteCharacter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FavoriteCharacter" ADD CONSTRAINT "FavoriteCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "GearPreset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "artifactIds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GearPreset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GearPreset_userId_idx" ON "GearPreset"("userId");
ALTER TABLE "GearPreset" ADD CONSTRAINT "GearPreset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tables de jeu privées : aucune lecture publique via l'API Supabase (même règle que les autres tables).
ALTER TABLE "FavoriteCharacter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GearPreset" ENABLE ROW LEVEL SECURITY;
