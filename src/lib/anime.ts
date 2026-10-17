// « Anime » de l'album (SPEC étape 2 §7) : un anime est une franchise entière. AniList sépare les saisons, films, spin-offs et
// histoires parallèles en fiches distinctes (NARUTO, NARUTO: Shippuuden, ses films, Magi et Sinbad…) ; `npm run import:franchises`
// les regroupe grâce aux relations d'AniList et range le résultat dans `Media.franchiseId`. Un personnage appartient à la
// franchise de sa série principale (Character.mainMedia).
//
// Les franchises de moins de MIN_ANIME_SIZE personnages sont rassemblées par blocs de BLOCK_SIZE, tirés au hasard mais de façon
// stable (ordre fixé par un hachage de l'identifiant) : ce sont les entrées « Autres anime n°… » de l'album. La complétion, elle,
// reste calculée pour chaque franchise séparément.

import { prisma } from "./db";

export const MIN_ANIME_SIZE = 5;
export const BLOCK_SIZE = 5;
/** Préfixe des clés de blocs « Autres anime » dans les filtres de l'album (autres-1, autres-2…) */
export const OTHERS = "autres";

export interface Anime {
  /** Identifiant de la série de tête de la franchise */
  key: number;
  title: string;
  characterIds: number[];
}

export interface AnimeBlock {
  /** autres-1, autres-2… */
  key: string;
  title: string;
  animes: Anime[];
}

export interface AnimeIndex {
  /** Franchises assez grandes pour avoir leur entrée (≥ MIN_ANIME_SIZE personnages), triées par taille puis par titre */
  listed: Anime[];
  /** Blocs de petites franchises */
  blocks: AnimeBlock[];
  /** Clé de l'entrée d'un personnage : l'identifiant de sa franchise si elle est listée, sinon la clé de son bloc */
  keyOf: (characterId: number) => string;
}

/** Hachage entier stable (mélange de Murmur) : donne l'ordre « aléatoire » des petites franchises. */
const scramble = (n: number) => {
  let h = (n ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
};

const tidy = (t: string) => t.replace(/\s*\((?:TV|\d{4})\)\s*$/, "").trim();

/**
 * Nom d'une franchise : le plus long début du titre de tête que partagent au moins 80 % des titres de ses séries
 * (« Dragon Ball » plutôt que « Dragon Ball Z », « Fate » plutôt que « Fate/Zero »), à défaut le titre de tête. Le début
 * doit finir à une frontière de mot et rester proche du titre de tête, ou précéder un sous-titre (« : », « / », « - »).
 */
export function franchiseTitle(head: string, titles: string[]): string {
  const name = tidy(head);
  if (titles.length < 2) return name;
  const lower = titles.map((t) => t.toLowerCase());
  for (let i = head.length; i >= 4; i--) {
    if (i < head.length && /[\p{L}\p{N}]/u.test(head[i])) continue; // coupe seulement entre deux mots
    const prefix = head.slice(0, i).replace(/[\s:：\-–/!?.,・(（]+$/u, "");
    if (prefix.length < 4) break;
    const rest = head.slice(prefix.length);
    if (!(prefix.length >= head.length * 0.7 || /^\s*[:：/\-–]/.test(rest))) continue;
    const key = prefix.toLowerCase();
    if (lower.filter((t) => t.startsWith(key)).length >= titles.length * 0.8) return tidy(prefix);
  }
  return name;
}

export async function loadAnimeIndex(): Promise<AnimeIndex> {
  const [media, characters] = await Promise.all([
    prisma.media.findMany({ select: { id: true, franchiseId: true, titleRomaji: true, titleEnglish: true } }),
    prisma.character.findMany({ where: { disabled: false }, select: { id: true, mainMediaId: true } }),
  ]);
  const head = new Map(media.map((m) => [m.id, m.franchiseId ?? m.id]));
  const titles = new Map(media.map((m) => [m.id, m.titleEnglish ?? m.titleRomaji]));
  const titlesByFranchise = new Map<number, string[]>();
  for (const m of media) { const k = m.franchiseId ?? m.id; titlesByFranchise.set(k, [...(titlesByFranchise.get(k) ?? []), titles.get(m.id)!]); }
  const groups = new Map<number, Anime>();
  const loose: number[] = []; // personnages sans série principale : une franchise à part, toujours dans les petits
  for (const c of characters) {
    if (c.mainMediaId === null) { loose.push(c.id); continue; }
    const key = head.get(c.mainMediaId) ?? c.mainMediaId;
    const g = groups.get(key) ?? { key, title: franchiseTitle(titles.get(key) ?? "?", titlesByFranchise.get(key) ?? []), characterIds: [] };
    g.characterIds.push(c.id); groups.set(key, g);
  }
  if (loose.length > 0) groups.set(0, { key: 0, title: "Sans série", characterIds: loose });
  const all = [...groups.values()];
  const listed = all.filter((a) => a.characterIds.length >= MIN_ANIME_SIZE).sort((a, b) => b.characterIds.length - a.characterIds.length || a.title.localeCompare(b.title));
  const small = all.filter((a) => a.characterIds.length < MIN_ANIME_SIZE).sort((a, b) => scramble(a.key) - scramble(b.key));
  const blocks: AnimeBlock[] = [];
  for (let i = 0; i < small.length; i += BLOCK_SIZE) blocks.push({ key: `${OTHERS}-${blocks.length + 1}`, title: `Autres anime n°${blocks.length + 1}`, animes: small.slice(i, i + BLOCK_SIZE) });
  const map = new Map<number, string>();
  for (const a of listed) for (const id of a.characterIds) map.set(id, String(a.key));
  for (const b of blocks) for (const a of b.animes) for (const id of a.characterIds) map.set(id, b.key);
  return { listed, blocks, keyOf: (id) => map.get(id) ?? "" };
}
