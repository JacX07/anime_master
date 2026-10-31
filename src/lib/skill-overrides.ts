// Sorts appliqués au jeu depuis le Spell Builder (« Appliquer au jeu »), par personnage et par emplacement.
// Prioritaires sur les catalogues ; chaque valeur est `final` (aucun coefficient de modération). Fichier réécrit par /builder en dev.
import type { BasicAttack } from "./basic-attacks";
import type { CharacterSpell } from "./spells";
import raw from "./skill-overrides.json";

export interface SkillOverride { base?: BasicAttack; secondary?: CharacterSpell; tertiary?: CharacterSpell; ultimate?: CharacterSpell }
export const SKILL_OVERRIDES = raw as unknown as Record<string, SkillOverride>;

const slot = (k: "secondary" | "tertiary" | "ultimate"): Record<number, CharacterSpell> =>
  Object.fromEntries(Object.entries(SKILL_OVERRIDES).flatMap(([id, o]) => (o[k] ? [[Number(id), o[k]]] : [])));
export const SECONDARY_OVERRIDES = slot("secondary");
export const TERTIARY_OVERRIDES = slot("tertiary");
export const ULTIMATE_OVERRIDES = slot("ultimate");
