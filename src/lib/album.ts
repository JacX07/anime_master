// Album et fiche perso (SPEC étape 2, §7) : lecture seule, côté serveur.

import "server-only";
import type { CardType, Rarity } from "../generated/prisma/enums";
import { loadAnimeIndex, MIN_ANIME_SIZE } from "./anime";
import { cleanDescription } from "./clean";
import { prisma } from "./db";
import type { Finish } from "./pull";

export const RARITY_ORDER: Rarity[] = ["UR", "SSR", "SR", "R", "N"];
export const TYPE_ORDER: CardType[] = ["COMBAT", "MYSTERE", "MAGIE", "COEUR", "AVENTURE"];
const FINISH_ORDER: Finish[] = ["GOLD", "HOLO", "NORMAL"];
export const OWNED_FILTERS = ["all", "owned", "missing", "duplicates"] as const;
export type OwnedFilter = (typeof OWNED_FILTERS)[number];
/** Ordre des mondes dans la vue par défaut : popularité de la collection (défaut), complétion, nombre de cartes possédées, alphabétique */
export const WORLD_SORTS = ["power", "popular", "completion", "owned", "alpha"] as const;
export type WorldSort = (typeof WORLD_SORTS)[number];

export const PAGE_SIZE = 60;
export { MIN_ANIME_SIZE };

export interface AlbumFilters {
  q: string;
  rarity: Rarity | null;
  type: CardType | null;
  owned: OwnedFilter;
  /** Clé d'un anime de l'album (identifiant de sa franchise) ou d'un bloc « autres-N » ; vide : tous */
  anime: string;
  sort: WorldSort;
  page: number;
}

type RawParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const pick = <T extends string>(list: readonly T[], v: string): T | null => (list.includes(v as T) ? (v as T) : null);

/** Lit les filtres depuis l'URL, en ignorant les valeurs inconnues. */
export function parseAlbumFilters(params: RawParams): AlbumFilters {
  const page = Number.parseInt(one(params.page), 10);
  return {
    q: one(params.q).trim().slice(0, 80),
    rarity: pick(RARITY_ORDER, one(params.rarity)),
    type: pick(TYPE_ORDER, one(params.type)),
    owned: pick(OWNED_FILTERS, one(params.owned)) ?? "all",
    anime: /^(\d{1,9}|autres-\d{1,4})$/.test(one(params.anime)) ? one(params.anime) : "",
    sort: pick(WORLD_SORTS, one(params.sort)) ?? "power",
    page: Number.isFinite(page) && page > 1 ? page : 1,
  };
}

export const seriesTitle = (m: { titleEnglish: string | null; titleRomaji: string } | null | undefined) =>
  m ? (m.titleEnglish ?? m.titleRomaji) : null;

export interface Ownership {
  count: number;
  best: Finish;
  finishes: Finish[];
}

/** Exemplaires possédés, regroupés par personnage. */
async function ownershipMap(userId: string): Promise<Map<number, Ownership>> {
  const groups = await prisma.card.groupBy({
    by: ["characterId", "finish"],
    where: { ownerId: userId },
    _count: { _all: true },
  });
  const map = new Map<number, Ownership>();
  for (const g of groups) {
    const o = map.get(g.characterId) ?? { count: 0, best: "NORMAL", finishes: [] };
    o.count += g._count._all;
    o.finishes.push(g.finish);
    o.finishes.sort((a, b) => FINISH_ORDER.indexOf(a) - FINISH_ORDER.indexOf(b));
    o.best = o.finishes[0];
    map.set(g.characterId, o);
  }
  return map;
}

export interface AlbumEntry {
  id: number;
  name: string;
  imageUrl: string;
  rarity: Rarity;
  type: CardType;
  attack: number;
  defense: number;
  power: number;
  series: string | null;
  owned: Ownership | null;
}

/** Un anime de l'album avec la progression du joueur */
export interface AnimeProgress {
  key: string;
  title: string;
  owned: number;
  total: number;
  /** Pour un bloc « Autres anime » : les anime qu'il regroupe, chacun avec sa propre progression */
  members?: { title: string; owned: number; total: number }[];
}

/** Un « monde » de la vue par défaut : un anime avec sa progression et un aperçu de ses cartes */
export interface WorldBand extends AnimeProgress {
  /** Cartes en aperçu, la vedette (la plus rare possédée) en premier */
  preview: AlbumEntry[];
  /** Puissance de toutes les cartes que le joueur possède dans ce monde (somme sur chaque exemplaire) */
  power: number;
}

export const WORLDS_PER_PAGE = 12;
const WORLD_PREVIEW = 4;

export interface AlbumPage {
  entries: AlbumEntry[];
  /** Vue par défaut (aucun filtre) : un monde par bande, en commençant par ceux que le joueur a déjà relevés ; null sinon */
  worlds: { bands: WorldBand[]; unknown: number } | null;
  /** Franchises ayant leur entrée (≥ 5 personnages), par ordre alphabétique, puis les blocs d'« Autres anime » */
  anime: { listed: AnimeProgress[]; blocks: AnimeProgress[]; selected: AnimeProgress | null };
  /** Nombre de personnages correspondant aux filtres */
  matching: number;
  pages: number;
  progress: { owned: number; total: number; byRarity: Record<Rarity, { owned: number; total: number }> };
}

async function loadEntries(ids: number[], owned: Map<number, Ownership>): Promise<AlbumEntry[]> {
  const rows = await prisma.character.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      rarity: true,
      type: true,
      attack: true,
      defense: true,
      power: true,
      mainMedia: { select: { titleRomaji: true, titleEnglish: true } },
    },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => {
    const { mainMedia, ...c } = byId.get(id)!;
    return { ...c, series: seriesTitle(mainMedia), owned: owned.get(id) ?? null };
  });
}

export async function getAlbum(userId: string, f: AlbumFilters): Promise<AlbumPage> {
  const [owned, animeIndex] = await Promise.all([ownershipMap(userId), loadAnimeIndex()]);

  // Index léger de tous les personnages (quelques milliers) : tri par rareté puis favoris en mémoire,
  // car l'ordre des raretés n'est pas l'ordre alphabétique de l'énumération.
  const all = await prisma.character.findMany({
    where: { disabled: false },
    select: { id: true, name: true, rarity: true, type: true, favourites: true, power: true },
  });

  const byRarity = Object.fromEntries(RARITY_ORDER.map((r) => [r, { owned: 0, total: 0 }])) as AlbumPage["progress"]["byRarity"];
  for (const c of all) {
    byRarity[c.rarity].total++;
    if (owned.has(c.id)) byRarity[c.rarity].owned++;
  }

  // Progression de chaque anime (la complétion des petits anime se calcule séparément, seule leur entrée est regroupée)
  const count = (ids: number[]) => ids.reduce((n, id) => n + (owned.has(id) ? 1 : 0), 0);
  const listed = animeIndex.listed.map((a) => ({ key: String(a.key), title: a.title, owned: count(a.characterIds), total: a.characterIds.length })).sort((a, b) => a.title.localeCompare(b.title, "fr", { sensitivity: "base" }));
  const blocks = animeIndex.blocks.map((b) => {
    const members = b.animes.map((a) => ({ title: a.title, owned: count(a.characterIds), total: a.characterIds.length }));
    return { key: b.key, title: b.title, owned: members.reduce((n, m) => n + m.owned, 0), total: members.reduce((n, m) => n + m.total, 0), members };
  });
  const selected = [...listed, ...blocks].find((a) => a.key === f.anime) ?? null;

  const rank = new Map(all.map((c) => [c.id, c]));
  const order = (a: number, b: number) => {
    const ca = rank.get(a)!;
    const cb = rank.get(b)!;
    return RARITY_ORDER.indexOf(ca.rarity) - RARITY_ORDER.indexOf(cb.rarity) || cb.favourites - ca.favourites || a - b;
  };

  if (!selected && !f.q && !f.rarity && !f.type && f.owned === "all") {
    const idsOf = new Map<string, number[]>();
    for (const a of animeIndex.listed) idsOf.set(String(a.key), a.characterIds);
    for (const b of animeIndex.blocks) idsOf.set(b.key, b.animes.flatMap((a) => a.characterIds));
    // Popularité d'un monde : total des favoris de ses personnages (AniList)
    const popularity = (key: string) => (idsOf.get(key) ?? []).reduce((n, id) => n + (rank.get(id)?.favourites ?? 0), 0);
    // Puissance d'un monde : somme de la puissance de chaque exemplaire possédé (affichée sur la tuile)
    const powerOf = (key: string) => (idsOf.get(key) ?? []).reduce((n, id) => n + (rank.get(id)?.power ?? 0) * (owned.get(id)?.count ?? 0), 0);
    const byTitle = (a: AnimeProgress, b: AnimeProgress) => a.title.localeCompare(b.title, "fr", { sensitivity: "base" });
    const compare: Record<WorldSort, (a: AnimeProgress, b: AnimeProgress) => number> = {
      power: (a, b) => powerOf(b.key) - powerOf(a.key) || byTitle(a, b),
      popular: (a, b) => popularity(b.key) - popularity(a.key) || byTitle(a, b),
      completion: (a, b) => b.owned / b.total - a.owned / a.total || b.owned - a.owned || byTitle(a, b),
      owned: (a, b) => b.owned - a.owned || byTitle(a, b),
      alpha: byTitle,
    };
    const known = [...listed, ...blocks].filter((a) => a.owned > 0).sort(compare[f.sort]);
    const pages = Math.max(1, Math.ceil(known.length / WORLDS_PER_PAGE));
    const page = Math.min(f.page, pages);
    const slice = known.slice((page - 1) * WORLDS_PER_PAGE, page * WORLDS_PER_PAGE);
    // Aperçu : d'abord les cartes possédées (les plus rares en tête, la vedette), puis les manquantes
    const previews = slice.map((a) => {
      const ids = [...(idsOf.get(a.key) ?? [])].sort(order);
      const mine = ids.filter((id) => owned.has(id));
      const rest = ids.filter((id) => !owned.has(id));
      return [...mine, ...rest].slice(0, WORLD_PREVIEW);
    });
    const entries = await loadEntries([...new Set(previews.flat())], owned);
    const entryById = new Map(entries.map((e) => [e.id, e]));
    return {
      entries: [],
      worlds: {
        bands: slice.map((a, i) => ({
          ...a,
          preview: previews[i].map((id) => entryById.get(id)!),
          power: powerOf(a.key),
        })),
        unknown: listed.length + blocks.length - known.length,
      },
      anime: { listed, blocks, selected },
      matching: known.length,
      pages,
      progress: { owned: owned.size, total: all.length, byRarity },
    };
  }

  const q = f.q.toLocaleLowerCase();
  const matching = all
    .filter((c) => {
      if (selected && animeIndex.keyOf(c.id) !== selected.key) return false;
      if (f.rarity && c.rarity !== f.rarity) return false;
      if (f.type && c.type !== f.type) return false;
      const o = owned.get(c.id);
      if (f.owned === "owned" && !o) return false;
      if (f.owned === "missing" && o) return false;
      if (f.owned === "duplicates" && (!o || o.count < 2)) return false;
      return !q || c.name.toLocaleLowerCase().includes(q);
    })
    .sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity) || b.favourites - a.favourites || a.id - b.id);

  const pages = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  const page = Math.min(f.page, pages);
  const ids = matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((c) => c.id);

  return {
    entries: await loadEntries(ids, owned),
    worlds: null,
    anime: { listed, blocks, selected },
    matching: matching.length,
    pages,
    progress: { owned: owned.size, total: all.length, byRarity },
  };
}

export interface CharacterDetail {
  id: number;
  name: string;
  nameNative: string | null;
  imageUrl: string;
  rarity: Rarity;
  type: CardType;
  attack: number;
  defense: number;
  power: number;
  favourites: number;
  gender: string | null;
  age: string | null;
  birthday: { month: number; day: number | null } | null;
  description: string | null;
  series: string | null;
  media: { id: number; title: string; format: string | null; year: number | null; coverUrl: string | null; role: string }[];
  pullCount: number;
  /** Exemplaires du joueur connecté (null si déconnecté) */
  copies: { id: string; finish: Finish; serial: number; obtainedAt: Date; locked: boolean; forTrade: boolean; inAuction: boolean; inExpedition: boolean }[] | null;
}

export async function getCharacter(id: number, userId: string | null): Promise<CharacterDetail | null> {
  const c = await prisma.character.findFirst({
    where: { id, disabled: false },
    include: {
      mainMedia: { select: { titleRomaji: true, titleEnglish: true } },
      media: {
        include: { media: { select: { id: true, titleRomaji: true, titleEnglish: true, format: true, year: true, coverUrl: true, popularity: true } } },
      },
    },
  });
  if (!c) return null;

  const copies = userId
    ? await prisma.card.findMany({
        where: { ownerId: userId, characterId: id },
        select: { id: true, finish: true, serial: true, obtainedAt: true, locked: true, forTrade: true, inAuction: true, inExpedition: true },
        orderBy: { serial: "asc" },
      })
    : null;
  copies?.sort((a, b) => FINISH_ORDER.indexOf(a.finish) - FINISH_ORDER.indexOf(b.finish) || a.serial - b.serial);

  return {
    id: c.id,
    name: c.name,
    nameNative: c.nameNative,
    imageUrl: c.imageUrl,
    rarity: c.rarity,
    type: c.type,
    attack: c.attack,
    defense: c.defense,
    power: c.power,
    favourites: c.favourites,
    gender: c.gender,
    age: c.age,
    birthday: c.birthMonth ? { month: c.birthMonth, day: c.birthDay } : null,
    description: cleanDescription(c.descriptionRaw),
    series: seriesTitle(c.mainMedia),
    media: c.media
      .filter((m) => m.media.format !== "MUSIC")
      .sort((a, b) => b.media.popularity - a.media.popularity)
      .map((m) => ({
        id: m.media.id,
        title: seriesTitle(m.media)!,
        format: m.media.format,
        year: m.media.year,
        coverUrl: m.media.coverUrl,
        role: m.role,
      })),
    pullCount: c.pullCount,
    copies,
  };
}
