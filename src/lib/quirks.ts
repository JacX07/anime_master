// Deku, One For All (lot 3, docs/specs/combat.md) : six alters à la place du secondaire, du tertiaire et de l'ultime.
import type { CharacterSpell } from "./spells";

export const DEKU = 89028;
/** Recharge de chaque alter, en actions de Deku */
export const QUIRK_COOLDOWN = 3;
/** Fa jin : charge ajoutée par attaque de base, et plafond (250 % = 5 crans) */
export const FA_JIN_STEP = 0.5;
export const FA_JIN_MAX = 2.5;
/** Danger sense : esquive portée à 50 % face à un coup fatal, puis 3 tours avant le déclenchement suivant */
export const DANGER_DODGE = 0.5;
export const DANGER_COOLDOWN = 3;

/** Alters actifs, dans l'ordre de la main (Danger sense, passif, s'affiche entre Fa jin et Fouet noir) */
export const QUIRKS: Record<number, CharacterSpell[]> = {
  [DEKU]: [
    { name: "Embrayage", target: null, final: true, effects: [{ k: "mod", stat: "speed", amount: 0.2, turns: 2, to: "team" }, { k: "mod", stat: "speed", amount: -0.2, turns: 2, to: "foes" }] },
    { name: "Fa jin", target: "foe", final: true, damageKind: "physical", effects: [{ k: "faJin", mult: 2 }] },
    { name: "Fouet noir", target: "foe", final: true, effects: [{ k: "stun", turns: 1, count: 1, to: "target" }] },
    { name: "Écran de fumée", target: null, final: true, effects: [{ k: "smoke", turns: 2 }] },
    { name: "Voltige", target: null, final: true, effects: [{ k: "quirkCut", turns: 1 }] },
  ],
};
export const DANGER_SENSE = { name: "Danger sense", text: `Face à un coup fatal, son esquive monte à ${DANGER_DODGE * 100} % ; ${DANGER_COOLDOWN} tours de recharge entre deux déclenchements.` };

export type QuirkSpell = "quirk0" | "quirk1" | "quirk2" | "quirk3" | "quirk4";
export const QUIRK_SPELLS: QuirkSpell[] = ["quirk0", "quirk1", "quirk2", "quirk3", "quirk4"];
export const isQuirk = (s: string): s is QuirkSpell => s.startsWith("quirk");
export const quirkIndex = (s: QuirkSpell) => Number(s.slice(5));
