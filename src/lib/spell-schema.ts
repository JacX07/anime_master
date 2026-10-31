// Description des effets de sort pour le Spell Builder (docs/specs/combat.md §12) : champs du formulaire et validation.
// `EFFECTS` est complet par construction (Record sur Effect["k"]) : ajouter un effet à spells.ts oblige à le décrire ici.

import { SPELL_TARGET_LABEL, type CharacterSpell, type Effect } from "./spells";

type Kind = Effect["k"];
export type Field =
  | { key: string; label: string; type: "number"; min: number; max: number; step: number; def: number }
  | { key: string; label: string; type: "bool"; def: false }
  | { key: string; label: string; type: "choice"; options: Record<string, string>; def: string };

const SCOPES = { target: "la cible", self: "le lanceur", team: "l'équipe", foes: "tous les ennemis" };
const STATS = { atk: "ATK", def: "DEF", crit: "Critique", dodge: "Esquive" };
const scope = (def: string): Field => ({ key: "to", label: "Qui", type: "choice", options: SCOPES, def });
const turns = (def: number): Field => ({ key: "turns", label: "Actions", type: "number", min: 1, max: 6, step: 1, def });
const pctField = (label: string, def: number, max = 1): Field => ({ key: "pct", label, type: "number", min: 0.01, max, step: 0.01, def });
const flag = (key: string, label: string): Field => ({ key, label, type: "bool", def: false });

export const EFFECTS: Record<Kind, { label: string; fields: Field[] }> = {
  damage: {
    label: "Dégâts",
    fields: [
      { key: "mult", label: "× ATK", type: "number", min: 0.05, max: 4, step: 0.01, def: 1 },
      flag("zone", "Tous les ennemis"),
      { key: "ignoreDef", label: "Ignore DEF", type: "number", min: 0, max: 1, step: 0.05, def: 0 },
      flag("pierce", "Traverse boucliers"),
      { key: "drain", label: "Vol de vie", type: "number", min: 0, max: 1, step: 0.05, def: 0 },
      flag("critSure", "Critique assuré"),
    ],
  },
  mod: {
    label: "Bonus / malus de stat",
    fields: [
      { key: "stat", label: "Stat", type: "choice", options: STATS, def: "atk" },
      { key: "amount", label: "Montant (− = malus)", type: "number", min: -0.6, max: 0.6, step: 0.05, def: 0.2 },
      turns(2),
      scope("self"),
    ],
  },
  heal: { label: "Soin", fields: [pctField("% PV max", 0.15), scope("team")] },
  regen: { label: "Soin sur la durée", fields: [pctField("% PV max / action", 0.05, 0.5), turns(3), scope("self")] },
  shield: { label: "Bouclier", fields: [pctField("% PV max", 0.15), scope("team")] },
  poison: { label: "Poison", fields: [pctField("% PV max / action", 0.05, 0.3), turns(3), scope("target")] },
  silence: { label: "Silence", fields: [turns(2), scope("target")] },
  immune: { label: "Immunité aux malus", fields: [turns(2), scope("team")] },
  purge: { label: "Purge des malus", fields: [scope("team")] },
  revive: { label: "Réanimation", fields: [pctField("% PV max", 0.2)] },
};

/** Effet neuf avec les valeurs par défaut. */
export function newEffect(k: Kind): Effect {
  const e: Record<string, unknown> = { k };
  for (const f of EFFECTS[k].fields) if (f.type !== "bool" && !(f.type === "number" && f.def === 0)) e[f.key] = f.def;
  return e as unknown as Effect;
}

const TARGETS = ["foe", "ally", "deadAlly"] as const;

/** Valide un sort venu du navigateur : kinds connus, nombres bornés, champs inconnus ignorés. Renvoie null si invalide. */
export function parseSpell(raw: unknown): CharacterSpell | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name.trim().slice(0, 60) : "";
  if (!name || !Array.isArray(r.effects) || r.effects.length === 0 || r.effects.length > 8) return null;
  const target = r.target === null ? null : TARGETS.find((t) => t === r.target);
  if (target === undefined) return null;
  const effects: Effect[] = [];
  for (const raw of r.effects) {
    const o = raw as Record<string, unknown> | null;
    const def = o && Object.hasOwn(EFFECTS, String(o.k)) ? EFFECTS[o.k as Kind] : null;
    if (!o || !def) return null;
    const e: Record<string, unknown> = { k: o.k };
    for (const f of def.fields) {
      const v = o[f.key];
      if (f.type === "number") {
        const n = typeof v === "number" ? v : v == null ? f.def : NaN;
        if (!Number.isFinite(n)) return null;
        const c = Math.min(f.max, Math.max(f.min, n));
        if (c !== 0 || f.def !== 0) e[f.key] = c;
      } else if (f.type === "bool") {
        if (v === true) e[f.key] = true;
      } else {
        const c = typeof v === "string" && Object.hasOwn(f.options, v) ? v : f.def;
        e[f.key] = c;
      }
    }
    effects.push(e as unknown as Effect);
  }
  return { name, target, effects };
}

export const TARGET_CHOICES: { value: CharacterSpell["target"]; label: string }[] = [
  { value: "foe", label: SPELL_TARGET_LABEL.foe },
  { value: "ally", label: SPELL_TARGET_LABEL.ally },
  { value: "deadAlly", label: SPELL_TARGET_LABEL.deadAlly },
  { value: null, label: SPELL_TARGET_LABEL.none },
];
