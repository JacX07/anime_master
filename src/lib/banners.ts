// Bannières (SPEC étape 4 bis §5, §6, §8) : elles ne changent jamais les taux de rareté, seulement le personnage tiré.
// Les bannières de la semaine sont créées à la demande (aucune tâche planifiée) ; les bannières de bienvenue sont permanentes.

import type { Prisma } from "../generated/prisma/client";
import { prisma } from "./db";

export const CATEGORIES = ["sport", "shonen", "isekai", "waifu", "husbando"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_INFO: Record<Category, { label: string; blurb: string }> = {
  sport: { label: "Sport", blurb: "Terrains, tatamis et circuits : les athlètes de la brèche." },
  shonen: { label: "Shonen", blurb: "Poings levés et rivaux éternels : les héros qui ne reculent pas." },
  isekai: { label: "Isekai", blurb: "Arrivés d'un autre monde, ils ont traversé une brèche avant les autres." },
  waifu: { label: "Waifu", blurb: "Les héroïnes que la brèche a rendues inoubliables." },
  husbando: { label: "Husbando", blurb: "Les héros et rivaux qui font battre les cœurs." },
};

/** Les bannières de catégorie tournent chaque semaine : combien en même temps (SPEC §5) */
export const WEEKLY_CATEGORY_BANNERS = 2;
/** Bannière spéciale : seulement les personnages SSR et UR de la catégorie, payée en cristaux spéciaux */
export const SPECIAL_BANNER_RARITIES = ["SSR", "UR"] as const;
/** Part des cartes issues d'une bannière (le reste vient du pool complet) */
export const BANNER_WEIGHT = 0.5;

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

/** Catégories à l'honneur cette semaine, et catégorie de la bannière spéciale (pure : testable sans base). */
export function weeklyCategories(now: Date): { featured: Category[]; special: Category } {
  const w = weekIndex(now);
  const at = (i: number) => CATEGORIES[((i % CATEGORIES.length) + CATEGORIES.length) % CATEGORIES.length];
  return { featured: Array.from({ length: WEEKLY_CATEGORY_BANNERS }, (_, k) => at(w + k * 2)), special: at(w + 1) };
}

type Db = Prisma.TransactionClient | typeof prisma;

/** Personnages d'une catégorie, construite à partir des genres / tags AniList et du champ `gender` (SPEC §5). */
export async function categoryCharacterIds(category: Category, db: Db = prisma): Promise<number[]> {
  if (category === "waifu" || category === "husbando") {
    const rows = await db.character.findMany({ where: { disabled: false, gender: category === "waifu" ? "Female" : "Male" }, select: { id: true } });
    return rows.map((r) => r.id);
  }
  const media = await db.media.findMany({ select: { id: true, genres: true, tags: true } });
  const wanted = media.filter((m) => {
    if (category === "sport") return (m.genres as string[]).includes("Sports");
    const tag = category === "shonen" ? "Shounen" : "Isekai";
    return ((m.tags as { name: string }[] | null) ?? []).some((t) => t.name === tag);
  });
  if (wanted.length === 0) return [];
  const rows = await db.characterMedia.findMany({
    where: { mediaId: { in: wanted.map((m) => m.id) }, character: { disabled: false } },
    select: { characterId: true },
    distinct: ["characterId"],
  });
  return rows.map((r) => r.characterId);
}

interface BannerSpec {
  key: string;
  name: string;
  description: string;
  category: Category;
  costKind: "NORMAL" | "SPECIAL" | "WELCOME";
  startsAt: Date | null;
  endsAt: Date | null;
  /** Restreint la bannière à ces raretés (bannière spéciale) */
  onlyRarities?: readonly string[];
}

async function ensureBanner(spec: BannerSpec) {
  if (await prisma.banner.findUnique({ where: { key: spec.key }, select: { id: true } })) return;
  let ids = await categoryCharacterIds(spec.category);
  if (spec.onlyRarities) {
    const keep = await prisma.character.findMany({ where: { id: { in: ids }, rarity: { in: spec.onlyRarities as never } }, select: { id: true } });
    ids = keep.map((c) => c.id);
  }
  try {
    await prisma.banner.create({
      data: {
        key: spec.key,
        name: spec.name,
        description: spec.description,
        category: spec.category,
        costKind: spec.costKind,
        weight: BANNER_WEIGHT,
        startsAt: spec.startsAt,
        endsAt: spec.endsAt,
        characters: { createMany: { data: ids.map((characterId) => ({ characterId })) } },
      },
    });
  } catch (err) {
    // Créée en même temps par une autre requête : rien à faire
    if (!(err instanceof Error && /Unique constraint|P2002/.test(err.message))) throw err;
  }
}

/** Crée (si besoin) les bannières permanentes de bienvenue et celles de la semaine en cours. */
export async function ensureBanners(now = new Date()) {
  const { start, end } = weekBounds(now);
  const w = weekIndex(now);
  const { featured, special } = weeklyCategories(now);
  for (const category of CATEGORIES) {
    await ensureBanner({
      key: `welcome-${category}`,
      name: `Bienvenue — ${CATEGORY_INFO[category].label}`,
      description: `Cadeau de bienvenue : ${CATEGORY_INFO[category].blurb}`,
      category,
      costKind: "WELCOME",
      startsAt: null,
      endsAt: null,
    });
  }
  for (const category of featured) {
    await ensureBanner({
      key: `cat-${category}-w${w}`,
      name: `Brèche ${CATEGORY_INFO[category].label}`,
      description: CATEGORY_INFO[category].blurb,
      category,
      costKind: "NORMAL",
      startsAt: start,
      endsAt: end,
    });
  }
  await ensureBanner({
    key: `special-${special}-w${w}`,
    name: `Élus ${CATEGORY_INFO[special].label}`,
    description: `Seulement les SSR et UR de la catégorie. ${CATEGORY_INFO[special].blurb}`,
    category: special,
    costKind: "SPECIAL",
    startsAt: start,
    endsAt: end,
    onlyRarities: SPECIAL_BANNER_RARITIES,
  });
}

export interface BannerInfo {
  id: string;
  name: string;
  description: string;
  category: Category;
  categoryLabel: string;
  costKind: "NORMAL" | "SPECIAL" | "WELCOME";
  /** Pourcentage de cartes issues de la bannière */
  weightPercent: number;
  endsAt: string | null;
}

/**
 * Bannières proposées au joueur : celles de la semaine, plus celles de bienvenue tant qu'il lui reste des tirages
 * (une seule, celle qu'il a choisie, une fois le choix fait).
 */
export async function listBanners(user: { welcomeDraws: number; welcomeBannerId: string | null }, now = new Date()): Promise<BannerInfo[]> {
  await ensureBanners(now);
  const rows = await prisma.banner.findMany({
    where: {
      OR: [
        { costKind: { in: ["NORMAL", "SPECIAL"] }, startsAt: { lte: now }, endsAt: { gt: now } },
        ...(user.welcomeDraws > 0 ? [{ costKind: "WELCOME" as const, ...(user.welcomeBannerId ? { id: user.welcomeBannerId } : {}) }] : []),
      ],
    },
  });
  const order = { WELCOME: 0, NORMAL: 1, SPECIAL: 2 } as const;
  return rows
    .map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      category: b.category as Category,
      categoryLabel: CATEGORY_INFO[b.category as Category]?.label ?? b.category,
      costKind: b.costKind,
      weightPercent: Math.round(b.weight * 100),
      endsAt: b.endsAt?.toISOString() ?? null,
    }))
    .sort((a, b) => order[a.costKind] - order[b.costKind] || CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category));
}

/** Une bannière est ouverte aux tirages à cet instant. */
export function isBannerOpen(b: { startsAt: Date | null; endsAt: Date | null }, now: Date): boolean {
  return (!b.startsAt || b.startsAt <= now) && (!b.endsAt || b.endsAt > now);
}
