// Valide un fichier de sorts réécrits (scripts/spell-design/GUIDE.md). Usage : npx tsx scripts/spell-design/validate.ts <output-N.json> [--merge]
import { readFileSync } from "node:fs";

type E = Record<string, unknown> & { k: string };
interface S { name: string; target: "foe" | "ally" | "deadAlly" | null; effects: E[] }
interface Row { id: number; orientation: string; secondary: S; tertiary: S; ultimate: S }
const ORIENT = ["attaque", "soutien", "tank", "controle", "hybride"];
const SCOPES = ["self", "target", "team", "foes"];
const STATS = ["atk", "def", "crit", "dodge"];
const num = (x: unknown) => typeof x === "number" && Number.isFinite(x);
const errs: string[] = [];
const err = (id: number | string, slot: string, m: string) => errs.push(`#${id} ${slot} : ${m}`);

/** Bandes par emplacement : [min, max] de chaque grandeur */
const BAND = {
  secondary: { dmgSingle: [0.5, 1.6], dmgZone: [0.3, 0.9], atkUp: [0.1, 0.22], critUp: [0.08, 0.16], defUp: [0.1, 0.28], dodgeUp: [0.1, 0.28], shield: [0.05, 0.14], heal: [0.08, 0.17], down: [0.1, 0.28], critDown: [0.08, 0.16], poison: [0.03, 0.07], reduce: [0.15, 0.32], revive: [0.2, 0.5] },
  tertiary: { dmgSingle: [0, 0.9], dmgZone: [0, 0.6], atkUp: [0.2, 0.38], critUp: [0.12, 0.28], defUp: [0.2, 0.38], dodgeUp: [0.25, 0.55], shield: [0.1, 0.2], heal: [0.15, 0.28], down: [0.2, 0.38], critDown: [0.12, 0.28], poison: [0.04, 0.09], reduce: [0.2, 0.4], revive: [0.3, 0.6] },
  ultimate: { dmgSingle: [2.5, 5.2], dmgZone: [1, 2.4], atkUp: [0.3, 0.55], critUp: [0.2, 0.4], defUp: [0.3, 0.55], dodgeUp: [0.3, 0.6], shield: [0.15, 0.32], heal: [0.2, 0.4], down: [0.3, 0.55], critDown: [0.2, 0.4], poison: [0.05, 0.1], reduce: [0.3, 0.55], revive: [0.4, 0.75] },
} as const;
const inBand = (v: number, [lo, hi]: readonly [number, number]) => v >= lo - 1e-9 && v <= hi + 1e-9;

function checkEffect(id: number, slot: "secondary" | "tertiary" | "ultimate", sp: S, e: E) {
  const b = BAND[slot];
  const scope = (e as { to?: string }).to;
  const needScope = () => { if (!SCOPES.includes(String(scope))) err(id, slot, `scope invalide (${scope}) pour ${e.k}`); else if (scope === "target" && sp.target === null) err(id, slot, `scope "target" sans cible (${e.k})`); };
  const band = (v: unknown, r: readonly [number, number], what: string) => { if (!num(v)) err(id, slot, `${what} n'est pas un nombre`); else if (!inBand(v as number, r)) err(id, slot, `${what} = ${v} hors bande [${r[0]}, ${r[1]}]`); };
  switch (e.k) {
    case "damage": {
      if (e.zone && sp.target !== null) err(id, slot, "dégâts de zone : target doit être null");
      if (!e.zone && sp.target === null) err(id, slot, "dégâts à cible unique sans cible : mets target:\"foe\" ou zone:true");
      band(e.mult, e.zone ? b.dmgZone : b.dmgSingle, "mult");
      for (const k of ["ignoreDef", "drain"]) if (e[k] !== undefined && !(num(e[k]) && (e[k] as number) >= 0 && (e[k] as number) <= 0.6)) err(id, slot, `${k} invalide`);
      break;
    }
    case "mod": {
      needScope();
      if (!STATS.includes(String(e.stat))) { err(id, slot, `stat invalide ${e.stat}`); break; }
      if (!num(e.amount) || e.amount === 0) { err(id, slot, "amount invalide"); break; }
      if (!num(e.turns) || (e.turns as number) < 1 || (e.turns as number) > 3) err(id, slot, "turns doit être 1 à 3");
      const up = (e.amount as number) > 0, a = Math.abs(e.amount as number);
      if (up && ["foes", "target"].includes(String(scope))) err(id, slot, "un bonus doit viser self/team");
      if (!up && ["self", "team"].includes(String(scope))) err(id, slot, "un malus doit viser target/foes");
      const r = up ? (e.stat === "atk" ? b.atkUp : e.stat === "crit" ? b.critUp : e.stat === "def" ? b.defUp : b.dodgeUp) : e.stat === "crit" ? b.critDown : b.down;
      band(a, r, `${e.stat} ${up ? "+" : "−"}`);
      break;
    }
    case "heal": needScope(); band(e.pct, b.heal, "heal.pct"); break;
    case "regen": needScope(); band(e.pct, [0.03, 0.1], "regen.pct"); if (!num(e.turns) || (e.turns as number) < 1 || (e.turns as number) > 4) err(id, slot, "regen.turns 1 à 4"); break;
    case "shield": needScope(); band(e.pct, b.shield, "shield.pct"); break;
    case "poison": needScope(); band(e.pct, b.poison, "poison.pct"); if (!num(e.turns) || (e.turns as number) < 2 || (e.turns as number) > 4) err(id, slot, "poison.turns 2 à 4"); if (["self", "team"].includes(String(scope))) err(id, slot, "poison doit viser target/foes"); break;
    case "silence": needScope(); if (!num(e.turns) || (e.turns as number) < 1 || (e.turns as number) > 2) err(id, slot, "silence.turns 1 ou 2"); if (["self", "team"].includes(String(scope))) err(id, slot, "silence doit viser target/foes"); break;
    case "immune": needScope(); if (!num(e.turns) || (e.turns as number) < 1 || (e.turns as number) > 3) err(id, slot, "immune.turns 1 à 3"); break;
    case "purge": needScope(); break;
    case "revive": if (sp.target !== "deadAlly") err(id, slot, "revive demande target:\"deadAlly\""); band(e.pct, b.revive, "revive.pct"); break;
    case "taunt": if (!num(e.turns) || (e.turns as number) < 1 || (e.turns as number) > 3) err(id, slot, "taunt.turns 1 à 3"); if (sp.target !== null) err(id, slot, "taunt : target doit être null"); break;
    case "reduce": needScope(); if (!["self", "team"].includes(String(scope))) err(id, slot, "reduce vise self/team"); band(e.pct, b.reduce, "reduce.pct"); if (!num(e.turns) || (e.turns as number) < 1 || (e.turns as number) > 3) err(id, slot, "reduce.turns 1 à 3"); break;
    default: err(id, slot, `effet inconnu ${e.k}`);
  }
}

export function validate(rows: Row[], inputIds?: number[]) {
  errs.length = 0;
  const seen = new Set<number>();
  for (const r of rows) {
    if (seen.has(r.id)) err(r.id, "-", "doublon");
    seen.add(r.id);
    if (!ORIENT.includes(r.orientation)) err(r.id, "-", `orientation invalide ${r.orientation}`);
    for (const slot of ["secondary", "tertiary", "ultimate"] as const) {
      const sp = r[slot];
      if (!sp || typeof sp.name !== "string" || sp.name.length < 2) { err(r.id, slot, "nom manquant"); continue; }
      if (/Frappe inspirée|Déchaînement :|— Élan bref|Percée mesurée/.test(sp.name)) err(r.id, slot, `nom générique : ${sp.name}`);
      if (![null, "foe", "ally", "deadAlly"].includes(sp.target as never)) err(r.id, slot, "target invalide");
      if (!Array.isArray(sp.effects) || sp.effects.length < 1 || sp.effects.length > 4) { err(r.id, slot, "1 à 4 effets"); continue; }
      sp.effects.forEach((e) => checkEffect(r.id, slot, sp, e));
    }
    if (r.secondary && r.tertiary && r.ultimate && new Set([r.secondary.name, r.tertiary.name, r.ultimate.name]).size < 3) err(r.id, "-", "les 3 sorts doivent avoir des noms différents");
  }
  if (inputIds) for (const id of inputIds) if (!seen.has(id)) err(id, "-", "personnage du lot manquant");
  // Statistiques
  const dmgSlot = (s: S) => s.effects.some((e) => e.k === "damage") && s.effects.every((e) => e.k === "damage" || (e.k === "mod" && (e.to === "self")));
  const allDmg = rows.filter((r) => dmgSlot(r.secondary) && dmgSlot(r.tertiary) && dmgSlot(r.ultimate)).length;
  const count = Object.fromEntries(ORIENT.map((o) => [o, rows.filter((r) => r.orientation === o).length]));
  return { allDmg, count, errors: [...errs] };
}

if (process.argv[1]?.endsWith("validate.ts")) {
  const file = process.argv[2];
  const rows = JSON.parse(readFileSync(file, "utf8")) as Row[];
  const inputFile = file.replace("output-", "input-");
  let ids: number[] | undefined;
  try { ids = (JSON.parse(readFileSync(inputFile, "utf8")) as { id: number }[]).map((c) => c.id); } catch { /* pas de lot */ }
  const { allDmg, count } = validate(rows, ids);
  if (rows.length && allDmg / rows.length > 0.4) err("lot", "-", `${allDmg}/${rows.length} personnages ont 3 sorts centrés sur les dégâts (max 35 %)`);
  console.log(`${rows.length} personnages ; orientations`, count, `; 3 sorts de dégâts : ${allDmg}`);
  if (errs.length) { console.log(errs.slice(0, 60).join("\n")); console.log(`${errs.length} erreur(s)`); process.exitCode = 1; } else console.log("OK");
}
