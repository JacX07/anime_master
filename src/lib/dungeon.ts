// Donjon (mode temporaire de test) : l'équipe du joueur contre 4 personnages tirés au hasard, de raretés proches.
// Rien n'est enregistré ni récompensé : même graine = même ennemis et même combat.

import "server-only";
import type { CardType, Rarity } from "../generated/prisma/enums";
import { battle, seededRandom, type BattleCard, type BattleEvent } from "./battle";
import { prisma } from "./db";
import { getAttackTeam } from "./battles";

export interface DungeonCharacter {
  name: string;
  imageUrl: string;
  rarity: Rarity;
  type: CardType;
  series: string | null;
}

const SELECT = {
  id: true, name: true, imageUrl: true, rarity: true, type: true, attack: true, defense: true, power: true, mainMediaId: true,
  mainMedia: { select: { franchiseId: true, titleEnglish: true, titleRomaji: true } },
} as const;

/** null si le joueur n'a pas 4 personnages différents. */
export async function dungeonBattle(userId: string, seed: number) {
  const rng = seededRandom(seed);
  const mine: { card: BattleCard; info: DungeonCharacter }[] = [];

  const toCard = (c: { id: number; rarity: Rarity; type: CardType; attack: number; defense: number; power: number; mainMediaId: number | null; mainMedia: { franchiseId: number | null } | null }, stars: number): BattleCard => ({
    characterId: c.id, rarity: c.rarity, type: c.type, attack: c.attack, defense: c.defense, power: c.power,
    franchiseId: c.mainMedia?.franchiseId ?? c.mainMediaId, stars, weapon: null,
  });
  const info = (c: { name: string; imageUrl: string; rarity: Rarity; type: CardType; mainMedia: { titleEnglish: string | null; titleRomaji: string | null } | null }): DungeonCharacter => ({
    name: c.name, imageUrl: c.imageUrl, rarity: c.rarity, type: c.type, series: c.mainMedia?.titleEnglish ?? c.mainMedia?.titleRomaji ?? null,
  });

  // Équipe d'attaque si elle est complète, sinon les 4 personnages les plus puissants de la collection
  const team = await getAttackTeam(userId);
  if (team.every((s) => s)) {
    for (const s of team) {
      const c = await prisma.character.findUniqueOrThrow({ where: { id: s!.character.id }, select: SELECT });
      mine.push({ card: toCard(c, s!.stars), info: info(c) });
    }
  } else {
    const cards = await prisma.card.findMany({
      where: { ownerId: userId },
      orderBy: [{ character: { power: "desc" } }, { id: "asc" }],
      select: { stars: true, character: { select: SELECT } },
      take: 40,
    });
    const seen = new Set<number>();
    for (const c of cards) {
      if (seen.has(c.character.id)) continue;
      seen.add(c.character.id);
      mine.push({ card: toCard(c.character, c.stars), info: info(c.character) });
      if (mine.length === 4) break;
    }
  }
  if (mine.length < 4) return null;

  // Ennemis : une rareté par carte du joueur, dans le désordre, avec un personnage au hasard
  const rarities = mine.map((m) => m.card.rarity).sort(() => rng() - 0.5);
  const used = new Set(mine.map((m) => m.card.characterId));
  const foes: { card: BattleCard; info: DungeonCharacter }[] = [];
  for (const rarity of rarities) {
    const where = { disabled: false, rarity, id: { notIn: [...used] } };
    const count = await prisma.character.count({ where });
    const c = await prisma.character.findFirst({ where, skip: Math.floor(rng() * count), orderBy: { id: "asc" }, select: SELECT });
    if (!c) throw new Error(`Aucun personnage de rareté ${rarity}`);
    used.add(c.id);
    foes.push({ card: toCard(c, 0), info: info(c) });
  }

  const result = battle(mine.map((m) => m.card), foes.map((f) => f.card), rng);
  const characters: Record<number, DungeonCharacter> = {};
  for (const x of [...mine, ...foes]) characters[x.card.characterId] = x.info;
  return { log: result.log as BattleEvent[], characters };
}
