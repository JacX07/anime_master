// Raid solo (docs/specs/pvm.md, « Raid »). Pur : boss de la semaine, difficultés, butin selon la part de PV retirée.

import type { CardType } from "../generated/prisma/enums";
import { REDUCED_RATE } from "./story";

export const RAID_RESOURCE = "coeur-de-breche";
export const RAID_PREFIX = "raid:";

/** Bonus d'ATK et de DEF du boss, en plus de l'échelle de la difficulté. */
export const RAID_BOSS_BONUS = 1.6;
/** Cœurs par jour au taux plein, puis taux réduit. */
export const DAILY_FULL_HEARTS = 15;

export interface RaidDifficulty { key: string; name: string; scale: number; mult: number }
export const DIFFICULTIES: RaidDifficulty[] = [
  { key: "normal", name: "Normal", scale: 0.85, mult: 1 },
  { key: "difficile", name: "Difficile", scale: 1.15, mult: 2 },
  { key: "cauchemar", name: "Cauchemar", scale: 1.5, mult: 4 },
];
export const difficultyOf = (key: string) => DIFFICULTIES.find((d) => d.key === key);

export interface RaidBoss { key: string; name: string; type: CardType; blurb: string }
/** Les boss tournent une semaine chacun ; le type dominant change l'équipe idéale. */
export const RAID_BOSSES: RaidBoss[] = [
  { key: "behemoth", name: "Le Béhémoth des Failles", type: "COMBAT", blurb: "Une brèche de pure violence : il ne connaît que le corps à corps." },
  { key: "oracle", name: "L'Oracle Dévoré", type: "MYSTERE", blurb: "Il sait ce que tu vas jouer avant toi." },
  { key: "reine", name: "La Reine des Éclats", type: "MAGIE", blurb: "Chaque éclat de brèche qu'elle absorbe devient un sort." },
  { key: "coeur-fendu", name: "Le Cœur Fendu", type: "COEUR", blurb: "Un amas de sentiments échappés d'un millier d'histoires." },
  { key: "titan", name: "Le Titan des Horizons", type: "AVENTURE", blurb: "Il marche d'un univers à l'autre et écrase tout sur sa route." },
];
export const bossOf = (key: string) => RAID_BOSSES.find((b) => b.key === key);

/** Lundi 26 octobre 2026 : début de la semaine 0. */
const WEEK0 = Date.UTC(2026, 9, 26);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const weekIndex = (now: Date) => Math.max(0, Math.floor((now.getTime() - WEEK0) / WEEK_MS));
export const bossOfWeek = (now: Date) => RAID_BOSSES[weekIndex(now) % RAID_BOSSES.length];
/** Début de la semaine suivante : le boss change à ce moment. */
export const nextBossAt = (now: Date) => new Date(WEEK0 + (weekIndex(now) + 1) * WEEK_MS);

export const raidKey = (boss: string, difficulty: string) => `${RAID_PREFIX}${boss}:${difficulty}`;
export function parseRaidKey(key: string): { boss: RaidBoss; difficulty: RaidDifficulty } | null {
  if (!key.startsWith(RAID_PREFIX)) return null;
  const [b, d] = key.slice(RAID_PREFIX.length).split(":");
  const boss = bossOf(b), difficulty = difficultyOf(d);
  return boss && difficulty ? { boss, difficulty } : null;
}

/** Cœurs au Normal selon la part de PV du boss retirée : paliers 25 / 50 / 75 % → 1 / 2 / 3, victoire → 5 (non cumulés). */
export const baseHearts = (share: number, won: boolean) => (won ? 5 : share >= 0.75 ? 3 : share >= 0.5 ? 2 : share >= 0.25 ? 1 : 0);

/**
 * Cœurs versés pour un combat. `fullHearts` : cœurs encore au taux plein aujourd'hui. Au-delà, 25 % (tiré au sort pour la fraction :
 * l'espérance reste exacte et un petit gain ne tombe jamais à zéro à coup sûr). `full` : part comptée au plafond quotidien.
 */
export function raidHearts(share: number, won: boolean, difficulty: RaidDifficulty, fullHearts: number, rand: () => number): { hearts: number; full: number } {
  const base = baseHearts(share, won) * difficulty.mult;
  const full = Math.min(base, Math.max(0, fullHearts));
  const rest = (base - full) * REDUCED_RATE;
  return { hearts: full + Math.floor(rest) + (rand() < rest - Math.floor(rest) ? 1 : 0), full };
}
