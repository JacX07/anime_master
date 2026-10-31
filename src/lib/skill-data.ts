// Sorts réécrits des SSR/UR (secondaire, tertiaire, ultime) : données générées par scripts/spell-design/merge.ts à partir des lots validés.
// Chaque sort est marqué `final` : ses valeurs sont déjà celles du jeu (aucun coefficient de modération ne s'applique).
import type { CharacterSpell } from "./spells";
import raw from "./skill-data.json";

export type Orientation = "attaque" | "soutien" | "tank" | "controle" | "hybride";
export interface SkillEntry {
  orientation: Orientation;
  secondary: CharacterSpell;
  tertiary: CharacterSpell;
  ultimate: CharacterSpell;
}

const DATA = raw as unknown as Record<string, SkillEntry>;
const final = (s: CharacterSpell): CharacterSpell => ({ ...s, final: true });
const slot = (k: "secondary" | "tertiary" | "ultimate"): Record<number, CharacterSpell> =>
  Object.fromEntries(Object.entries(DATA).map(([id, e]) => [Number(id), final(e[k])]));

export const SECONDARY_DATA = slot("secondary");
export const TERTIARY_DATA = slot("tertiary");
export const ULTIMATE_DATA = slot("ultimate");
export const orientationOf = (id: number): Orientation | undefined => DATA[id]?.orientation;
