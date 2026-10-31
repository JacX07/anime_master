// Combat de démonstration pour la page de test du lecteur : 8 cartes tirées de la base avec une graine, jouées par battle().
// Même graine = mêmes équipes et même combat.

import "server-only";
import type { CardType, Rarity } from "../generated/prisma/enums";
import { battle, type BattleCard, type BattleEvent, type Random } from "./battle";
import { prisma } from "./db";

export function seededRandom(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ce que le lecteur affiche d'un personnage (le journal ne contient que son identifiant). */
export interface DemoCharacter {
  name: string;
  imageUrl: string;
  rarity: Rarity;
  type: CardType;
  series: string | null;
}

/** Rareté de chaque emplacement : surtout du milieu de gamme, quelques UR pour voir les effets de haut niveau. */
const RARITY_WEIGHTS: [Rarity, number][] = [["N", 1], ["R", 2], ["SR", 3], ["SSR", 3], ["UR", 2]];

function pickRarity(rng: Random): Rarity {
  const total = RARITY_WEIGHTS.reduce((n, [, w]) => n + w, 0);
  let x = rng() * total;
  for (const [r, w] of RARITY_WEIGHTS) if ((x -= w) < 0) return r;
  return "SR";
}

export async function demoBattle(seed: number): Promise<{ log: BattleEvent[]; characters: Record<number, DemoCharacter> }> {
  const rng = seededRandom(seed);
  const used = new Set<number>();
  const cards: BattleCard[] = [];
  const characters: Record<number, DemoCharacter> = {};
  for (let i = 0; i < 8; i++) {
    const rarity = pickRarity(rng);
    const where = { disabled: false, rarity, id: { notIn: [...used] } };
    const count = await prisma.character.count({ where });
    const c = await prisma.character.findFirst({
      where,
      skip: Math.floor(rng() * count),
      orderBy: { id: "asc" },
      select: { id: true, name: true, imageUrl: true, rarity: true, type: true, attack: true, defense: true, power: true, mainMediaId: true, mainMedia: { select: { franchiseId: true, titleEnglish: true, titleRomaji: true } } },
    });
    if (!c) throw new Error(`Aucun personnage de rareté ${rarity}`);
    used.add(c.id);
    cards.push({ characterId: c.id, rarity: c.rarity, type: c.type, attack: c.attack, defense: c.defense, power: c.power, franchiseId: c.mainMedia?.franchiseId ?? c.mainMediaId });
    characters[c.id] = { name: c.name, imageUrl: c.imageUrl, rarity: c.rarity, type: c.type, series: c.mainMedia?.titleEnglish ?? c.mainMedia?.titleRomaji ?? null };
  }
  const result = battle(cards.slice(0, 4), cards.slice(4), rng);
  return { log: result.log, characters };
}
