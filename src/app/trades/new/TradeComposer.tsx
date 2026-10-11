"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createTradeAction } from "@/app/trade-actions";
import { RarityGem } from "@/components/icons";
import { FINISH_NAMES } from "@/lib/labels";

interface Row {
  id: string;
  serial: number;
  finish: "NORMAL" | "HOLO" | "GOLD";
  forTrade: boolean;
  name: string;
  rarity: "N" | "R" | "SR" | "SSR" | "UR";
}

function Picker({ title, rows, picked, toggle, ryo, setRyo, max }: { title: string; rows: Row[]; picked: Set<string>; toggle: (id: string) => void; ryo: number; setRyo: (n: number) => void; max?: number }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    // Les cartes cochées restent visibles, puis celles marquées « À échanger »
    return rows.filter((r) => picked.has(r.id) || !needle || r.name.toLowerCase().includes(needle)).slice(0, 80);
  }, [rows, q, picked]);
  return (
    <section className="trade-picker">
      <h2 className="vt-h2">{title}</h2>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un personnage" aria-label="Chercher un personnage" />
      <ul>
        {shown.map((r) => (
          <li key={r.id}>
            <label>
              <input type="checkbox" checked={picked.has(r.id)} onChange={() => toggle(r.id)} />
              <RarityGem rarity={r.rarity} />
              <span>{r.name}</span>
              <span className="vt-muted">
                #{r.serial} · {FINISH_NAMES[r.finish]}
              </span>
              {r.forTrade && <span className="trade-tag">À échanger</span>}
            </label>
          </li>
        ))}
        {shown.length === 0 && <li className="vt-muted">Aucune carte disponible.</li>}
      </ul>
      <label className="trade-ryo">
        Ryō
        <input type="number" min={0} max={max} value={ryo} onChange={(e) => setRyo(Math.max(0, Math.floor(Number(e.target.value) || 0)))} />
        {max !== undefined && <span className="vt-muted">/ {max}</span>}
      </label>
    </section>
  );
}

export function TradeComposer({ to, mine, theirs, balance, presetAsk }: { to: string; mine: Row[]; theirs: Row[]; balance: number; presetAsk: string | null }) {
  const router = useRouter();
  const [give, setGive] = useState<Set<string>>(new Set());
  const [ask, setAsk] = useState<Set<string>>(() => new Set(presetAsk && theirs.some((c) => c.id === presetAsk) ? [presetAsk] : []));
  const [giveRyo, setGiveRyo] = useState(0);
  const [askRyo, setAskRyo] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const flip = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (!next.delete(id)) next.add(id);
    return next;
  };
  // Cartes marquées « À échanger » en premier côté destinataire
  const theirSorted = useMemo(() => [...theirs].sort((a, b) => Number(b.forTrade) - Number(a.forTrade)), [theirs]);

  const send = () =>
    start(async () => {
      const r = await createTradeAction({ to, giveCardIds: [...give], giveRyo, askCardIds: [...ask], askRyo });
      if (r.ok) router.push("/trades");
      else setError(r.error);
    });

  return (
    <>
      <p className="vt-sub">
        Offre à <b>{to}</b>. Les cartes restent à vous deux jusqu&apos;à l&apos;acceptation ; tout est revérifié à ce moment-là. L&apos;offre expire au bout de 48 h.
      </p>
      <div className="trade-grid">
        <Picker title="Tu donnes" rows={mine} picked={give} toggle={(id) => setGive(flip(give, id))} ryo={giveRyo} setRyo={setGiveRyo} max={balance} />
        <Picker title={`${to} donne`} rows={theirSorted} picked={ask} toggle={(id) => setAsk(flip(ask, id))} ryo={askRyo} setRyo={setAskRyo} />
      </div>
      {error && (
        <p role="alert" className="trade-error">
          {error}
        </p>
      )}
      <div>
        <button type="button" className="vt-btn" disabled={pending} onClick={send}>
          {pending ? "Envoi…" : `Envoyer l'offre (${give.size} carte${give.size > 1 ? "s" : ""} + ${giveRyo} Ryō contre ${ask.size} + ${askRyo} Ryō)`}
        </button>
      </div>
    </>
  );
}
