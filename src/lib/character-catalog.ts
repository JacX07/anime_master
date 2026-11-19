// Catalogue des personnages en cache serveur partagé (egress Supabase).
// Une collection de 3 000 cartes avec `character: { select }` imbriqué fait relire ~2 000 personnages par Prisma
// (`Character WHERE id IN (…)`) à chaque écran : ~10 Mo par combat pour un gros collectionneur. Le catalogue ne change
// qu'aux imports ; on ne lit plus en base que les lignes `Card` et on y rattache le personnage depuis ce cache.

import { cacheLife } from "next/cache";
import type { CardType, Rarity } from "../generated/prisma/enums";
import { prisma } from "./db";

export interface CatalogCharacter {
  id: number;
  name: string;
  imageUrl: string;
  rarity: Rarity;
  type: CardType;
  attack: number;
  defense: number;
  power: number;
  mainMediaId: number | null;
  mainMedia: { franchiseId: number | null; titleEnglish: string | null; titleRomaji: string } | null;
}

// Tuples compacts : l'entrée du cache distant reste sous le Mo (≈ 0,8 Mo pour 4 700 personnages).
type CharacterRow = [id: number, name: string, imageUrl: string, rarity: Rarity, type: CardType, attack: number, defense: number, power: number, mainMediaId: number | null];
type MediaRow = [id: number, franchiseId: number | null, titleEnglish: string | null, titleRomaji: string];

const CHARACTER_FIELDS = { id: true, name: true, imageUrl: true, rarity: true, type: true, attack: true, defense: true, power: true, mainMediaId: true } as const;
const MEDIA_FIELDS = { id: true, franchiseId: true, titleEnglish: true, titleRomaji: true } as const;

const characterRow = (c: Omit<CatalogCharacter, "mainMedia">): CharacterRow => [c.id, c.name, c.imageUrl, c.rarity, c.type, c.attack, c.defense, c.power, c.mainMediaId];
const mediaRow = (m: { id: number; franchiseId: number | null; titleEnglish: string | null; titleRomaji: string }): MediaRow => [m.id, m.franchiseId, m.titleEnglish, m.titleRomaji];

/** `use cache: remote` : partagé entre les instances Vercel (le `use cache` en mémoire est presque toujours manqué en serverless). */
async function loadCatalogRows(): Promise<{ characters: CharacterRow[]; media: MediaRow[] }> {
  "use cache: remote";
  // Hors de Next (scripts `tsx`), la directive est ignorée et `cacheLife` lèverait une erreur.
  if (process.env.NEXT_RUNTIME) cacheLife("hours");
  const [characters, media] = await Promise.all([
    prisma.character.findMany({ select: CHARACTER_FIELDS }),
    prisma.media.findMany({ where: { mainCharacters: { some: {} } }, select: MEDIA_FIELDS }),
  ]);
  return { characters: characters.map(characterRow), media: media.map(mediaRow) };
}

function build(characters: CharacterRow[], media: MediaRow[], into = new Map<number, CatalogCharacter>()) {
  const mediaById = new Map(media.map(([id, franchiseId, titleEnglish, titleRomaji]) => [id, { franchiseId, titleEnglish, titleRomaji }]));
  for (const [id, name, imageUrl, rarity, type, attack, defense, power, mainMediaId] of characters) {
    into.set(id, { id, name, imageUrl, rarity, type, attack, defense, power, mainMediaId, mainMedia: mainMediaId === null ? null : mediaById.get(mainMediaId) ?? null });
  }
  return into;
}

let memo: { rows: object; map: Map<number, CatalogCharacter> } | null = null;

/** Tous les personnages (désactivés compris : des cartes peuvent encore les porter), par id. */
export async function characterCatalog(): Promise<Map<number, CatalogCharacter>> {
  const rows = await loadCatalogRows();
  if (memo?.rows !== rows) memo = { rows, map: build(rows.characters, rows.media) };
  return memo.map;
}

/** Rattache à chaque carte son personnage du catalogue. Un personnage importé après la mise en cache est lu en base. */
export async function withCharacters<T extends { characterId: number }>(cards: T[]): Promise<(T & { character: CatalogCharacter })[]> {
  const catalog = await characterCatalog();
  const missing = [...new Set(cards.map((c) => c.characterId).filter((id) => !catalog.has(id)))];
  let found = catalog;
  if (missing.length) {
    const characters = await prisma.character.findMany({ where: { id: { in: missing } }, select: CHARACTER_FIELDS });
    const mediaIds = [...new Set(characters.flatMap((c) => (c.mainMediaId === null ? [] : [c.mainMediaId])))];
    const media = mediaIds.length ? await prisma.media.findMany({ where: { id: { in: mediaIds } }, select: MEDIA_FIELDS }) : [];
    found = build(characters.map(characterRow), media.map(mediaRow), new Map(catalog));
  }
  return cards.map((card) => {
    const character = found.get(card.characterId);
    if (!character) throw new Error(`Personnage ${card.characterId} introuvable.`);
    return { ...card, character };
  });
}
