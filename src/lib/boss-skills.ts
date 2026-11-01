import type { BattleCard } from "./battle";

/** Kit des boss ; les exemplaires de collection gardent leurs sorts habituels. */
export const BOSS_SKILLS: Record<number, Pick<BattleCard, "basicAttack" | "spell" | "ultimate" | "noTertiary">> = {
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
