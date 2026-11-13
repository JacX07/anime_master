// Importe (si besoin) des personnages AniList précis, puis applique les raretés imposées (RARITY_OVERRIDES) et recalcule leurs stats.
// Ne touche qu'aux identifiants donnés : pas de recalcul global de la base.
// Usage : npx tsx scripts/import-character.ts 54495 727 2751 46109
import { request, type AniListCharacter, type AniListMedia } from "../src/lib/anilist";
import { cleanDescription, shortenDescription } from "../src/lib/clean";
import { prisma } from "../src/lib/db";
import { speedOf } from "../src/lib/speed";
import { RARITY_OVERRIDES, assignType, computePower, computeStats, favouriteBounds, type MediaTag } from "../src/lib/stats";
import type { CharacterRole } from "../src/generated/prisma/enums";

const QUERY = `
query ($id: Int) {
  Character(id: $id) {
    id name { full native } image { large } description gender age dateOfBirth { month day } favourites
    media(type: ANIME, sort: POPULARITY_DESC, perPage: 5) {
      edges { characterRole node { id isAdult format seasonYear startDate { year } popularity title { romaji english native } coverImage { large } genres tags { name rank isMediaSpoiler } studios(isMain: true) { nodes { name } } } }
    }
  }
}`;

const toRole = (role: string | null): CharacterRole => (role === "MAIN" || role === "BACKGROUND" ? role : "SUPPORTING");

async function importOne(id: number) {
  const { Character: c } = await request<{ Character: AniListCharacter }>(QUERY, { id });
  const edges = c.media.edges.filter((e) => e.node && !e.node.isAdult).map((e) => ({ role: toRole(e.characterRole), media: e.node as AniListMedia }));
  if (!edges.length || !c.name.full || !c.image?.large) throw new Error(`#${id} : aucune série animée non adulte, ou nom/image manquant`);
  const byPopularity = (a: (typeof edges)[number], b: (typeof edges)[number]) => (b.media.popularity ?? 0) - (a.media.popularity ?? 0);
  const main = [...edges].filter((e) => e.role === "MAIN").sort(byPopularity)[0] ?? [...edges].sort(byPopularity)[0];
  for (const e of edges) {
    const m = e.media;
    const data = {
      titleRomaji: m.title.romaji ?? m.title.english ?? m.title.native ?? `#${m.id}`, titleEnglish: m.title.english, titleNative: m.title.native, format: m.format,
      year: m.seasonYear ?? m.startDate?.year ?? null, coverUrl: m.coverImage?.large ?? null, popularity: m.popularity ?? 0, genres: m.genres ?? [],
      tags: (m.tags ?? []).filter((t) => !t.isMediaSpoiler).map((t) => ({ name: t.name, rank: t.rank ?? 0 })), studio: m.studios?.nodes[0]?.name ?? null,
    };
    await prisma.media.upsert({ where: { id: m.id }, create: { id: m.id, ...data }, update: data });
  }
  const data = {
    name: c.name.full.replace(/\s+/g, " ").trim(), nameNative: c.name.native?.trim() || null, imageUrl: c.image.large, descriptionRaw: c.description,
    description: shortenDescription(cleanDescription(c.description)), gender: c.gender, age: c.age, birthMonth: c.dateOfBirth?.month ?? null, birthDay: c.dateOfBirth?.day ?? null,
    favourites: c.favourites ?? 0, mainMediaId: main.media.id, mainRole: main.role,
  };
  await prisma.character.upsert({ where: { id }, create: { id, ...data, rarity: "N", type: "COEUR", attack: 0, defense: 0, power: 0 }, update: data });
  await prisma.characterMedia.deleteMany({ where: { characterId: id } });
  await prisma.characterMedia.createMany({ data: edges.map((e) => ({ characterId: id, mediaId: e.media.id, role: e.role })) });
  console.log(`Importé : ${data.name} (#${id})`);
}

async function main() {
  const ids = process.argv.slice(2).map(Number).filter(Number.isInteger);
  if (!ids.length) throw new Error("Donne au moins un identifiant AniList.");
  // Les personnages déjà en base gardent leur type : seuls la rareté et les stats sont recalculées
  const fresh = new Set<number>();
  for (const id of ids) if (!(await prisma.character.findUnique({ where: { id }, select: { id: true } }))) { await importOne(id); fresh.add(id); }
  // Bornes de favoris par rareté, sur toute la base (les raretés imposées n'y comptent pas)
  const all = await prisma.character.findMany({ select: { id: true, favourites: true, rarity: true } });
  const bounds = favouriteBounds(all);
  for (const id of ids) {
    const c = await prisma.character.findUniqueOrThrow({ where: { id }, select: { id: true, favourites: true, mainRole: true, rarity: true, type: true, mainMedia: { select: { genres: true, tags: true } } } });
    const rarity = RARITY_OVERRIDES[id] ?? c.rarity;
    const genres = Array.isArray(c.mainMedia?.genres) ? (c.mainMedia.genres as string[]) : [];
    const tags = Array.isArray(c.mainMedia?.tags) ? (c.mainMedia.tags as unknown as MediaTag[]) : [];
    const { attack, defense } = computeStats({ id, favourites: c.favourites, rarity, role: c.mainRole }, bounds);
    const power = computePower({ attack, defense, speed: speedOf(id) });
    const updated = await prisma.character.update({ where: { id }, data: { rarity, type: fresh.has(id) ? assignType(genres, tags) : c.type, attack, defense, power }, select: { name: true, rarity: true, type: true, attack: true, defense: true, power: true } });
    console.log(`${updated.name} : ${c.rarity} → ${updated.rarity}, ${updated.type}, ATK ${updated.attack}, DEF ${updated.defense}, puissance ${updated.power}`);
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
