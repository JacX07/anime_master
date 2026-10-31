// Attaques de base personnalisées des SSR et UR (docs/specs/combat.md §4 ter).
// Les personnages sans entrée dédiée héritent d'un nom et d'un effet léger tirés de leur sort signature.

import type { CardType, Rarity } from "../generated/prisma/enums";
import { spellOf, type Effect, type ModStat } from "./spells";

export type BasicRider =
  | { kind: "mod"; stat: ModStat; amount: number; to: "self" | "target" }
  | { kind: "heal"; pct: number }
  | { kind: "shield"; pct: number }
  | { kind: "poison"; pct: number }
  | { kind: "drain"; pct: number }
  | { kind: "ignoreDef"; pct: number };

export interface BasicAttack {
  name: string;
  rider: BasicRider;
}

const mod = (stat: ModStat, amount: number, to: "self" | "target"): BasicRider => ({ kind: "mod", stat, amount, to });
const named = (name: string, rider: BasicRider): BasicAttack => ({ name, rider });

/** Fiches dédiées : nom emblématique et effet de base limité à une seule cible. */
const PERSONAL: Record<number, BasicAttack> = {
  13: named("Kunai de foudre", mod("def", -0.03, "target")), // Sasuke
  14: named("Shuriken Sharingan", mod("atk", -0.03, "target")), // Itachi
  17: named("Rasengan direct", mod("atk", 0.03, "self")), // Naruto
  40: named("Pistolet Gum-Gum", { kind: "ignoreDef", pct: 0.03 }), // Luffy
  61: named("Bras fleuri", mod("def", -0.03, "target")), // Robin
  62: named("Coupe à trois sabres", mod("crit", 0.03, "self")), // Zoro
  85: named("Kunai copié", mod("crit", 0.03, "self")), // Kakashi
  305: named("Coup de pied enflammé", mod("atk", 0.03, "self")), // Sanji
  309: named("Coup de sabot", { kind: "heal", pct: 0.02 }), // Chopper
  723: named("Frappe du Clima-Tact", mod("atk", -0.03, "target")), // Nami
  724: named("Étoile explosive", { kind: "poison", pct: 0.005 }), // Usopp
  1662: named("Poing de sable", mod("def", 0.03, "self")), // Gaara
  2007: named("Ombre croisée", mod("atk", -0.03, "target")), // Shikamaru
  2072: named("Flamme légère", { kind: "poison", pct: 0.005 }), // Ace
  2423: named("Rasengan crapaud", mod("def", -0.03, "target")), // Jiraiya
  13767: named("Coupe de Kikoku", { kind: "ignoreDef", pct: 0.03 }), // Law
  126635: named("Coup de Nue", { kind: "shield", pct: 0.02 }), // Megumi
  127212: named("Coup divergeant", mod("crit", 0.03, "self")), // Yuuji
  127691: named("Impulsion d'Infini", { kind: "shield", pct: 0.02 }), // Gojo
  129571: named("Coupe de katana avec Rika", { kind: "heal", pct: 0.02 }), // Yuta
  133699: named("Frappe de fléau", { kind: "poison", pct: 0.005 }), // Getou
  133700: named("Clou résonnant", mod("atk", -0.03, "target")), // Nobara
  133701: named("Démantèlement léger", { kind: "ignoreDef", pct: 0.03 }), // Sukuna
  133704: named("Frappe du ratio", mod("crit", 0.03, "self")), // Nanami
  134167: named("Balayage à la lance", { kind: "ignoreDef", pct: 0.03 }), // Maki
  137975: named("Coup suivi d'une feinte", mod("atk", 0.03, "self")), // Aoi Todo
  157115: named("« Reculez »", mod("atk", -0.03, "target")), // Toge
  162722: named("Pointe de lance inversée", { kind: "ignoreDef", pct: 0.03 }), // Toji
  88572: named("Éclat de glace", mod("def", -0.03, "target")), // Emilia
  88573: named("Coup de barre", mod("def", 0.03, "self")), // Subaru
  88575: named("Coup de fléau", mod("crit", 0.03, "self")), // Rem
  422: named("Coup de Dragonslayer", { kind: "ignoreDef", pct: 0.03 }), // Guts
  424: named("Pointe de rapière", mod("crit", 0.03, "self")), // Griffith
  35252: named("Gadget lancé", mod("def", 0.03, "self")), // Okabe Rintaro
  30: named("Coup direct", mod("atk", 0.03, "self")), // Gon
  27: named("Décharge du bout des doigts", mod("dodge", 0.03, "self")), // Killua
  130102: named("Entaille de tronçonneuse", { kind: "drain", pct: 0.02 }), // Denji
  137080: named("Tir contrôlé", mod("atk", -0.03, "target")), // Makima
  176754: named("Zoltraak", { kind: "ignoreDef", pct: 0.03 }), // Frieren
  89028: named("Delaware Smash léger", mod("atk", 0.03, "self")), // Midoriya
  89224: named("Poing du One For All", mod("atk", 0.03, "self")), // All Might
  89220: named("Éclat de glace et de feu", mod("atk", -0.03, "target")), // Todoroki
};

function riderFromSignature(effects: Effect[]): BasicRider {
  const mods = effects.filter((e): e is Extract<Effect, { k: "mod" }> => e.k === "mod");
  const modEffect = mods.find((e) => e.amount < 0) ?? mods[0];
  if (modEffect) {
    return mod(modEffect.stat, Math.sign(modEffect.amount || 1) * 0.03, modEffect.amount < 0 ? "target" : "self");
  }

  if (effects.some((e) => e.k === "poison")) return { kind: "poison", pct: 0.005 };
  const damage = effects.find((e): e is Extract<Effect, { k: "damage" }> => e.k === "damage");
  if (damage?.ignoreDef || damage?.pierce) return { kind: "ignoreDef", pct: 0.03 };
  if (damage?.critSure) return mod("crit", 0.03, "self");
  if (damage?.drain) return { kind: "drain", pct: 0.02 };
  if (effects.some((e) => e.k === "heal" || e.k === "regen")) return { kind: "heal", pct: 0.02 };
  if (effects.some((e) => e.k === "shield" || e.k === "immune" || e.k === "purge" || e.k === "revive")) {
    return { kind: "shield", pct: 0.02 };
  }
  return mod("atk", -0.03, "target");
}

/** Attaque de base SSR/UR ; les autres raretés conservent l'attaque générique. */
export function basicAttackOf(characterId: number, rarity: Rarity, type: CardType): BasicAttack | null {
  if (rarity !== "SSR" && rarity !== "UR") return null;
  const authored = PERSONAL[characterId];
  if (authored) return authored;
  const signature = spellOf(characterId, rarity, type);
  if (!signature) return null;
  return named(`Frappe inspirée de ${signature.name}`, riderFromSignature(signature.effects));
}

const statName: Record<ModStat, string> = { atk: "ATK", def: "DEF", crit: "critique", dodge: "esquive" };
const percent = (n: number) => `${Number.isInteger(n * 100) ? n * 100 : (n * 100).toLocaleString("fr-FR")} %`;

export function describeBasicRider(rider: BasicRider): string {
  switch (rider.kind) {
    case "mod": {
      const sign = rider.amount > 0 ? "+" : "−";
      const value = rider.stat === "crit" || rider.stat === "dodge" ? `${Math.round(Math.abs(rider.amount) * 100)} points` : percent(Math.abs(rider.amount));
      const who = rider.to === "self" ? "le lanceur" : "la cible";
      const timing = rider.stat === "dodge" ? "jusqu'à sa prochaine action" : `pour sa prochaine action`;
      return `${statName[rider.stat]} ${sign}${value} pour ${who}, ${timing}`;
    }
    case "heal": return `rend ${percent(rider.pct)} des PV max au lanceur`;
    case "shield": return `bouclier de ${percent(rider.pct)} des PV max pour le lanceur`;
    case "poison": return `poison : ${percent(rider.pct)} des PV max de la cible à sa prochaine action`;
    case "drain": return `rend ${percent(rider.pct)} des dégâts infligés en PV`;
    case "ignoreDef": return `ignore ${percent(rider.pct)} de la DEF sur la prochaine attaque du lanceur`;
  }
}

export function describeBasicAttack(attack: BasicAttack): string {
  return `1× ATK. ${describeBasicRider(attack.rider)}.`;
}
