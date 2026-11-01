import { UNIVERSES } from "./story";

export const MAX_ADVENTURE_LEVEL = 50;
export const xpForLevel = (level: number) => { const n = Math.max(0, Math.min(49, level - 1)); return 100 * n + 25 * n * (n - 1); };
export function adventureLevel(xp: number) {
  let level = 1;
  while (level < MAX_ADVENTURE_LEVEL && xp >= xpForLevel(level + 1)) level++;
  return level;
}
export const ADVENTURE_RANKS = [
  { name: "Éveillé", lore: "Une première signature répond à ton appel. Un passage s’ouvre vers un monde encore stable." },
  { name: "Traverseur", lore: "Ton empreinte résiste aux voyages. Les chemins entre les mondes deviennent familiers." },
  { name: "Tisseur de liens", lore: "Des signatures venues d’histoires différentes se reconnaissent à travers toi." },
  { name: "Gardien des brèches", lore: "Là où les récits se heurtent, ton empreinte maintient le passage ouvert." },
  { name: "Arpenteur des mondes", lore: "Tu portes la mémoire des mondes traversés. Même les collisions ne peuvent effacer ces liens." },
];
export const rankForLevel = (level: number) => ADVENTURE_RANKS[Math.min(4, Math.floor((level - 1) / 10))];
export const ADVENTURE_MODES = [
  { key: "expeditions", label: "Expéditions", level: 3, worlds: 0, storyLevel: 5, href: "/expeditions", lore: "Un passage stabilisé permet à tes compagnons de partir en reconnaissance." },
  { key: "dungeon", label: "Donjons", level: 5, worlds: 0, storyLevel: 10, href: "/donjons", lore: "Une anomalie révèle un sanctuaire où les signatures se cristallisent en artefacts." },
  { key: "tower", label: "Tour multiverselle", level: 8, worlds: 1, storyLevel: 15, href: "/tour", lore: "La Tour reconnaît ton empreinte et t’invite à affronter les échos des autres mondes." },
  { key: "raid", label: "Raids", level: 12, worlds: 2, storyLevel: 15, href: "/raid", lore: "Ton empreinte peut désormais approcher les entités nées des brèches instables." },
] as const;
export type AdventureMode = typeof ADVENTURE_MODES[number]["key"];
export type Quest = { key: string; title: string; description: string; xp: number; done: boolean; href: string; group: "Histoire" | "Découverte" | "Succès"; available: boolean };
export type AdventureFacts = {
  story: { universe: string; maxLevel: number }[];
  achievements: { key: string; label: string; description: string; done?: boolean }[];
  team: boolean; awakened: boolean; equipped: boolean; expedition: boolean;
  towerFloor: number; dungeonLevel: number; raidWon: boolean;
};
export function adventureQuests(f: AdventureFacts): Quest[] {
  const story = new Map(f.story.map((row) => [row.universe, row.maxLevel]));
  const quests: Quest[] = UNIVERSES.flatMap((u, index) => Array.from({ length: 15 }, (_, i) => {
    const level = i + 1;
    return { key: `story:${u.key}:${level}`, title: `${u.name} · ${level % 5 === 0 ? level === 15 ? "Boss final" : `Boss d’acte ${level / 5}` : `Combat ${level}`}`,
      description: level === 15 && u.kind === "collision" ? "Stabilise cette collision et préserve les signatures des mondes mêlés." : `Remporte le combat ${level} de ${u.name} pour renforcer ton empreinte.`,
      xp: 100 + 25 * index + (level % 5 === 0 ? 100 : 0) + (level === 15 ? 300 : 0), done: (story.get(u.key) ?? 0) >= level, href: "/histoire", group: "Histoire" as const,
      available: (index === 0 || (story.get(UNIVERSES[index - 1].key) ?? 0) >= 15) && level <= (story.get(u.key) ?? 0) + 1 };
  }));
  const discoveries: [string, string, string, boolean, string, number][] = [
    ["team", "Réunir les signatures", "Enregistre une équipe d’attaque complète de quatre compagnons.", f.team, "/equipe", 100],
    ["awaken", "Raviver une signature", "Éveille une première carte.", f.awakened, "/eveil", 150],
    ["equipment", "Un lien tangible", "Équipe un premier artefact ou forge une arme.", f.equipped, "/inventaire", 150],
    ["expedition", "Au-delà du passage", "Récupère ta première expédition.", f.expedition, "/expeditions", 150],
    ...[1, 10, 25, 50, 100, 200, 300, 500].map((n): typeof discoveries[number] => [`tower:${n}`, `Les échos de la Tour · étage ${n}`, `Atteins l’étage ${n} de la Tour.`, f.towerFloor >= n, "/tour", 200]),
    ...[1, 3, 5, 7, 10].map((n): typeof discoveries[number] => [`dungeon:${n}`, `Sanctuaire · difficulté ${n}`, `Remporte la difficulté ${n} du donjon.`, f.dungeonLevel >= n, "/donjons", 200]),
    ["raid", "Face à l’instable", "Remporte une première victoire de raid.", f.raidWon, "/raid", 300],
  ];
  for (const [key, title, description, done, href, xp] of discoveries) quests.push({ key: `discovery:${key}`, title, description, done, href, xp, group: "Découverte", available: true });
  for (const a of f.achievements) quests.push({ key: `achievement:${a.key}`, title: a.label, description: a.description, done: a.done ?? true, href: "/achievements", xp: 75, group: "Succès", available: true });
  return quests;
}
export function modeUnlocked(mode: typeof ADVENTURE_MODES[number], level: number, story: AdventureFacts["story"], legacy: boolean) {
  if (legacy) return true;
  return level >= mode.level && UNIVERSES.slice(0, Math.max(1, mode.worlds)).every((u) => (story.find((s) => s.universe === u.key)?.maxLevel ?? 0) >= mode.storyLevel);
}
