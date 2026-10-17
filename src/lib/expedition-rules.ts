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
  favored: CardType[];
  ryo: number;
  crystals: number;
  /** Chance de base d'un cristal spécial (réussite) */
  special: number;
}

// Équilibrage validé le 2026-10-17 (simulation par équipes types) : une Faille est à la portée de 3 N une fois sur deux,
// une Brèche de 1 SR + 2 R, un Gouffre de 1 SSR + 2 SR environ deux fois sur trois. Repères de puissance : R ≈ 1 100, SR ≈ 4 500, SSR ≈ 16 000, UR ≈ 49 000.
export const BREACHES: Breach[] = [
  { id: "faille-echo", name: "Faille de l'Écho", tier: "Faille", hours: 1, threshold: 650, favored: ["MAGIE"], ryo: 10, crystals: 0, special: 0,
    lore: "Une fissure minuscule qui répète les voix de mondes voisins. Idéale pour s'échauffer." },
  { id: "faille-neon", name: "Faille Néon", tier: "Faille", hours: 1, threshold: 650, favored: ["COMBAT"], ryo: 10, crystals: 0, special: 0,
    lore: "Des rues lumineuses apparaissent de l'autre côté ; quelqu'un s'y bat toujours." },
  { id: "breche-archives", name: "Brèche des Archives", tier: "Brèche", hours: 6, threshold: 6000, favored: ["MYSTERE", "MAGIE"], ryo: 70, crystals: 1, special: 0.05,
    lore: "Une bibliothèque sans fin dont les rayons mènent chacun vers un autre univers." },
  { id: "breche-horizon", name: "Brèche de l'Horizon", tier: "Brèche", hours: 6, threshold: 6000, favored: ["AVENTURE", "COEUR"], ryo: 70, crystals: 1, special: 0.05,
    lore: "Un ciel d'un autre monde, des routes ouvertes et des rencontres qui ne devaient pas avoir lieu." },
  { id: "gouffre-signal", name: "Gouffre du Signal", tier: "Gouffre", hours: 24, threshold: 24000, favored: ["COMBAT", "AVENTURE"], ryo: 200, crystals: 3, special: 0.2,
    lore: "Un puits sans fond d'où remonte un signal puissant, plein de signatures qui ne sont pas d'ici." },
  { id: "gouffre-nexus", name: "Gouffre du Nexus", tier: "Gouffre", hours: 24, threshold: 24000, favored: ["MYSTERE", "COEUR"], ryo: 200, crystals: 3, special: 0.2,
    lore: "Là où les brèches se croisent. On dit qu'il touche le cœur de la Tour." },
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
export const WEEKLY_SPECIAL_CAP = 10;

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

export interface Loot { outcome: "FAIL" | "SUCCESS" | "TRIUMPH"; ratio: number; ryo: number; crystals: number; special: number }

/** Résultat brut d'une expédition (avant les plafonds quotidiens et hebdomadaires). Pur : testable sans base. */
export function resolve(breach: Breach, team: { type: CardType; power: number }[], seed: number): Loot {
  const rand = seeded(seed);
  const score = team.reduce((n, c) => n + c.power * (breach.favored.includes(c.type) ? FAVORED_BONUS : 1) * (1 - LUCK + 2 * LUCK * rand()), 0);
  const ratio = score / breach.threshold;
  if (ratio < 1) return { outcome: "FAIL", ratio, ryo: Math.round(breach.ryo * FAIL_SHARE), crystals: 0, special: 0 };
  const m = Math.min(3, ratio);
  const crystals = breach.crystals + (breach.crystals > 0 && rand() < (m - 1) / 2 ? 1 : 0);
  const special = rand() < Math.min(1, breach.special * m) ? 1 : 0;
  return { outcome: ratio >= 1.5 ? "TRIUMPH" : "SUCCESS", ratio, ryo: Math.round(breach.ryo * (1 + 0.25 * (m - 1))), crystals, special };
}

