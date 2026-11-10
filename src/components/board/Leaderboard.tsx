import { PlayerName } from "@/components/PlayerName";
import type { Board, BoardRow } from "@/lib/rankings";
import { MyRankDock } from "./MyRankDock";
import "./board.css";

const num = new Intl.NumberFormat("fr-FR");
const initials = (name: string) => name.slice(0, 2).toUpperCase();

function Rarities({ counts }: { counts?: BoardRow["rarities"] }) {
  if (!counts) return null;
  return <span className="lb-rar" aria-label="Personnages par rareté">{(["N", "R", "SR", "SSR", "UR"] as const).map((r) => <i key={r} data-r={r}>{r} <b>{num.format(counts[r])}</b></i>)}</span>;
}

/** Podium 1-2-3, liste, et barre « ton rang » collée en bas pour qui est hors du top (docs/direction-artistique.md §4.11). */
export function Leaderboard({ board, meId, unit, empty, valueLabel = (n: number) => num.format(n) }: { board: Board; meId: string | null; unit: string; empty: string; valueLabel?: (n: number) => string }) {
  const { top, me } = board;
  if (!top.length) return <p className="vt-empty">{empty}</p>;
  const podium = [top[1], top[0], top[2]].filter(Boolean);
  const rest = top.slice(3);
  const outside = me && me.rank > top.length ? me : null;
  const line = (r: BoardRow) => (
    <li key={r.userId} className="lb-row" data-me={r.userId === meId || undefined} id={r.userId === meId ? "my-rank-row" : undefined}>
      <span className="lb-rank">{r.rank}</span>
      <div className="lb-who"><PlayerName username={r.username} title={r.title} guildTag={r.guildTag} />{r.detail && <small>{r.detail}</small>}<Rarities counts={r.rarities} /></div>
      <span className="lb-value">{valueLabel(r.score)}</span>
    </li>
  );
  return (
    <>
      <div className="lb-podium" role="list" aria-label="Podium">
        {podium.map((r) => (
          <div key={r.userId} role="listitem" className={`lb-pc lb-p${r.rank}`} data-me={r.userId === meId || undefined} id={r.userId === meId && r.rank <= 3 ? "my-rank-row" : undefined}>
            <span className="lb-n">{r.rank}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <span className="ring-engraved lb-av" aria-hidden>{r.avatarUrl ? <img src={r.avatarUrl} alt="" referrerPolicy="no-referrer" /> : initials(r.username)}</span>
            <PlayerName username={r.username} title={null} guildTag={r.guildTag} />
            <span className="lb-value">{valueLabel(r.score)}</span>
            {r.detail && <small>{r.detail}</small>}
            <Rarities counts={r.rarities} />
          </div>
        ))}
      </div>
      {(rest.length > 0 || outside) && (
        <ol className="lb-list" start={4}>
          {rest.map(line)}
          {outside && <><li className="lb-gap" aria-hidden>···</li>{line(outside)}</>}
        </ol>
      )}
      {me && <MyRankDock rank={me.rank} value={valueLabel(me.score)} unit={unit} missing={outside && board.cutoff !== null ? board.cutoff - me.score + 1 : null} />}
    </>
  );
}
