// Import des personnages AniList dans la base locale (SPEC, étape 1).
// Usage : npm run import            (5 000 personnages, ~100 pages)
//         npm run import -- --pages 2   (test rapide)
//         npm run import -- --recompute (recalcule rareté/type/stats sans appeler AniList)

import type { CharacterRole } from "../src/generated/prisma/enums";
import { fetchCharactersPage, type AniListCharacter, type AniListMedia } from "../src/lib/anilist";
import { cleanDescription, shortenDescription } from "../src/lib/clean";
import { prisma } from "../src/lib/db";
import { RARITIES, assignRarities, assignType, computeStats, favouriteBounds, type MediaTag } from "../src/lib/stats";

const PER_PAGE = 50;
const DEFAULT_PAGES = 100; // l'API plafonne la pagination à 5 000 résultats
const BATCH_SIZE = 500;

function parsePages(): number {
  const i = process.argv.indexOf("--pages");
  const n = i >= 0 ? Number(process.argv[i + 1]) : DEFAULT_PAGES;
  if (!Number.isInteger(n) || n < 1) throw new Error("--pages doit être un entier ≥ 1");
  return n;
}

function toRole(role: string | null): CharacterRole {
  return role === "MAIN" || role === "BACKGROUND" ? role : "SUPPORTING";
}

interface Kept {
  character: AniListCharacter;
  edges: { role: CharacterRole; media: AniListMedia }[];
  mainMedia: AniListMedia;
  mainRole: CharacterRole;
}

/** Garde les séries animées non adultes ; choisit la série principale (SPEC §5 ter). */
function selectMedia(c: AniListCharacter): Kept | null {
  const edges = c.media.edges
    .filter((e) => e.node && !e.node.isAdult)
    .map((e) => ({ role: toRole(e.characterRole), media: e.node }));
  if (edges.length === 0) return null;

  const byPopularity = (a: (typeof edges)[number], b: (typeof edges)[number]) =>
    (b.media.popularity ?? 0) - (a.media.popularity ?? 0);
  const main = [...edges].filter((e) => e.role === "MAIN").sort(byPopularity)[0] ?? [...edges].sort(byPopularity)[0];

  return { character: c, edges, mainMedia: main.media, mainRole: main.role };
}

async function inBatches<T>(items: T[], run: (batch: T[]) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += BATCH_SIZE) await run(items.slice(i, i + BATCH_SIZE));
}

async function fetchAll(pages: number) {
  const kept: Kept[] = [];
  let skippedNoAnime = 0;
  let skippedIncomplete = 0;

  for (let page = 1; page <= pages; page++) {
    const result = await fetchCharactersPage(page, PER_PAGE);
    for (const c of result.characters) {
      if (!c.name.full || !c.image?.large) {
        skippedIncomplete++;
        continue;
      }
      const k = selectMedia(c);
      if (k) kept.push(k);
      else skippedNoAnime++;
    }
    console.log(`  page ${page}/${pages} — ${kept.length} personnages retenus`);
    if (!result.pageInfo.hasNextPage || result.characters.length === 0) break;
  }
  return { kept, skippedNoAnime, skippedIncomplete };
}

async function saveRaw(kept: Kept[]) {
  // Séries : dédoublonnées sur l'ensemble des personnages
  const mediaById = new Map<number, AniListMedia>();
  for (const k of kept) for (const e of k.edges) mediaById.set(e.media.id, e.media);

  await inBatches([...mediaById.values()], (batch) =>
    prisma.$transaction(
      batch.map((m) => {
        const data = {
          titleRomaji: m.title.romaji ?? m.title.english ?? m.title.native ?? `#${m.id}`,
          titleEnglish: m.title.english,
          titleNative: m.title.native,
          format: m.format,
          year: m.seasonYear ?? m.startDate?.year ?? null,
          coverUrl: m.coverImage?.large ?? null,
          popularity: m.popularity ?? 0,
          genres: m.genres ?? [],
          tags: (m.tags ?? [])
            .filter((t) => !t.isMediaSpoiler)
            .map((t) => ({ name: t.name, rank: t.rank ?? 0 })),
          studio: m.studios?.nodes[0]?.name ?? null,
        };
        return prisma.media.upsert({ where: { id: m.id }, create: { id: m.id, ...data }, update: data });
      }),
    ),
  );

  // Personnages : rareté / type / stats provisoires, recalculés juste après sur toute la base
  await inBatches(kept, (batch) =>
    prisma.$transaction(
      batch.flatMap((k) => {
        const c = k.character;
        const cleaned = cleanDescription(c.description);
        const data = {
          name: c.name.full!.replace(/\s+/g, " ").trim(),
          nameNative: c.name.native?.trim() || null,
          imageUrl: c.image!.large!,
          descriptionRaw: c.description,
          description: shortenDescription(cleaned),
          gender: c.gender,
          age: c.age,
          birthMonth: c.dateOfBirth?.month ?? null,
          birthDay: c.dateOfBirth?.day ?? null,
          favourites: c.favourites ?? 0,
          mainMediaId: k.mainMedia.id,
          mainRole: k.mainRole,
        };
        return [
          prisma.character.upsert({
            where: { id: c.id },
            create: { id: c.id, ...data, rarity: "N", type: "COEUR", attack: 0, defense: 0 },
            update: data,
          }),
          prisma.characterMedia.deleteMany({ where: { characterId: c.id } }),
          prisma.characterMedia.createMany({
            data: k.edges.map((e) => ({ characterId: c.id, mediaId: e.media.id, role: e.role })),
          }),
        ];
      }),
    ),
  );

  return mediaById.size;
}

/** Recalcule rareté, type et stats sur tous les personnages de la base. */
async function recompute() {
  const all = await prisma.character.findMany({
    select: { id: true, favourites: true, mainRole: true, mainMedia: { select: { genres: true, tags: true } } },
  });

  const rarities = assignRarities(all);
  const withRarity = all.map((c) => ({ ...c, rarity: rarities.get(c.id)! }));
  const bounds = favouriteBounds(withRarity);

  const updates = withRarity.map((c) => {
    const genres = Array.isArray(c.mainMedia?.genres) ? (c.mainMedia.genres as string[]) : [];
    const tags = Array.isArray(c.mainMedia?.tags) ? (c.mainMedia.tags as unknown as MediaTag[]) : [];
    const { attack, defense } = computeStats(
      { id: c.id, favourites: c.favourites, rarity: c.rarity, role: c.mainRole },
      bounds,
    );
    return { id: c.id, data: { rarity: c.rarity, type: assignType(genres, tags), attack, defense } };
  });

  await inBatches(updates, (batch) =>
    prisma.$transaction(batch.map((u) => prisma.character.update({ where: { id: u.id }, data: u.data }))),
  );
}

async function printSummary() {
  const total = await prisma.character.count();
  const byRarity = await prisma.character.groupBy({ by: ["rarity"], _count: true });
  const byType = await prisma.character.groupBy({ by: ["type"], _count: true });
  const stats = await prisma.character.groupBy({
    by: ["rarity"],
    _min: { attack: true, defense: true, favourites: true },
    _max: { attack: true, defense: true, favourites: true },
  });
  const noDesc = await prisma.character.count({ where: { description: null } });

  console.log(`\n=== Résumé : ${total} personnages en base ===`);
  console.log("\nRareté   Nombre   Favoris (min–max)   ATK (min–max)   DEF (min–max)");
  for (const r of [...RARITIES].reverse()) {
    const s = stats.find((x) => x.rarity === r);
    const n = byRarity.find((x) => x.rarity === r)?._count ?? 0;
    console.log(
      `${r.padEnd(8)} ${String(n).padStart(6)}   ${`${s?._min.favourites ?? "-"}–${s?._max.favourites ?? "-"}`.padEnd(19)} ` +
        `${`${s?._min.attack ?? "-"}–${s?._max.attack ?? "-"}`.padEnd(15)} ${s?._min.defense ?? "-"}–${s?._max.defense ?? "-"}`,
    );
  }
  console.log("\nType       Nombre   Part");
  for (const t of byType.sort((a, b) => b._count - a._count)) {
    console.log(`${t.type.padEnd(10)} ${String(t._count).padStart(6)}   ${((t._count / total) * 100).toFixed(1)} %`);
  }
  console.log(`\nSans description : ${noDesc}`);
}

async function main() {
  const started = Date.now();
  if (process.argv.includes("--recompute")) {
    console.log("Recalcul des raretés, types et stats…");
    await recompute();
    await printSummary();
    return;
  }

  const pages = parsePages();
  console.log(`Import AniList : ${pages} page(s) de ${PER_PAGE} personnages…`);

  const { kept, skippedNoAnime, skippedIncomplete } = await fetchAll(pages);
  console.log(
    `\n${kept.length} retenus, ${skippedNoAnime} ignorés (aucun anime non adulte), ${skippedIncomplete} ignorés (nom ou image manquant).`,
  );

  console.log("Enregistrement…");
  const mediaCount = await saveRaw(kept);
  console.log(`${mediaCount} séries enregistrées.`);

  console.log("Calcul des raretés, types et stats…");
  await recompute();

  await printSummary();
  console.log(`\nTerminé en ${Math.round((Date.now() - started) / 1000)} s.`);
}

main()
  .catch((err) => {
    console.error("\nÉchec de l'import :", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
