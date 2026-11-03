import { battleReport } from "@/lib/battle-report";
import type { BattleEvent, Side, UnitId } from "@/lib/battle";
import type { Replay } from "@/lib/battle-replay";
import type { PlayerCharacter } from "./BattlePlayer";

const num = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const POSITIONS = [1, 2, 3, 4];

/** Écran de résultat : équipe du joueur en colonnes, défense dessous, statistiques et étoiles (docs/specs/combat.md). */
export function BattleVictory({ log, rp, characters, names, end, stars }: {
  log: BattleEvent[];
  rp: Replay;
  characters: Record<number, PlayerCharacter>;
  names: Record<Side, string>;
  end: NonNullable<Replay["end"]>;
  /** Étoiles imposées par le mode (histoire) ; sinon calculées : victoire, aucun allié à terre, 8 tours ou moins */
  stars?: number | null;
}) {
  const rows = battleReport(log).rows;
  const won = end.winner === "A";
  const sum = (side: Side, key: "dealt" | "taken" | "healing" | "kos") => rows.filter((r) => r.id[0] === side).reduce((n, r) => n + r[key], 0);
  const ids = (side: Side) => POSITIONS.map((p) => `${side}${p}` as UnitId).filter((id) => rp.info[id]);
  const mvp = rows.filter((r) => r.id[0] === "A").sort((a, b) => b.dealt - a.dealt)[0]?.id;
  const allyDown = ids("A").some((id) => rp.units[id]?.ko);
  const quick = end.rounds <= 8;
  const own = stars !== undefined && stars !== null;
  const count = own ? stars : won ? 1 + (allyDown ? 0 : 1) + (quick ? 1 : 0) : 0;
  const title = end.winner ? (won ? "Victoire" : "Défaite") : "Match nul";

  const column = (id: UnitId) => {
    const info = rp.info[id];
    const unit = rp.units[id];
    const c = characters[info.characterId];
    const hp = Math.max(0, Math.min(1, (unit?.hp ?? 0) / Math.max(1, info.maxHp)));
    return (
      <li key={id} className="bv-card" data-ko={unit?.ko || undefined} data-mvp={id === mvp || undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {c?.imageUrl && <img src={c.imageUrl} alt="" referrerPolicy="no-referrer" />}
        <b>{c?.name ?? id}</b>
        <i className="bv-hp"><u style={{ width: `${hp * 100}%` }} /></i>
      </li>
    );
  };

  return (
    <section className="bv" data-result={end.winner ? (won ? "win" : "lose") : "draw"} aria-label="Résultat du combat">
      <h2 className="bv-title">{title}</h2>
      <div className="bv-grid">
        <div className="bv-teams">
          <p className="bv-band">{names.A}</p>
          <ul className="bv-row">{ids("A").map(column)}</ul>
          <p className="bv-band" data-def>Défense · {names.B}</p>
          <ul className="bv-row">{ids("B").map(column)}</ul>
        </div>
        <div className="bv-side">
          <p className="bv-band">Statistiques</p>
          <dl className="bv-stats">
            <div><dt>Dégâts infligés</dt><dd>{num.format(sum("A", "dealt"))}</dd></div>
            <div><dt>Dégâts subis</dt><dd>{num.format(sum("A", "taken"))}</dd></div>
            <div><dt>Soins</dt><dd>{num.format(sum("A", "healing"))}</dd></div>
            <div><dt>Ennemis vaincus</dt><dd>{sum("A", "kos")} / {ids("B").length}</dd></div>
            <div><dt>Tours</dt><dd>{end.rounds}</dd></div>
          </dl>
          {won && (
            <div className="bv-rank">
              {!own && (
                <ul className="bv-crit">
                  <li data-ok>Victoire</li>
                  <li data-ok={!allyDown || undefined}>Aucun allié à terre</li>
                  <li data-ok={quick || undefined}>En 8 tours ou moins</li>
                </ul>
              )}
              <p className="bv-stars" role="img" aria-label={`${count} étoile${count > 1 ? "s" : ""} sur 3`}>
                {[1, 2, 3].map((n) => <span key={n} data-off={n > count || undefined}>★</span>)}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
