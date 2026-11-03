import Link from "next/link";
import type { ReactNode } from "react";
import { PERIODS, type Period } from "@/lib/admin-stats";

export const fmt = new Intl.NumberFormat("fr-FR");
export const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits).replace(".", ",")} %`;

export function Kpi({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return <div className="adm-kpi"><small>{label}</small><b>{value}</b>{hint && <span>{hint}</span>}</div>;
}

export function Panel({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return <section className="adm-panel"><h2>{title}</h2>{note && <p className="adm-note">{note}</p>}{children}</section>;
}

export function PeriodPicker({ path, days }: { path: string; days: Period }) {
  return (
    <div className="adm-period mq-section-tabs" role="group" aria-label="Période">
      {PERIODS.map((d) => <Link key={d} href={`${path}?p=${d}`} aria-current={d === days ? "page" : undefined}>{d} j</Link>)}
    </div>
  );
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead><tr>{head.map((h, i) => <th key={h} className={i ? "num" : undefined}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={head.length} className="adm-empty">Aucune donnée sur cette période.</td></tr>}
          {rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={j ? "num" : undefined}>{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

export const MODE_NAMES: Record<string, string> = { TEST: "Test", STORY: "Histoire", RAID: "Raid", TOWER: "Tour", DUNGEON: "Donjon", ARENA: "Arène" };
export const REASON_NAMES: Record<string, string> = {
  ARTIFACT_UPGRADE: "Amélioration d'artefact", QUICK_SELL: "Vente rapide", DAILY: "Bonus du jour", PACK_BUY: "Achat de lot", CRYSTAL_BUY: "Achat de cristaux",
  BID_HOLD: "Enchère (mise)", BID_REFUND: "Enchère (remboursement)", AUCTION_SALE: "Vente aux enchères", AUCTION_FEE: "Frais d'enchère",
  TRADE_IN: "Échange (reçu)", TRADE_OUT: "Échange (envoyé)", DUEL_REWARD: "Duel", ACHIEVEMENT: "Succès", EXPEDITION: "Expédition", STORY: "Histoire", TOWER: "Tour", ADMIN: "Ajustement équipe",
};
