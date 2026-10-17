// Regroupe les séries en franchises à partir des relations d'AniList (suites, films, spin-offs, histoires parallèles…) et
// enregistre pour chaque série `Media.franchiseId` : l'identifiant de la série la plus populaire de son groupe.
// Les relations passent par des séries qui ne sont pas dans la base (un film sans personnage importé relie deux saisons) :
// on les suit donc aussi. Les réponses sont gardées dans data/anilist-relations.json, le script reprend là où il s'est arrêté.
// Usage : npm run import:franchises   (une dizaine de minutes la première fois : AniList limite à 30 requêtes par minute)

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { request } from "../src/lib/anilist";
import { prisma } from "../src/lib/db";

/** Relations qui rattachent deux séries à la même franchise (pas OTHER ni CHARACTER : ce sont des crossovers et des invités). */
const SAME_FRANCHISE = new Set(["PREQUEL", "SEQUEL", "PARENT", "SIDE_STORY", "SPIN_OFF", "ALTERNATIVE", "SUMMARY", "COMPILATION", "CONTAINS"]);
/** Liens à ne pas suivre : des crossovers qui fusionneraient deux franchises distinctes (décidé avec le propriétaire, 2026-10-17). */
const IGNORED_LINKS: [number, number][] = [
  [235, 6115], [235, 18429],      // Detective Conan × Lupin III vs Detective Conan
  [1301, 1000], [1645, 1495],     // Galaxy Express 999 × Captain Harlock (film, puis Harlock Saga × Maetel Legend)
  [4918, 4938],                   // xxxHOLiC × Tsubasa
  [100298, 2402], [113359, 2402], // Megalo Box × Tomorrow's Joe
];
const ignored = new Set(IGNORED_LINKS.flatMap(([a, b]) => [`${a}-${b}`, `${b}-${a}`]));
const CACHE = "data/anilist-relations.json";
const MAX_FETCHED = 9000; // garde-fou contre une explosion du parcours

interface Entry { title: string; popularity: number; edges: [number, string][] }
const QUERY = `query ($ids: [Int]) { Page(perPage: 50) { media(id_in: $ids, type: ANIME) { id popularity title { romaji english } relations { edges { relationType node { id type } } } } } }`;

async function main() {
  const rows = await prisma.media.findMany({ select: { id: true, popularity: true, titleRomaji: true, titleEnglish: true } });
  const inDb = new Map(rows.map((m) => [m.id, m]));
  const cache: Record<string, Entry> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
  const queue = [...inDb.keys()];
  const seen = new Set(queue);
  let done = 0;
  for (let i = 0; i < queue.length && Object.keys(cache).length < MAX_FETCHED; ) {
    const batch = queue.slice(i, i + 50).filter((id) => !cache[id]);
    i += 50;
    if (batch.length > 0) {
      const { Page } = await request<{ Page: { media: { id: number; popularity: number | null; title: { romaji: string | null; english: string | null }; relations: { edges: { relationType: string; node: { id: number; type: string } }[] } | null }[] } }>(QUERY, { ids: batch });
      for (const m of Page.media) cache[m.id] = { title: m.title.english ?? m.title.romaji ?? "?", popularity: m.popularity ?? 0, edges: (m.relations?.edges ?? []).filter((e) => e.node.type === "ANIME" && SAME_FRANCHISE.has(e.relationType)).map((e) => [e.node.id, e.relationType]) };
      for (const id of batch) cache[id] ??= { title: inDb.get(id)?.titleEnglish ?? inDb.get(id)?.titleRomaji ?? "?", popularity: inDb.get(id)?.popularity ?? 0, edges: [] }; // introuvable : seul
      writeFileSync(CACHE, JSON.stringify(cache));
      done += batch.length;
      console.log(`  ${done} séries lues, ${queue.length - i > 0 ? queue.length - i : 0} à voir`);
    }
    // Les voisins non vus sont ajoutés à la file
    for (const id of queue.slice(i - 50, i)) for (const [n] of cache[id]?.edges ?? []) if (!seen.has(n)) { seen.add(n); queue.push(n); }
  }

  // Composantes connexes (union-find)
  const parent = new Map<number, number>();
  const find = (x: number): number => { let r = x; while (parent.get(r) !== undefined && parent.get(r) !== r) r = parent.get(r)!; parent.set(x, r); return r; };
  const union = (a: number, b: number) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
  for (const id of seen) parent.set(id, id);
  for (const [id, e] of Object.entries(cache)) for (const [n] of e.edges) if (parent.has(n) && !ignored.has(`${id}-${n}`)) union(Number(id), n);

  // Pour chaque groupe, la série de la base la plus populaire sert de tête
  const groups = new Map<number, number[]>();
  for (const id of inDb.keys()) { const r = find(id); groups.set(r, [...(groups.get(r) ?? []), id]); }
  let updates = 0;
  for (const members of groups.values()) {
    const head = members.reduce((best, id) => (inDb.get(id)!.popularity > inDb.get(best)!.popularity || (inDb.get(id)!.popularity === inDb.get(best)!.popularity && id < best) ? id : best));
    await prisma.media.updateMany({ where: { id: { in: members } }, data: { franchiseId: head } });
    updates += members.length;
  }
  console.log(`${updates} séries rangées dans ${groups.size} franchises.`);
  const big = [...groups.values()].sort((a, b) => b.length - a.length).slice(0, 15);
  for (const m of big) console.log(`  ${m.length} séries · ${m.slice(0, 4).map((id) => inDb.get(id)!.titleEnglish ?? inDb.get(id)!.titleRomaji).join(" | ")}`);
}

main().finally(() => prisma.$disconnect());
