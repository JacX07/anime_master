// Règles des expéditions (SPEC étape 4 ter) : pures, sans base de données, donc utilisables côté navigateur.

import type { CardType } from "../generated/prisma/enums";

export const HOUR = 3_600_000;

export interface Breach {
  id: string;
  name: string;
  lore: string;
  tier: "Faille" | "Brèche" | "Gouffre";
  hours: number;
  /** Puissance d'équipe demandée */
  threshold: number;
  /** Seuil d'avant le 2026-11-13 : les expéditions lancées avant les coffres gardent l'ancien calcul */
  legacyThreshold: number;
  /** Univers de la brèche (src/lib/story.ts) : les matériaux des coffres en sortent */
  universe: string;
  favored: CardType[];
  ryo: number;
  crystals: number;
}

// Seuils du 2026-11-13 (puissances moyennes : N 3 200, R 4 700, SR 6 500, SSR 8 700, UR 11 000) : une Faille est à la portée de 3 N
// une fois sur deux, une Brèche de 1 SR + 2 R, un Gouffre de 1 UR + 2 SSR. L'expédition rapporte des coffres (src/lib/chests.ts).
// Ancien équilibrage du 2026-10-17 (simulation par équipes types) : une Faille est à la portée de 3 N une fois sur deux,
// une Brèche de 1 SR + 2 R, un Gouffre de 1 SSR + 2 SR environ deux fois sur trois. Repères de puissance : R ≈ 1 100, SR ≈ 4 500, SSR ≈ 16 000, UR ≈ 49 000.
export const BREACHES: Breach[] = [
  { id: "faille-echo", name: "Lycée Jujutsu de Tokyo", tier: "Faille", hours: 1, threshold: 9500, legacyThreshold: 650, universe: "jujutsu-kaisen", favored: ["MAGIE"], ryo: 10, crystals: 0,
    lore: "Les élèves du lycée y exorcisent leurs premières malédictions. Une sortie d'entraînement qui peut mal tourner." },
  { id: "faille-neon", name: "Tenkaichi Budokai", tier: "Faille", hours: 1, threshold: 9500, legacyThreshold: 650, universe: "dragon-ball", favored: ["COMBAT"], ryo: 10, crystals: 0,
    lore: "Le grand tournoi d'arts martiaux : un ring, des poings et un public qui hurle." },
  { id: "breche-archives", name: "Porte de la Vérité", tier: "Brèche", hours: 6, threshold: 16000, legacyThreshold: 6000, universe: "grande-alchimie", favored: ["MYSTERE", "MAGIE"], ryo: 70, crystals: 1,
    lore: "Un seuil d'où personne ne revient intact. L'échange équivalent se paie toujours." },
  { id: "breche-horizon", name: "Grand Line", tier: "Brèche", hours: 6, threshold: 16000, legacyThreshold: 6000, universe: "one-piece", favored: ["AVENTURE", "COEUR"], ryo: 70, crystals: 1,
    lore: "La route la plus dangereuse de la mer : des îles folles, des rivaux et un trésor au bout." },
  { id: "gouffre-signal", name: "Royaume des Fourmis-Chimères", tier: "Gouffre", hours: 24, threshold: 29000, legacyThreshold: 24000, universe: "hunter-x-hunter", favored: ["COMBAT", "AVENTURE"], ryo: 200, crystals: 3,
    lore: "Un royaume de monstres qui évolue à chaque victime. Seuls des chasseurs hors pair en reviennent." },
  { id: "gouffre-nexus", name: "Sous-sol de Shiganshina", tier: "Gouffre", hours: 24, threshold: 29000, legacyThreshold: 24000, universe: "attack-on-titan", favored: ["MYSTERE", "COEUR"], ryo: 200, crystals: 3,
    lore: "La cave où dort la vérité sur les Titans. Y entrer, c'est apprendre ce qu'on aurait préféré ignorer." },
];
export const breachById = (id: string) => BREACHES.find((b) => b.id === id);

export const SLOTS = [0, 5, 20]; // expéditions récupérées nécessaires pour avoir 1, 2, 3 emplacements
export const slotsFor = (done: number) => SLOTS.filter((n) => done >= n).length;
export const MAX_TEAM = 3;
export const FAVORED_BONUS = 1.25;
export const FAIL_SHARE = 0.25;
/** Part de hasard sur la puissance de chaque carte : ±30 % (une équipe proche du seuil peut réussir comme échouer) */
export const LUCK = 0.3;
export const DAILY_RYO_CAP = 600; // SPEC §4 : ~600 Ryō par jour d'expéditions
export const DAILY_CRYSTAL_CAP = 10;
/** Les expéditions lancées depuis l'arrivée des coffres ont une graine négative : elles rapportent des coffres et suivent les nouveaux seuils. */
export const isChestExpedition = (seed: number) => seed < 0;

/** Générateur déterministe (mulberry32) : la graine du lancement suffit à rejouer le résultat. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Loot { outcome: "FAIL" | "SUCCESS" | "TRIUMPH"; ratio: number; ryo: number; crystals: number }

/** Résultat brut d'une expédition (avant les plafonds quotidiens et hebdomadaires). Pur : testable sans base. */
export function resolve(breach: Breach, team: { type: CardType; power: number }[], seed: number): Loot {
  const rand = seeded(seed);
  const score = team.reduce((n, c) => n + c.power * (breach.favored.includes(c.type) ? FAVORED_BONUS : 1) * (1 - LUCK + 2 * LUCK * rand()), 0);
  const ratio = score / breach.threshold;
  if (ratio < 1) return { outcome: "FAIL", ratio, ryo: Math.round(breach.ryo * FAIL_SHARE), crystals: 0 };
  const m = Math.min(3, ratio);
  const crystals = breach.crystals + (breach.crystals > 0 && rand() < (m - 1) / 2 ? 1 : 0);
  return { outcome: ratio >= 1.5 ? "TRIUMPH" : "SUCCESS", ratio, ryo: Math.round(breach.ryo * (1 + 0.25 * (m - 1))), crystals };
}

