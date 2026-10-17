// Bannières (SPEC étape 4 bis §5, §6, §8 ; refonte du 2026-10-17) : elles ne changent jamais les taux de rareté ni le pity,
// seulement le personnage tiré.
// - Permanentes, en cristaux normaux : Générale (tout le catalogue : c'est le tirage standard), Waifu, Husbando.
// - Spéciales temporaires, en cristaux spéciaux : un anime ou un groupe d'animes (src/lib/banner-events.ts).
// - Bienvenue : 20 tirages à jouer sur Générale, Waifu ou Husbando (choix verrouillé au premier tirage).
// Tout est créé à la demande (aucune tâche planifiée).

import type { Prisma } from "../generated/prisma/client";
import type { Rarity } from "../generated/prisma/enums";
import { BANNER_EVENTS } from "./banner-events";
import { prisma } from "./db";

/** Bannières permanentes ; « general » est le tirage standard (aucune bannière, tout le catalogue). */
export const CATEGORIES = ["general", "waifu", "husbando"] as const;
export type Category = (typeof CATEGORIES)[number] | "event";

// Les anciennes catégories (rotation hebdomadaire, retirée) restent nommées pour l'historique et les bannières de bienvenue déjà choisies
export const CATEGORY_INFO: Record<string, { label: string; blurb: string }> = {
  general: { label: "Générale", blurb: "Tous les personnages de la brèche." },
  waifu: { label: "Waifu", blurb: "Les héroïnes que la brèche a rendues inoubliables." },
  husbando: { label: "Husbando", blurb: "Les héros et rivaux qui font battre les cœurs." },
  event: { label: "Événement", blurb: "Une brèche ouverte sur un seul univers, pour un temps limité." },
  sport: { label: "Sport", blurb: "Terrains, tatamis et circuits : les athlètes de la brèche." },
  shonen: { label: "Shonen", blurb: "Poings levés et rivaux éternels : les héros qui ne reculent pas." },
  isekai: { label: "Isekai", blurb: "Arrivés d'un autre monde, ils ont traversé une brèche avant les autres." },
};

/** Part des cartes issues de la bannière : 100 % (seuls ses personnages peuvent sortir, à la rareté tirée) */
export const BANNER_WEIGHT = 1;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** Lundi 1970-01-05 00:00 UTC : début de la semaine 0 */
const WEEK_ORIGIN = 4 * 24 * 60 * 60 * 1000;

export function weekIndex(now: Date): number {
  return Math.floor((now.getTime() - WEEK_ORIGIN) / WEEK_MS);
}
export function weekBounds(now: Date): { start: Date; end: Date } {
  const i = weekIndex(now);
  return { start: new Date(WEEK_ORIGIN + i * WEEK_MS), end: new Date(WEEK_ORIGIN + (i + 1) * WEEK_MS) };
}

type Db = Prisma.TransactionClient | typeof prisma;

/** Personnages d'une bannière permanente : `gender` AniList pour Waifu / Husbando ; aucun pour Générale (catalogue complet). */
export async function categoryCharacterIds(category: Category, db: Db = prisma): Promise<number[]> {
  if (category !== "waifu" && category !== "husbando") return [];
  const rows = await db.character.findMany({ where: { disabled: false, gender: category === "waifu" ? "Female" : "Male" }, select: { id: true } });
  return rows.map((r) => r.id);
}

/** Personnages des séries d'un événement */
async function mediaCharacterIds(mediaIds: number[], db: Db = prisma): Promise<number[]> {
  const rows = await db.characterMedia.findMany({ where: { mediaId: { in: mediaIds }, character: { disabled: false } }, select: { characterId: true }, distinct: ["characterId"] });
  return rows.map((r) => r.characterId);
}

interface BannerSpec {
  key: string;
  name: string;
  description: string;
  category: Category;
  costKind: "NORMAL" | "SPECIAL" | "WELCOME";
  /** 0 : catalogue complet (Générale) ; 1 : seulement les personnages de la bannière */
  weight: number;
  startsAt: Date | null;
  endsAt: Date | null;
  characterIds: () => Promise<number[]>;
}

export const PERMANENT_KEYS = ["perm-waifu", "perm-husbando"];
export const WELCOME_KEYS = ["welcome-general", "welcome-waifu", "welcome-husbando"];

const permanent = (c: "waifu" | "husbando"): BannerSpec => ({
  key: `perm-${c}`, name: CATEGORY_INFO[c].label, description: CATEGORY_INFO[c].blurb, category: c,
  costKind: "NORMAL", weight: BANNER_WEIGHT, startsAt: null, endsAt: null, characterIds: () => categoryCharacterIds(c),
});
const welcome = (c: (typeof CATEGORIES)[number]): BannerSpec => ({
  key: `welcome-${c}`, name: `Bienvenue — ${CATEGORY_INFO[c].label}`, description: `Cadeau de bienvenue : ${CATEGORY_INFO[c].blurb}`, category: c,
  costKind: "WELCOME", weight: c === "general" ? 0 : BANNER_WEIGHT, startsAt: null, endsAt: null, characterIds: () => categoryCharacterIds(c),
});

/** Crée la bannière si elle n'existe pas ; sinon aligne son nom, sa description et sa part (ses personnages ne bougent pas). */
async function ensureBanner(spec: BannerSpec) {
  const found = await prisma.banner.findUnique({ where: { key: spec.key }, select: { id: true, name: true, description: true, weight: true } });
  if (found) {
    if (found.name !== spec.name || found.description !== spec.description || found.weight !== spec.weight)
      await prisma.banner.update({ where: { id: found.id }, data: { name: spec.name, description: spec.description, weight: spec.weight } });
    return;
  }
  const ids = await spec.characterIds();
  try {
    await prisma.banner.create({
      data: {
        key: spec.key, name: spec.name, description: spec.description, category: spec.category, costKind: spec.costKind,
        weight: spec.weight, startsAt: spec.startsAt, endsAt: spec.endsAt,
        characters: { createMany: { data: ids.map((characterId) => ({ characterId })) } },
      },
    });
  } catch (err) {
    // Créée en même temps par une autre requête : rien à faire
    if (!(err instanceof Error && /Unique constraint|P2002/.test(err.message))) throw err;
  }
}

/** Crée (si besoin) les bannières permanentes, celles de bienvenue et les événements en cours. */
export async function ensureBanners(now = new Date()) {
  // Anciennes bannières de la rotation hebdomadaire (retirée le 2026-10-17) : fermées si elles étaient encore ouvertes
  await prisma.banner.updateMany({ where: { OR: [{ key: { startsWith: "cat-" } }, { key: { startsWith: "special-" } }], endsAt: { gt: now } }, data: { endsAt: now } });
  await ensureBanner(permanent("waifu"));
  await ensureBanner(permanent("husbando"));
  for (const c of CATEGORIES) await ensureBanner(welcome(c));
  for (const e of BANNER_EVENTS) {
    const startsAt = new Date(e.startsAt), endsAt = new Date(e.endsAt);
    if (!(startsAt <= now && endsAt > now)) continue;
    await ensureBanner({ key: e.key, name: e.name, description: e.description, category: "event", costKind: "SPECIAL", weight: BANNER_WEIGHT, startsAt, endsAt, characterIds: () => mediaCharacterIds(e.mediaIds) });
  }
}

export type RarityCounts = Partial<Record<Rarity, number>>;

/** Nombre de personnages par rareté que la bannière peut donner (catalogue complet sans bannière ou pour Générale). */
export async function poolCounts(bannerId: string | null = null, db: Db = prisma): Promise<RarityCounts> {
  const rows = await db.character.groupBy({ by: ["rarity"], where: { disabled: false, ...(bannerId ? { banners: { some: { bannerId } } } : {}) }, _count: { _all: true } });
  return Object.fromEntries(rows.map((r) => [r.rarity, r._count._all]));
}

export interface BannerInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  categoryLabel: string;
  costKind: "NORMAL" | "SPECIAL" | "WELCOME";
  /** Pourcentage de cartes issues de la bannière (0 : catalogue complet) */
  weightPercent: number;
  endsAt: string | null;
  /** Personnages disponibles par rareté (panneau « Taux ») */
  pool: RarityCounts;
}

/**
 * Bannières proposées au joueur : les permanentes, les événements en cours, et celles de bienvenue tant qu'il lui reste
 * des tirages (une seule, celle qu'il a choisie, une fois le choix fait).
 */
export async function listBanners(user: { welcomeDraws: number; welcomeBannerId: string | null }, now = new Date()): Promise<BannerInfo[]> {
  await ensureBanners(now);
  const rows = await prisma.banner.findMany({
    where: {
      OR: [
        { key: { in: PERMANENT_KEYS } },
        { costKind: "SPECIAL", key: { startsWith: "event-" }, startsAt: { lte: now }, endsAt: { gt: now } },
        ...(user.welcomeDraws > 0 ? [user.welcomeBannerId ? { id: user.welcomeBannerId } : { key: { in: WELCOME_KEYS } }] : []),
      ],
    },
  });
  const order = { WELCOME: 0, NORMAL: 1, SPECIAL: 2 } as const;
  const rank = (c: string) => { const i = (CATEGORIES as readonly string[]).indexOf(c); return i < 0 ? 99 : i; };
  const infos = await Promise.all(rows.map(async (b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    category: b.category,
    categoryLabel: CATEGORY_INFO[b.category]?.label ?? b.category,
    costKind: b.costKind,
    weightPercent: Math.round(b.weight * 100),
    endsAt: b.endsAt?.toISOString() ?? null,
    pool: await poolCounts(b.weight > 0 ? b.id : null),
  })));
  return infos.sort((a, b) => order[a.costKind] - order[b.costKind] || rank(a.category) - rank(b.category));
}

/** Une bannière est ouverte aux tirages à cet instant. */
export function isBannerOpen(b: { startsAt: Date | null; endsAt: Date | null }, now: Date): boolean {
  return (!b.startsAt || b.startsAt <= now) && (!b.endsAt || b.endsAt > now);
}
