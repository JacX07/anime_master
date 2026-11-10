// Règles d'équilibrage appliquées à tous les sorts de personnage (v0.3.0, lot 4). Pur, sans dépendance.
import type { CharacterSpell, Effect } from "./spells";

export type SpellSlot = "special" | "tertiary" | "ultimate";

/** Silences de zone conservés : quelques ultimes où un silence collectif colle au personnage. */
const ZONE_SILENCE_KEEP: Record<number, SpellSlot[]> = {
  417: ["ultimate"], // Lelouch — Geass : Ordre absolu
  71: ["ultimate"], // L — Échec et mat
  89225: ["ultimate"], // Shouta Aizawa — Regard de l'Effaceur
  90107: ["ultimate"], // Kusuo Saiki — Effacement de mémoire
  1086: ["ultimate"], // Sousuke Aizen — Hogyoku : Ascension
};
/** Un sort ne soigne pas son lanceur de plus de 35 % de ses PV max (les soins d'alliés ne sont pas plafonnés). */
export const SELF_HEAL_CAP = 0.35;
/** Provocation : 2 tours au plus si c'est le seul effet du sort, 1 tour si elle s'accompagne d'autres effets. */
export const TAUNT_ALONE_MAX = 2;
export const TAUNT_COMBINED_MAX = 1;

function rule(characterId: number, slot: SpellSlot, spell: CharacterSpell, e: Effect): Effect {
  if (e.k === "silence" && e.to === "foes" && !ZONE_SILENCE_KEEP[characterId]?.includes(slot)) {
    // Une seule cible : celle du sort s'il vise un ennemi, sinon l'ennemi à l'ATK la plus élevée
    return spell.target === "foe" ? { ...e, to: "target" } : { ...e, count: 1 };
  }
  if (e.k === "heal" && e.to === "self" && e.pct > SELF_HEAL_CAP) return { ...e, pct: SELF_HEAL_CAP };
  if (e.k === "taunt") return { ...e, turns: Math.min(e.turns, spell.effects.length === 1 ? TAUNT_ALONE_MAX : TAUNT_COMBINED_MAX) };
  return e;
}

export function applySpellRules<T extends CharacterSpell | null | undefined>(characterId: number, slot: SpellSlot, spell: T): T {
  if (!spell) return spell;
  return { ...spell, effects: spell.effects.map((e) => rule(characterId, slot, spell, e)) } as T;
}

export function withSpellRules(catalog: Record<number, CharacterSpell>, slot: SpellSlot): Record<number, CharacterSpell> {
  return Object.fromEntries(Object.entries(catalog).map(([id, spell]) => [id, applySpellRules(Number(id), slot, spell)]));
}
