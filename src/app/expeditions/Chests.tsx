"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { openChestAction } from "@/app/expedition-actions";
import { Icon } from "@/components/icons";
import { ResourceArt } from "@/components/ResourceArt";
import { CHEST_ITEMS, CHEST_NAMES, type ChestTier } from "@/lib/chests";
import type { OpenedItem } from "@/lib/expeditions";
import { fxBurst, fxFlash, fxShake } from "@/lib/fx";
import "./chests.css";

export type ChestRow = { key: string; tier: ChestTier; universeName: string; quantity: number };
const GLOW: Record<ChestTier, string> = { bronze: "#d08a4a", argent: "#dfe7ee", or: "#ffd36b", legendaire: "#b98bff" };
const SHAKES: Record<ChestTier, string[]> = { bronze: ["s1", "s2"], argent: ["s1", "s2", "s3"], or: ["s1", "s2", "s3"], legendaire: ["s1", "s2", "s3", "s3"] };
const RAR = { N: "var(--rarity-N)", R: "var(--rarity-R)", SR: "var(--rarity-SR)", SSR: "var(--rarity-SSR)", UR: "var(--rarity-UR)" };

export function Chest({ tier }: { tier: ChestTier }) {
  return <span className="ch" data-t={tier} aria-hidden="true"><i className="ch-body" /><i className="ch-band l" /><i className="ch-band r" /><i className="ch-lid" /><i className="ch-lock" /></span>;
}

function ItemArt({ item }: { item: OpenedItem }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (item.image) return <img src={item.image} alt="" referrerPolicy="no-referrer" />;
  if (item.resource) return <ResourceArt resource={item.resource} size={70} fallback={<span className="chi-ico">✦</span>} />;
  const icon = item.kind === "ryo" ? "ryo" : item.kind === "crystals" ? "cristal" : item.kind === "energy" ? "recharge" : null;
  return icon ? <span className="chi-ico"><Icon name={icon} /></span> : <span className="chi-ico">✦</span>;
}

/** Coffres d'expédition : étagère, puis ouverture plein écran (tremblements, couvercle, rayons, objets qui se retournent). */
export function Chests({ chests }: { chests: ChestRow[] }) {
  const router = useRouter();
  const [scene, setScene] = useState<{ tier: ChestTier; items: OpenedItem[]; shown: number; flipped: number; burst: boolean; shake: string; done: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const skip = useRef(false);
  const queue = useRef<string[]>([]);
  const [left, setLeft] = useState(0);
  const big = useRef<HTMLDivElement>(null);
  const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms: number) => new Promise((r) => setTimeout(r, skip.current || reduce() ? 0 : ms));

  const open = useCallback(async (key: string, tier: ChestTier) => {
    skip.current = false;
    setError(null);
    setScene({ tier, items: [], shown: 0, flipped: 0, burst: false, shake: "", done: false });
    const result = openChestAction(key); // le serveur tire pendant que le coffre tremble
    for (const s of SHAKES[tier]) { setScene((v) => v && { ...v, shake: "" }); await wait(30); setScene((v) => v && { ...v, shake: s }); await wait(s === "s1" ? 650 : s === "s2" ? 700 : 750); }
    const r = await result;
    if (!r.ok) { setScene(null); setError(r.error); return; }
    if (tier === "or" || tier === "legendaire") fxFlash();
    if (tier === "legendaire") fxShake();
    setScene((v) => v && { ...v, burst: true, shake: "", items: r.items });
    fxBurst(big.current, tier === "legendaire" ? 200 : tier === "or" ? 130 : 70);
    await wait(500);
    for (let i = 0; i < r.items.length; i++) {
      const it = r.items[i];
      setScene((v) => v && { ...v, shown: i + 1 });
      await wait(it.jackpot ? 700 : 260);
      setScene((v) => v && { ...v, flipped: i + 1 });
      if (it.rarity === "SSR" || it.rarity === "UR") setTimeout(() => fxBurst(document.querySelector(`.chi[data-i="${i}"]`), it.rarity === "UR" ? 90 : 45), 250);
      await wait(it.jackpot ? 600 : 200);
    }
    setScene((v) => v && { ...v, done: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    const next = queue.current.shift();
    setLeft(queue.current.length);
    if (next) { const row = chests.find((c) => c.key === next); if (row) { open(row.key, row.tier); return; } }
    setScene(null);
    router.refresh();
  };
  const openAll = () => {
    const keys = chests.flatMap((c) => Array.from({ length: c.quantity }, () => c.key));
    if (!keys.length) return;
    queue.current = keys.slice(1);
    setLeft(queue.current.length);
    const first = chests.find((c) => c.key === keys[0])!;
    open(first.key, first.tier);
  };

  useEffect(() => {
    if (!scene) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") skip.current = true; };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [scene]);

  const total = chests.reduce((n, c) => n + c.quantity, 0);
  return (
    <section className="chs" aria-label="Coffres">
      <div className="chs-head">
        <h2 className="vt-h2">Coffres ({total})</h2>
        {total > 1 && <button type="button" className="fx-btn" data-tone="gold" onClick={openAll} disabled={!!scene}>Tout ouvrir</button>}
      </div>
      {error && <p role="alert" className="trade-error">{error}</p>}
      {total === 0 ? <p className="vt-muted">Pas de coffre pour l&apos;instant : chaque expédition en rapporte, plus nombreux et plus rares dans les brèches difficiles.</p> : (
        <ul className="chs-shelf">
          {chests.map((c) => (
            <li key={c.key}>
              <button type="button" className="chs-btn" onClick={() => open(c.key, c.tier)} disabled={!!scene} aria-label={`Ouvrir un coffre ${CHEST_NAMES[c.tier]} de ${c.universeName}`}>
                <Chest tier={c.tier} />
                <b>{CHEST_NAMES[c.tier]}{c.quantity > 1 && <em>×{c.quantity}</em>}</b>
                <small>{c.universeName} · {CHEST_ITEMS[c.tier]} objets</small>
              </button>
            </li>
          ))}
        </ul>
      )}
      {scene && createPortal(
        <div className="mq-app-shell chs-stage" data-burst={scene.burst || undefined} style={{ "--glow": GLOW[scene.tier] } as React.CSSProperties} role="dialog" aria-label={`Ouverture d'un coffre ${CHEST_NAMES[scene.tier]}`} onClick={() => { skip.current = true; }}>
          <div className="chs-rays" aria-hidden="true" />
          <p className="chs-label">Coffre {CHEST_NAMES[scene.tier]}</p>
          <div ref={big} className={`chs-big ${scene.shake}`}><Chest tier={scene.tier} /></div>
          <ul className="chs-loot" aria-live="polite">
            {scene.items.slice(0, scene.shown).map((it, i) => (
              <li key={i} className="chi" data-i={i} data-flip={i < scene.flipped || undefined} data-jackpot={it.jackpot || undefined} style={{ "--r": RAR[it.rarity] } as React.CSSProperties}>
                <span className="chi-inner">
                  <span className="chi-face chi-back" />
                  <span className="chi-face chi-front"><em>{it.rarity}</em><ItemArt item={it} /><b>{it.name}</b><small>{it.amount}</small></span>
                </span>
              </li>
            ))}
          </ul>
          <button type="button" className="ui-button chs-next" onClick={(e) => { e.stopPropagation(); close(); }} style={{ visibility: scene.done ? "visible" : "hidden" }}>
            {left ? `Coffre suivant (${left})` : "Continuer"}
          </button>
          <p className="chs-hint">Un clic ou Échap accélère l&apos;ouverture.</p>
        </div>,
        document.body,
      )}
    </section>
  );
}
