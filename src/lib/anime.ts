// « Anime » de l'album (SPEC étape 2 §7) : un anime regroupe les saisons, films et spéciaux d'une même franchise, car AniList en
// fait des fiches séparées (NARUTO, NARUTO: Shippuuden, THE LAST: NARUTO THE MOVIE…). Un personnage appartient à l'anime de sa
// série principale (Character.mainMedia). Les anime de moins de MIN_ANIME_SIZE personnages sont regroupés dans « Autres anime »,
// mais chacun garde sa propre complétion.
//
// Le regroupement est volontairement prudent : une fiche rejoint une autre seulement si son titre commence exactement par le
// titre de cette autre fiche, suivi de « : », d'un tiret ou d'une marque de saison (2, Season 2, 2nd Season, II, Final, Movie…).

import { prisma } from "./db";

export const MIN_ANIME_SIZE = 5;
/** Clé du regroupement « Autres anime » dans les filtres de l'album */
export const OTHERS = "autres";

const SEASON = /^(?::|\s*[-–]|\s+(?:\d|season\b|\d+(?:st|nd|rd|th)\b|ii+\b|iv\b|part\b|final\b|movie\b|ova\b|oad\b|special\b|zenpen\b|kouhen\b|the\s+(?:movie|final|last|animation)\b))/i;

export interface Anime {
  /** Identifiant de la fiche racine de la franchise */
  key: number;
  title: string;
  characterIds: number[];
}

export interface AnimeIndex {
  /** Anime assez grands pour avoir leur entrée (≥ MIN_ANIME_SIZE personnages), triés par taille puis par titre */
  listed: Anime[];
  /** Les autres, regroupés dans « Autres anime » à l'affichage */
  others: Anime[];
  /** Clé d'anime d'un personnage : l'identifiant de l'anime s'il est listé, sinon OTHERS */
  keyOf: (characterId: number) => number | typeof OTHERS;
}

interface MediaRow {
  id: number;
  titleRomaji: string;
  titleEnglish: string | null;
}

/** Fiche racine de chaque fiche : la plus courte dont le titre est un préfixe de saison ou de sous-titre. */
export function franchiseRoots(media: MediaRow[]): Map<number, number> {
  const byTitle = new Map<string, number>();
  for (const m of media) for (const t of [m.titleRomaji, m.titleEnglish]) if (t) { const k = t.trim().toLowerCase(); if (!byTitle.has(k)) byTitle.set(k, m.id); }
  const parent = new Map<number, number>();
  for (const m of media) {
    for (const t of [m.titleRomaji, m.titleEnglish]) {
      if (!t || parent.has(m.id)) continue;
      const title = t.trim().toLowerCase();
      for (let i = 1; i < title.length; i++) {
        if (![" ", ":", "-", "–"].includes(title[i])) continue;
        const id = byTitle.get(title.slice(0, i).trimEnd());
        if (id !== undefined && id !== m.id && SEASON.test(title.slice(i))) { parent.set(m.id, id); break; }
      }
    }
  }
  const root = (id: number, depth = 0): number => { const p = parent.get(id); return p === undefined || depth > 10 ? id : root(p, depth + 1); };
  return new Map(media.map((m) => [m.id, root(m.id)]));
}

export async function loadAnimeIndex(): Promise<AnimeIndex> {
  const [media, characters] = await Promise.all([
    prisma.media.findMany({ select: { id: true, titleRomaji: true, titleEnglish: true } }),
    prisma.character.findMany({ where: { disabled: false }, select: { id: true, mainMediaId: true } }),
  ]);
  const roots = franchiseRoots(media), titles = new Map(media.map((m) => [m.id, m.titleEnglish ?? m.titleRomaji]));
  const groups = new Map<number, Anime>();
  const loose: number[] = [];
  for (const c of characters) {
    if (c.mainMediaId === null) { loose.push(c.id); continue; }
    const key = roots.get(c.mainMediaId) ?? c.mainMediaId;
    const g = groups.get(key) ?? { key, title: titles.get(key) ?? "?", characterIds: [] };
    g.characterIds.push(c.id); groups.set(key, g);
  }
  const all = [...groups.values()];
  const listed = all.filter((a) => a.characterIds.length >= MIN_ANIME_SIZE).sort((a, b) => b.characterIds.length - a.characterIds.length || a.title.localeCompare(b.title));
  const others = all.filter((a) => a.characterIds.length < MIN_ANIME_SIZE);
  const map = new Map<number, number | typeof OTHERS>();
  for (const a of listed) for (const id of a.characterIds) map.set(id, a.key);
  for (const a of others) for (const id of a.characterIds) map.set(id, OTHERS);
  for (const id of loose) map.set(id, OTHERS);
  return { listed, others, keyOf: (id) => map.get(id) ?? OTHERS };
}
