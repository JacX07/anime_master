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
/** Réduction de dégâts subis : valeur divisée par 2, 2 tours au plus. */
export const REDUCE_FACTOR = 0.5;
export const REDUCE_MAX_TURNS = 2;
/** Ultimes : bouclier et soin d'équipe plafonnés à 20 % des PV max. */
export const ULT_TEAM_CAP = 0.2;
/**
 * Une seule provocation par personnage : elle reste sur son sort le plus fréquent (secondaire, sinon tertiaire)
 * et quitte les autres. Liste établie le 2026-11-10 sur le catalogue (18 personnages concernés).
 */
const TAUNT_STRIP: Record<number, SpellSlot[]> = {
  67327: ["ultimate"], 22036: ["ultimate"], 12: ["ultimate"], 145345: ["tertiary", "ultimate"], 89243: ["tertiary", "ultimate"],
  434: ["ultimate"], 1662: ["ultimate"], 11222: ["ultimate"], 13045: ["ultimate"], 46484: ["ultimate"], 66173: ["ultimate"],
  67065: ["tertiary", "ultimate"], 80491: ["tertiary", "ultimate"], 89224: ["ultimate"], 129133: ["ultimate"],
  127222: ["ultimate"], 40881: ["ultimate"], 88575: ["tertiary", "ultimate"],
};

function rule(characterId: number, slot: SpellSlot, spell: CharacterSpell, e: Effect): Effect {
  if (e.k === "silence" && e.to === "foes" && !ZONE_SILENCE_KEEP[characterId]?.includes(slot)) {
    // Une seule cible : celle du sort s'il vise un ennemi, sinon l'ennemi à l'ATK la plus élevée
    return spell.target === "foe" ? { ...e, to: "target" } : { ...e, count: 1 };
  }
  if (e.k === "heal" && e.to === "self" && e.pct > SELF_HEAL_CAP) return { ...e, pct: SELF_HEAL_CAP };
  if (e.k === "taunt") return { ...e, turns: Math.min(e.turns, spell.effects.length === 1 ? TAUNT_ALONE_MAX : TAUNT_COMBINED_MAX) };
  if (e.k === "reduce") return { ...e, pct: Math.round(e.pct * REDUCE_FACTOR * 1000) / 1000, turns: Math.min(e.turns, REDUCE_MAX_TURNS) };
  if (slot === "ultimate" && (e.k === "shield" || e.k === "heal") && e.to === "team" && e.pct > ULT_TEAM_CAP) return { ...e, pct: ULT_TEAM_CAP };
  return e;
}

export function applySpellRules<T extends CharacterSpell | null | undefined>(characterId: number, slot: SpellSlot, spell: T): T {
  if (!spell) return spell;
  const strip = TAUNT_STRIP[characterId]?.includes(slot) && spell.effects.length > 1;
  const kept = strip ? spell.effects.filter((e) => e.k !== "taunt") : spell.effects;
  const base = { ...spell, effects: kept };
  return { ...base, effects: kept.map((e) => rule(characterId, slot, base, e)) } as T;
}

export function withSpellRules(catalog: Record<number, CharacterSpell>, slot: SpellSlot): Record<number, CharacterSpell> {
  return Object.fromEntries(Object.entries(catalog).map(([id, spell]) => [id, applySpellRules(Number(id), slot, spell)]));
}
