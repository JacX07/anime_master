"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { acceptTradeAction, cancelTradeAction, refuseTradeAction } from "@/app/trade-actions";
import { Money } from "@/components/icons";
import { FINISH_NAMES } from "@/lib/labels";
import { tintOf } from "@/lib/tint";
import type { TradeRow } from "@/lib/trades";

const STATUS: Record<string, string> = {
  PENDING: "En attente",
  ACCEPTED: "Acceptée",
  REFUSED: "Refusée",
  CANCELLED: "Annulée",
  EXPIRED: "Expirée",
  INVALID: "Invalide",
};
const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

function Plate({ c }: { c: TradeRow["give"][number] }) {
  return (
    <li className="tp">
      <Link href={`/character/${c.character.id}`} className="tp-card" data-r={c.character.rarity} title={c.character.name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c.character.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
        <i aria-hidden />
        <span className="tp-nm">{c.character.name}</span>
      </Link>
      <span className="tp-cap">
        #{c.serial} · {FINISH_NAMES[c.finish]}
      </span>
    </li>
  );
}

function Side({ title, cards, ryo }: { title: string; cards: TradeRow["give"]; ryo: number }) {
  return (
    <div className="trade-side">
      <h3>{title}</h3>
      {cards.length === 0 && ryo === 0 && <p className="vt-muted">Rien</p>}
      <ul>
        {cards.map((c) => (
          <Plate key={c.id} c={c} />
        ))}
        {ryo > 0 && (
          <li className="tp-ryo">
            <Money n={ryo} />
          </li>
        )}
      </ul>
    </div>
  );
}

export function TradeList({ trades, empty }: { trades: TradeRow[]; empty: string }) {
  if (trades.length === 0) return <p className="vt-muted">{empty}</p>;
  return (
    <ul className="trade-list">
      {trades.map((t) => (
        <TradeItem key={t.id} t={t} />
      ))}
    </ul>
  );
}

function TradeItem({ t }: { t: TradeRow }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (action: (id: string) => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await action(t.id);
      setError(r.ok ? null : (r.error ?? "Échec."));
    });
  return (
    <li className="trade-card" data-status={t.status} style={{ "--w": tintOf(t.other) } as React.CSSProperties}>
      <header>
        <b className="trade-who">{t.other}</b>
        <span className="vt-muted">
          {t.mine ? "Offre envoyée" : "Offre reçue"}
          {t.status === "PENDING" && ` · expire le ${dateFmt.format(t.expiresAt)}`}
        </span>
        <span className="trade-status">{STATUS[t.status]}</span>
      </header>
      <div className="trade-sides">
        <Side title="Tu donnes" cards={t.give} ryo={t.giveRyo} />
        <span className="trade-axis" aria-hidden>
          <b>⇄</b>
        </span>
        <Side title="Tu reçois" cards={t.get} ryo={t.getRyo} />
      </div>
      {t.status === "PENDING" && (
        <footer>
          {t.mine ? (
            <button type="button" className="vt-btn ghost" disabled={pending} onClick={() => run(cancelTradeAction)}>
              Annuler l&apos;offre
            </button>
          ) : (
            <>
              <button type="button" className="vt-btn ghost" disabled={pending} onClick={() => run(refuseTradeAction)}>
                Refuser
              </button>
              <button type="button" className="vt-btn" disabled={pending} onClick={() => run(acceptTradeAction)}>
                {pending ? "…" : "Accepter"}
              </button>
            </>
          )}
        </footer>
      )}
      {error && (
        <p role="alert" className="trade-error">
          {error}
        </p>
      )}
    </li>
  );
}
