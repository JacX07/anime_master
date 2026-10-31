// Sorts de personnage des SSR et UR (docs/specs/combat.md §4 bis) : des listes d'effets lues par le moteur (battle.ts).
// Pur : aucune lecture en base. Un SSR ou UR sans sort écrit reçoit un sort générique déduit de son type.

import type { CardType, Rarity } from "../generated/prisma/enums";

/** Qui reçoit un effet : la cible choisie, le lanceur, son équipe, ou tous les ennemis. */
export type Scope = "target" | "self" | "team" | "foes";
export type ModStat = "atk" | "def" | "crit" | "dodge";

export type Effect =
  /** Dégâts × ATK ; `zone` touche tous les ennemis ; `drain` rend au lanceur cette part des dégâts ; `pierce` traverse les boucliers (et l'esquive) */
  | { k: "damage"; mult: number; zone?: boolean; ignoreDef?: number; pierce?: boolean; drain?: number; critSure?: boolean }
  /** Bonus ou malus (amount négatif) de la stat, en part (0,2 = +20 %, ou +20 points de critique) */
  | { k: "mod"; stat: ModStat; amount: number; turns: number; to: Scope }
  | { k: "heal"; pct: number; to: Scope }
  | { k: "regen"; pct: number; turns: number; to: Scope }
  | { k: "shield"; pct: number; to: Scope }
  /** Perd `pct` de ses PV max à chaque action du porteur */
  | { k: "poison"; pct: number; turns: number; to: Scope }
  /** Ne peut lancer que le sort de base. Sans effet sur les boss. */
  | { k: "silence"; turns: number; to: Scope }
  | { k: "immune"; turns: number; to: Scope }
  | { k: "purge"; to: Scope }
  /** Réanime l'allié mort ciblé, une fois par combat */
  | { k: "revive"; pct: number };

export interface CharacterSpell {
  name: string;
  /** Ce que le joueur choisit : un ennemi, un allié, un allié mort, ou rien (zone, équipe, soi) */
  target: "foe" | "ally" | "deadAlly" | null;
  effects: Effect[];
}

/** Actions de la carte avant le 1er lancer (il part à la 3ᵉ), puis entre deux lancers */
export const SPELL_FIRST = 3;
export const SPELL_COOLDOWN = 5;

const S = (name: string, target: CharacterSpell["target"], ...effects: Effect[]): CharacterSpell => ({ name, target, effects });
const dmg = (mult: number, o: Omit<Extract<Effect, { k: "damage" }>, "k" | "mult"> = {}): Effect => ({ k: "damage", mult, ...o });
const mod = (stat: ModStat, amount: number, turns: number, to: Scope): Effect => ({ k: "mod", stat, amount, turns, to });

/** Sorts écrits à la main, par identifiant AniList du personnage. */
export const CHARACTER_SPELLS: Record<number, CharacterSpell> = {
  // One Piece
  40: S("Gomu Gomu no Gatling", "foe", dmg(2.2), mod("atk", 0.2, 2, "self")),
  62: S("Santoryu Ogi", "foe", dmg(1.8), mod("crit", 0.3, 3, "self")),
  305: S("Diable Jambe", "foe", dmg(2, { ignoreDef: 0.3 })),
  61: S("Mil Fleur", "foe", dmg(1), { k: "silence", turns: 2, to: "target" }),
  13767: S("Shambles", "foe", dmg(1.6, { pierce: true }), mod("def", -0.2, 2, "target")),
  723: S("Thunderbolt Tempo", null, dmg(0.6, { zone: true }), mod("atk", -0.2, 2, "foes")),
  2072: S("Hiken", "foe", dmg(1.8, { drain: 0.4 })),
  309: S("Rumble Ball", null, { k: "heal", pct: 0.15, to: "team" }, { k: "purge", to: "team" }),
  724: S("Kemuri Boshi", null, mod("dodge", 0.3, 2, "team")),
  // Naruto
  17: S("Mode Kyubi", null, mod("atk", 0.2, 2, "team"), { k: "regen", pct: 0.05, turns: 3, to: "self" }),
  14: S("Tsukuyomi", "foe", dmg(1.2), { k: "silence", turns: 2, to: "target" }, mod("atk", -0.2, 2, "target")),
  85: S("Raikiri", "foe", dmg(2.2, { pierce: true, ignoreDef: 0.3 })),
  13: S("Amaterasu", "foe", { k: "poison", pct: 0.05, turns: 3, to: "target" }),
  2007: S("Possession des ombres", null, mod("crit", -0.3, 2, "foes"), mod("def", -0.15, 2, "foes")),
  1662: S("Armure de sable", null, { k: "shield", pct: 0.15, to: "team" }),
  2423: S("Rasengan crapaud", null, dmg(0.9, { zone: true })),
  // Jujutsu Kaisen
  127691: S("Pourpre", null, dmg(1.1, { zone: true, pierce: true })),
  127212: S("Black Flash", "foe", dmg(2, { critSure: true })),
  126635: S("Mahoraga", null, mod("def", 0.2, 3, "team"), { k: "immune", turns: 2, to: "team" }),
  133704: S("Ratio 7:3", "foe", dmg(1.6), mod("def", -0.25, 2, "target")),
  133700: S("Résonance", "foe", { k: "poison", pct: 0.05, turns: 3, to: "target" }, mod("atk", -0.15, 2, "target")),
  134167: S("Lance du rêve", "foe", dmg(1.4), mod("dodge", 0.5, 2, "self")),
  133701: S("Démantèlement", null, dmg(0.8, { zone: true, drain: 0.3 })),
  129571: S("Rika", "deadAlly", { k: "revive", pct: 0.35 }),
  157115: S("Mot-clé : « Arrêtez-vous »", null, { k: "silence", turns: 1, to: "foes" }),
  133699: S("Manipulation de malédiction", null, dmg(0.8, { zone: true }), { k: "poison", pct: 0.03, turns: 3, to: "foes" }),
  162722: S("Lance inversée", "foe", dmg(2, { pierce: true }), mod("crit", 0.25, 2, "self")),
  137975: S("Boogie Woogie", "foe", dmg(1.2), mod("crit", 0.25, 2, "team")),
};

/** Sort générique des SSR et UR sans sort écrit, d'après leur type. */
const GENERIC: Record<CardType, CharacterSpell> = {
  COMBAT: S("Coup décisif", "foe", dmg(1.8, { ignoreDef: 0.3 })),
  MYSTERE: S("Entrave", "foe", dmg(1), { k: "silence", turns: 2, to: "target" }),
  MAGIE: S("Drain", "foe", dmg(1.4, { drain: 0.3 })),
  COEUR: S("Bénédiction", null, { k: "heal", pct: 0.12, to: "team" }),
  AVENTURE: S("Charge", null, dmg(0.8, { zone: true }), mod("atk", 0.15, 2, "team")),
};

/** Sort de personnage d'une carte, ou null (N, R et SR n'en ont pas). */
export function spellOf(characterId: number, rarity: Rarity, type: CardType): CharacterSpell | null {
  if (rarity !== "SSR" && rarity !== "UR") return null;
  return CHARACTER_SPELLS[characterId] ?? GENERIC[type];
}

const pct = (x: number) => `${Math.round(Math.abs(x) * 100)} %`;
const nx = (n: number) => `${n} action${n > 1 ? "s" : ""}`;
const WHO: Record<Scope, string> = { target: "la cible", self: "le lanceur", team: "l'équipe", foes: "tous les ennemis" };
const STAT_NAMES: Record<ModStat, string> = { atk: "ATK", def: "DEF", crit: "critique", dodge: "esquive" };

/** Texte d'un effet, pour l'écran des sorts. */
export function describeEffect(e: Effect): string {
  switch (e.k) {
    case "damage":
      return [
        `${String(e.mult).replace(".", ",")}× ATK${e.zone ? " sur tous les ennemis" : ""}`,
        e.ignoreDef && `ignore ${pct(e.ignoreDef)} de la DEF`,
        e.pierce && "traverse les boucliers",
        e.critSure && "coup critique assuré",
        e.drain && `rend ${pct(e.drain)} des dégâts en PV`,
      ].filter(Boolean).join(", ");
    case "mod":
      return `${STAT_NAMES[e.stat]} ${e.amount > 0 ? "+" : "−"}${e.stat === "crit" ? `${Math.round(Math.abs(e.amount) * 100)} points` : pct(e.amount)} pour ${WHO[e.to]}, ${nx(e.turns)}`;
    case "heal": return `soigne ${WHO[e.to]} de ${pct(e.pct)} des PV max`;
    case "regen": return `soin sur la durée de ${pct(e.pct)} des PV max pour ${WHO[e.to]}, ${nx(e.turns)}`;
    case "shield": return `bouclier de ${pct(e.pct)} des PV max pour ${WHO[e.to]}`;
    case "poison": return `poison : ${pct(e.pct)} des PV max par action pour ${WHO[e.to]}, ${nx(e.turns)}`;
    case "silence": return `silence sur ${WHO[e.to]} (sort de base seulement), ${nx(e.turns)}; sans effet sur les boss`;
    case "immune": return `immunité aux malus pour ${WHO[e.to]}, ${nx(e.turns)}`;
    case "purge": return `retire les malus de ${WHO[e.to]}`;
    case "revive": return `réanime un allié mort avec ${pct(e.pct)} de ses PV max (une fois par combat)`;
  }
}
export const describeSpell = (sp: CharacterSpell) => sp.effects.map(describeEffect).join(" ; ") + ".";
export const SPELL_TARGET_LABEL = { foe: "1 ennemi", ally: "1 allié", deadAlly: "1 allié mort", none: "Aucune cible" } as const;
