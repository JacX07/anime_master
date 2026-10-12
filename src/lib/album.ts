// Album et fiche perso (SPEC étape 2, §7) : lecture seule, côté serveur.

import "server-only";
import type { CardType, Rarity } from "../generated/prisma/enums";
import { cleanDescription } from "./clean";
import { prisma } from "./db";
import type { Finish } from "./pull";

export const RARITY_ORDER: Rarity[] = ["UR", "SSR", "SR", "R", "N"];
export const TYPE_ORDER: CardType[] = ["COMBAT", "MYSTERE", "MAGIE", "COEUR", "AVENTURE"];
const FINISH_ORDER: Finish[] = ["GOLD", "HOLO", "NORMAL"];
export const OWNED_FILTERS = ["all", "owned", "missing", "duplicates"] as const;
export type OwnedFilter = (typeof OWNED_FILTERS)[number];

export const PAGE_SIZE = 60;

export interface AlbumFilters {
  q: string;
  rarity: Rarity | null;
  type: CardType | null;
  owned: OwnedFilter;
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

export interface AlbumPage {
  entries: AlbumEntry[];
  /** Nombre de personnages correspondant aux filtres */
  matching: number;
  pages: number;
  progress: { owned: number; total: number; byRarity: Record<Rarity, { owned: number; total: number }> };
}

export async function getAlbum(userId: string, f: AlbumFilters): Promise<AlbumPage> {
  const owned = await ownershipMap(userId);

  // Index léger de tous les personnages (quelques milliers) : tri par rareté puis favoris en mémoire,
  // car l'ordre des raretés n'est pas l'ordre alphabétique de l'énumération.
  const all = await prisma.character.findMany({
    where: { disabled: false },
    select: { id: true, name: true, rarity: true, type: true, favourites: true },
  });

  const byRarity = Object.fromEntries(RARITY_ORDER.map((r) => [r, { owned: 0, total: 0 }])) as AlbumPage["progress"]["byRarity"];
  for (const c of all) {
    byRarity[c.rarity].total++;
    if (owned.has(c.id)) byRarity[c.rarity].owned++;
  }

  const q = f.q.toLocaleLowerCase();
  const matching = all
    .filter((c) => {
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

  return {
    entries: ids.map((id) => {
      const { mainMedia, ...c } = byId.get(id)!;
      return { ...c, series: seriesTitle(mainMedia), owned: owned.get(id) ?? null };
    }),
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
