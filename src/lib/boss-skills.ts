import type { BattleCard } from "./battle";
import type { CharacterSpell } from "./spells";

/** Kit des boss ; les exemplaires de collection gardent leurs sorts habituels. */
export const EMPEROR_IDS = { shanks: 727, bigMom: 5, kaido: 46109, whitebeard: 2751 } as const;

const spell = (name: string, target: CharacterSpell["target"], ...effects: CharacterSpell["effects"]): CharacterSpell => ({ name, target, effects, final: true });

/** Kits des empereurs du Défi (docs/specs/raid-empereurs.md) : première version, à équilibrer avec les passages. */
const EMPERORS: Record<number, Pick<BattleCard, "basicAttack" | "spell" | "ultimate" | "tertiary" | "noTertiary" | "startGauge" | "soulPocket" | "phase">> = {
  [EMPEROR_IDS.shanks]: {
    // Haki des rois en premier : les personnages dont l'ATK est inférieure à celle de Shanks s'endorment
    startGauge: 100,
    ultimate: spell("Haki des rois", null, { k: "sleep", turns: 2, weaker: true }),
    spell: spell("Divine Departure", null, { k: "damage", mult: 2.1, zone: true, ignoreDef: 0.5 }),
    // Critiques +30 %, ATK +50 % (les dégâts critiques +50 % ne sont pas encore une statistique de sort)
    tertiary: spell("Voix de l'empereur", null, { k: "mod", stat: "crit", amount: 0.3, turns: 3, to: "team" }, { k: "mod", stat: "atk", amount: 0.5, turns: 3, to: "team" }),
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
    spell: spell("Hassaikai", "foe", { k: "damage", mult: 1.6 }, { k: "reduce", pct: 0.2, turns: 2, to: "self" }),
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
    tertiary: spell("Haki du roi des mers", null, { k: "reduce", pct: 0.25, turns: 3, to: "self" }),
    ultimate: spell("Séisme", null, { k: "damage", mult: 2, zone: true }),
  },
};

export const BOSS_SKILLS: Record<number, Pick<BattleCard, "basicAttack" | "spell" | "ultimate" | "tertiary" | "noTertiary" | "startGauge" | "soulPocket" | "phase">> = {
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
