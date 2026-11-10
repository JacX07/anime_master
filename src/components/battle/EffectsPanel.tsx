"use client";

import type { Status, UnitId, UnitView } from "@/lib/battle";
import { STATUS_INFO, type UnitState } from "@/lib/battle-replay";
import type { PlayerCharacter } from "./BattlePlayer";

const pct = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.round(Math.abs(n) * 100)} %`;
const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
const CAP = 0.6;
const clamp = (n: number) => Math.max(-CAP, Math.min(CAP, n));

/** Valeur lisible d'un effet selon sa nature. */
function valueOf(status: Status, amount?: number) {
  if (amount === undefined || amount === 0) return null;
  if (status === "poison" || status === "burn") return `${pct(amount).replace("+", "")} des PV max par tour`;
  if (status === "bleed") return `${pct(amount).replace("+", "")} des PV actuels par tour`;
  if (status === "regen") return `${pct(amount)} des PV max par tour`;
  if (status === "reduce") return `dégâts subis ${pct(-amount)}`;
  if (status === "bloodlust") return `soigne ${pct(amount).replace("+", "")} des dégâts reçus`;
  // Le libellé porte déjà le sens (« ATK + » / « ATK − ») : valeur sans signe
  if (status.endsWith("Up") || status.endsWith("Down")) return `${Math.round(Math.abs(amount) * 100)} %`;
  return null;
}

/** Effets actifs d'une carte (valeur, tours restants, lanceur) et ses stats actuelles, bonus et malus compris (v0.3.0). */
export function EffectsPanel({ unit, state, info, characters }: { unit: UnitView; state: UnitState; info: Partial<Record<UnitId, UnitView>>; characters: Record<number, PlayerCharacter> }) {
  const fxd = state.fxd ?? {};
  const list: Status[] = [...(["exposed", "weaken", "elan"] as const).filter((k) => state[k]), ...state.fx];
  const sum = (stat: string) => list.reduce((s, k) => s + ((k.startsWith(stat) && (k.endsWith("Up") || k.endsWith("Down"))) ? (fxd[k]?.amount ?? 0) : 0), 0);
  const atkMod = clamp(sum("atk")) + (state.elan ? 0.1 : 0) - (state.weaken ? 0.2 : 0);
  const rows: [string, string, string][] = [
    ["ATK", fmt(unit.atk), fmt(unit.atk * (1 + atkMod))],
    ["DEF", fmt(unit.def), fmt(unit.def * (1 + clamp(sum("def"))))],
    ["Vitesse", fmt(unit.speed), fmt(Math.max(20, unit.speed * (1 + clamp(sum("speed")))))],
    ["Critique", "", sum("crit") ? pct(sum("crit")) : "—"],
    ["Esquive", "", sum("dodge") ? pct(sum("dodge")) : "—"],
    ["Dégâts subis", "", (fxd.reduce?.amount ? pct(-fxd.reduce.amount) : "") + (state.exposed ? " (exposé)" : "") || "—"],
  ];
  const name = (id?: UnitId) => (id && info[id] ? characters[info[id]!.characterId]?.name ?? id : null);
  return <section className="bt-effects" aria-label={`Effets de ${characters[unit.characterId]?.name ?? unit.id}`}>
    <h3>Effets actifs · {characters[unit.characterId]?.name ?? unit.id}</h3>
    {list.length ? <ul>{list.map((k) => {
      const d = fxd[k];
      const value = valueOf(k, d?.amount);
      const from = name(d?.source);
      return <li key={k} data-bad={STATUS_INFO[k].bad || undefined}>
        <b>{STATUS_INFO[k].label}</b>{value && <span> {value}</span>}
        {d?.turns !== undefined && <small> · {d.turns} tour{d.turns > 1 ? "s" : ""}</small>}
        {from && <small> · par {from}</small>}
        <em>{STATUS_INFO[k].help}</em>
      </li>;
    })}</ul> : <p className="bt-effects-none">Aucun effet actif.</p>}
    <table><thead><tr><th scope="col">Stat</th><th scope="col">Base</th><th scope="col">Actuelle</th></tr></thead>
      <tbody>{rows.map(([l, b, c]) => <tr key={l} data-changed={b && b !== c || (!b && c !== "—") || undefined}><th scope="row">{l}</th><td>{b}</td><td>{c}</td></tr>)}</tbody></table>
  </section>;
}
