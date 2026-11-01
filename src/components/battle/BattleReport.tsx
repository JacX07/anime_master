"use client";
import { useState } from "react";
import { battleReport, type BattleReportRow } from "@/lib/battle-report";
import type { BattleEvent, Side } from "@/lib/battle";
import type { PlayerCharacter } from "./BattlePlayer";

const METRICS = [ ["dealt", "Dégâts infligés"], ["taken", "Dégâts subis"], ["healing", "Soins"], ["absorbed", "Boucliers absorbés"], ["shields", "Boucliers donnés"], ["kos", "KO provoqués"], ["actions", "Actions"] ] as const;
export function BattleReport({ log, characters, names }: { log: BattleEvent[]; characters: Record<number, PlayerCharacter>; names: Record<Side, string> }) {
  const [metric, setMetric] = useState<typeof METRICS[number][0]>("dealt");
  const [side, setSide] = useState<"all" | Side>("A");
  const report = battleReport(log);
  const rows = report.rows.filter((row) => side === "all" || row.id[0] === side).sort((a, b) => b[metric] - a[metric] || a.id.localeCompare(b.id));
  const maximum = Math.max(1, ...rows.map((r) => r[metric]));
  const value = (row: BattleReportRow) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(row[metric]);
  return <section className="bt-report" aria-label="Bilan du combat"><header><h2>Bilan du combat</h2><p>Qui a fait la différence ?</p></header>
    <div className="bt-report-filters"><label>Classement<select value={metric} onChange={(event) => setMetric(event.target.value as typeof metric)}>{METRICS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Équipe<select value={side} onChange={(event) => setSide(event.target.value as typeof side)}><option value="A">{names.A}</option><option value="B">{names.B}</option><option value="all">Les deux équipes</option></select></label></div>
    <ol className="bt-report-ranking">{rows.map((row, index) => { const character = characters[row.characterId]; return <li key={row.id} data-side={row.id[0]}>
      <span className="bt-report-rank">{index + 1}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {character?.imageUrl && <img src={character.imageUrl} alt="" referrerPolicy="no-referrer" />}
      <div className="bt-report-person"><span>{character?.name ?? row.id} <small>· {names[row.id[0] as Side]}</small></span><div className="bt-report-bar" aria-hidden="true"><i style={{ width: `${row[metric] / maximum * 100}%` }} /></div></div>
      <strong>{value(row)}</strong>
    </li>; })}</ol>
    <details><summary>Toutes les statistiques</summary><div className="bt-report-table-wrap"><table><thead><tr><th scope="col">Personnage</th>{METRICS.map(([key, label]) => <th scope="col" key={key}>{label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}><th scope="row">{characters[row.characterId]?.name ?? row.id} · {names[row.id[0] as Side]}</th>{METRICS.map(([key]) => <td key={key}>{Math.round(row[key]).toLocaleString("fr-FR")}</td>)}</tr>)}</tbody></table></div></details>
    <p className="bt-report-note">Dégâts infligés : PV retirés et boucliers touchés, sans sur-dégâts. Dégâts subis : PV réellement perdus. Les boucliers de départ ne comptent pas comme boucliers donnés.</p>
    {report.unattributed > 0 && <p className="bt-report-note">Ancien journal : {Math.round(report.unattributed).toLocaleString("fr-FR")} dégâts périodiques sans lanceur connu, comptés seulement dans les dégâts subis.</p>}
  </section>;
}
