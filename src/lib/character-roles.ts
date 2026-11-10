// Rôles des personnages (v0.3.0) : Attaque, Défense, Support, déduits de leurs sorts. Pur : utilisable dans le navigateur.

import type { CardType, Rarity } from "../generated/prisma/enums";
import { spellOf, type CharacterSpell, type Effect } from "./spells";
import { TERTIARY_SPELLS } from "./tertiary-catalog";
import { ULTIMATE_CATALOG } from "./ultimate-catalog";

export type Role = "attack" | "defense" | "support";
export const ROLES: Role[] = ["attack", "defense", "support"];
export const ROLE_LABELS: Record<Role, string> = { attack: "Attaque", defense: "Défense", support: "Support" };

/** N, R et SR n'ont que le sort de leur type. */
const TYPE_ROLES: Record<CardType, Role[]> = { COMBAT: ["attack"], MAGIE: ["attack"], AVENTURE: ["attack"], COEUR: ["support", "defense"], MYSTERE: ["support"] };

/** Poids d'un effet pour chaque rôle : les gros effets comptent plus que les petits bonus. */
function effectScore(effect: Effect): Partial<Record<Role, number>> {
  switch (effect.k) {
    case "damage": return { attack: effect.mult * (effect.zone ? 1.3 : 1) * (effect.hits ?? 1) };
    case "shield": case "reduce": case "taunt": case "immune": case "counter": case "bloodlust": return { defense: 1 };
    case "mod": {
      const w = Math.abs(effect.amount) >= 0.2 ? 1 : 0.5;
      return effect.amount > 0 && effect.stat === "def" && effect.to !== "foes" ? { defense: w } : { support: w };
    }
    case "heal": case "regen": case "revive": case "arise": return { support: 1.2 };
    case "purge": case "resetCd": case "poison": case "silence": case "stun": case "seal": case "steal": return { support: 1 };
  }
  return {};
}

/** Rôles d'une carte : le rôle dominant, plus ceux qui pèsent au moins 70 % de lui. */
export function rolesOf(card: { characterId: number; rarity: Rarity; type: CardType }): Role[] {
  if (card.rarity !== "SSR" && card.rarity !== "UR") return TYPE_ROLES[card.type];
  const spells = [spellOf(card.characterId, card.rarity, card.type), TERTIARY_SPELLS[card.characterId], ULTIMATE_CATALOG[card.characterId]].filter((s): s is CharacterSpell => !!s);
  const score: Record<Role, number> = { attack: 0, defense: 0, support: 0 };
  for (const spell of spells) for (const effect of spell.effects) for (const [r, v] of Object.entries(effectScore(effect))) score[r as Role] += v;
  // L'attaque de base frappe toujours : le seuil d'attaque tient compte d'un sort offensif moyen par sort
  score.attack = Math.max(0, score.attack - spells.length * 0.5);
  const top = Math.max(...ROLES.map((r) => score[r]));
  if (top <= 0) return TYPE_ROLES[card.type];
  return ROLES.filter((r) => score[r] > 0 && score[r] >= top * 0.7);
}
