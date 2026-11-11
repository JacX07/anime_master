import type { BattleCard } from "./battle";
import type { CharacterSpell } from "./spells";

/** Kit des boss ; les exemplaires de collection gardent leurs sorts habituels. */
export const EMPEROR_IDS = { shanks: 727, bigMom: 54495, kaido: 46109, whitebeard: 2751 } as const;

const spell = (name: string, target: CharacterSpell["target"], ...effects: CharacterSpell["effects"]): CharacterSpell => ({ name, target, effects, final: true });

/** Kits des empereurs du Défi (docs/specs/raid-empereurs.md) : première version, à équilibrer avec les passages. */
const EMPERORS: Record<number, Pick<BattleCard, "basicAttack" | "spell" | "ultimate" | "tertiary" | "noTertiary" | "startGauge" | "soulPocket" | "phase" | "guard" | "allyDeathShield">> = {
  [EMPEROR_IDS.shanks]: {
    // Haki des rois en premier : les personnages dont l'ATK est inférieure à celle de Shanks s'endorment
    startGauge: 100,
    ultimate: spell("Haki des rois", null, { k: "sleep", turns: 2, weaker: true }),
    spell: spell("Divine Departure", null, { k: "damage", mult: 2.1, zone: true, ignoreDef: 0.5 }),
    // Duel : lui seul est atteignable par la cible désignée pendant 2 tours, et la Voix de l'empereur renforce son équipe
    // (critiques +30 %, dégâts critiques +50 %, ATK +50 %)
    tertiary: spell("Duel de l'empereur", "foe", { k: "duel", turns: 2 }, { k: "mod", stat: "crit", amount: 0.3, turns: 3, to: "team" }, { k: "mod", stat: "critDamage", amount: 0.5, turns: 3, to: "team" }, { k: "mod", stat: "atk", amount: 0.5, turns: 3, to: "team" }),
  },
  [EMPEROR_IDS.bigMom]: {
    // Pacte de l'âme dès le début ; le sort tertiaire est celui que l'avalé laisse
    startGauge: 100,
    ultimate: spell("Pacte de l'âme", null, { k: "devour", turns: 2, threshold: 0.4 }),
    spell: spell("Zeus", null, { k: "damage", mult: 2, zone: true }),
    soulPocket: { hp: 0.1, dmg: 0.25 },
    noTertiary: true,
  },
  [EMPEROR_IDS.kaido]: {
    // Homme-bête : sa massue fait saigner (BLADE_USERS) et il encaisse mieux sous 70 % de PV
    guard: { when: "below", at: 0.7, reduce: 0.25 },
    spell: spell("Hassaikai", "foe", { k: "damage", mult: 1.6 }),
    ultimate: spell("Tempête de massue", null, { k: "damage", mult: 1.2, zone: true }),
    noTertiary: true,
    phase: {
      at: 0.5, atk: 0.4, speed: 0.25, name: "Dragon",
      spell: spell("Souffle du dragon", null, { k: "damage", mult: 1.8, zone: true }, { k: "poison", pct: 0.04, turns: 2, to: "foes" }),
      ultimate: spell("Boro Breath", null, { k: "damage", mult: 2.2, zone: true }, { k: "poison", pct: 0.05, turns: 3, to: "foes" }),
    },
  },
  [EMPEROR_IDS.whitebeard]: {
    spell: spell("Gura Gura no Mi", null, { k: "damage", mult: 1.5, zone: true }, { k: "stun", turns: 1, count: 1 }, { k: "mod", stat: "def", amount: -0.2, turns: 2, to: "foes" }),
    // Haki du roi des mers : −25 % de dégâts tant qu'il a plus de la moitié de ses PV ; un allié qui tombe lui donne un bouclier de 10 %
    guard: { when: "above", at: 0.5, reduce: 0.25 },
    allyDeathShield: 0.1,
    ultimate: spell("Séisme", null, { k: "damage", mult: 2, zone: true }),
    noTertiary: true,
  },
};

export const BOSS_SKILLS: Record<number, Pick<BattleCard, "basicAttack" | "spell" | "ultimate" | "tertiary" | "noTertiary" | "startGauge" | "soulPocket" | "phase" | "guard" | "allyDeathShield">> = {
  ...EMPERORS,
  2754: {
    basicAttack: { name: "Goshikito", rider: { kind: "ignoreDef", pct: 0.15, immediate: true } },
    spell: {
      name: "Parasite", target: null, final: true,
      effects: [{ k: "mod", stat: "speed", amount: -0.25, turns: 2, to: "foes", count: 2 }],
    },
    ultimate: {
      name: "Birdcage", target: null, final: true,
      effects: [{ k: "damage", mult: 0.6, zone: true }, { k: "poison", pct: 0.04, turns: 2, to: "foes" }],
    },
    noTertiary: true,
  },
};
