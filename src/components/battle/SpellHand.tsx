"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";
import type { CardType } from "@/generated/prisma/enums";

/** Couleur de l'emblème et de l'annonce d'ultime selon le type de la carte */
export const ULT_COLOR: Record<CardType, string> = { COMBAT: "#ff5a4d", MYSTERE: "#b58cff", MAGIE: "#4db8ff", COEUR: "#ff6fa0", AVENTURE: "#4fd98f" };

/** Sorts en main de cartes et ultime en emblème (maquette public/mockups/sorts-cartes.html, validée le 2026-11-13). */
export type HandCard = {
  key: string;
  name: string;
  kind: string;
  /** Recharge du sort, affichée dans la pastille en haut à gauche */
  cost: string;
  text: string;
  details: string;
  accent: string;
  /** Le sort peut être lancé maintenant */
  ready: boolean;
  /** Tours avant de pouvoir le relancer (0 si prêt) */
  wait: number;
  selected: boolean;
};

export function SpellHand({ cards, portrait, interactive, busy, onChoose }: {
  cards: HandCard[];
  portrait?: string;
  interactive: boolean;
  busy: boolean;
  onChoose: (key: string, el: HTMLElement) => void;
}) {
  const [viewport, setViewport] = useState({ width: 760, height: 800 });
  const viewportWidth = viewport.width;
  const small = viewportWidth <= 640;
  useEffect(() => {
    const check = () => setViewport({ width: innerWidth, height: innerHeight });
    check();
    addEventListener("resize", check);
    return () => removeEventListener("resize", check);
  }, []);
  const n = cards.length;
  const w = viewport.height <= 650 ? 84 : small ? 92 : 132;
  const room = n > 1 ? (Math.min(viewportWidth - (small ? 100 : 0), 760) - w - 12) / (n - 1) : 0;
  return (
    <div className="bt-hand" style={{ "--w": `${w}px` } as CSSProperties} role="group" aria-label="Sorts">
      {cards.map((c, i) => {
        const m = i - (n - 1) / 2;
        const gap = Math.min(w * 0.75, room);
        const x = m * gap, y = c.selected ? -(small ? 4 : 10) : 10 + Math.abs(m) * 12, r = c.selected ? 0 : m * 8;
        const disabled = interactive && (!c.ready || busy);
        return (
          <button key={c.key} type="button" className="bt-hand-card" data-spell={c.key} data-armed={c.selected || undefined}
            data-cd={interactive && !c.ready && c.wait > 0 ? c.wait : undefined} disabled={disabled} aria-pressed={interactive ? c.selected : undefined}
            aria-label={`${c.name} : ${c.details}`}
            style={{ "--accent": c.accent, "--img": portrait ? `url("${portrait}")` : "none", transform: `translate(${x}px, ${y}px) rotate(${r}deg) scale(${c.selected ? 1.03 : 1})`, zIndex: c.selected ? 20 : i, marginLeft: `${-w / 2}px` } as CSSProperties}
            onClick={(e) => onChoose(c.key, e.currentTarget)}>
            <span className="bt-hand-glow" aria-hidden="true" /><span className="bt-hand-halo" aria-hidden="true" />
            <span className="bt-hand-face">
              <span className="bt-hand-art" aria-hidden="true" />
              <span className="bt-hand-cost" aria-hidden="true">{c.cost}</span>
              <span className="bt-hand-title">{c.name}</span>
              <span className="bt-hand-kind">{c.kind}</span>
              <span className="bt-hand-text">{c.text}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Ultime : disque sombre, portrait du personnage teinté, liquide texturé (immobile) qui monte avec la jauge, arc de charge. */
export function UltimateEmblem({ gauge, max, name, portrait, color, interactive, ready, armed, busy, onClick }: {
  gauge: number;
  max: number;
  name: string;
  portrait?: string;
  color: string;
  interactive: boolean;
  /** L'ultime peut être lancé maintenant (jauge pleine et à ton tour) */
  ready: boolean;
  armed: boolean;
  busy: boolean;
  onClick: (el: HTMLElement) => void;
}) {
  const uid = useId().replace(/:/g, "");
  const pct = Math.max(0, Math.min(100, (gauge / max) * 100));
  const full = pct >= 100;
  const top = 32, bottom = 188;
  const y = bottom - (bottom - top) * (pct / 100);
  const id = (s: string) => `${s}${uid}`;
  return (
    <button type="button" className="bt-ult" data-full={full || undefined} data-armed={armed || undefined} disabled={!interactive || !ready || busy}
      aria-pressed={interactive ? armed : undefined} aria-label={`Ultime ${name} : ${Math.round(pct)} %${full ? ", prêt" : ""}`} title={`${name} · ${Math.round(pct)} %`}
      style={{ "--ult": color } as CSSProperties} onClick={(e) => onClick(e.currentTarget)}>
      <svg viewBox="0 0 200 210" aria-hidden="true">
        <defs>
          <clipPath id={id("c")}><circle cx="100" cy="110" r="78" /></clipPath>
          <radialGradient id={id("d")} cx="50%" cy="40%" r="60%"><stop offset="0" stopColor={color} stopOpacity=".35" /><stop offset="1" stopColor="#0a0405" stopOpacity=".96" /></radialGradient>
          <linearGradient id={id("w")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".55" /><stop offset=".12" stopColor={color} /><stop offset="1" stopColor="#14060a" /></linearGradient>
          <filter id={id("t")} x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".035 .09" numOctaves="4" seed="7" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 .85  0 0 0 0 .88  0 0 0 1.3 -.55" result="v" /><feComposite in="v" in2="SourceGraphic" operator="in" /></filter>
          <filter id={id("g")} x="0" y="0" width="100%" height="100%"><feTurbulence type="turbulence" baseFrequency=".9" numOctaves="2" seed="3" result="g" />
            <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .9 -.35" /><feComposite in2="SourceGraphic" operator="in" /></filter>
          <filter id={id("s")} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7" /></filter>
        </defs>
        <circle cx="100" cy="110" r="90" fill={color} opacity={0.15 + 0.5 * (pct / 100)} filter={`url(#${id("s")})`} />
        <circle cx="100" cy="110" r="78" fill={`url(#${id("d")})`} />
        <g clipPath={`url(#${id("c")})`}>
          {portrait && <image href={portrait} x="22" y="32" width="156" height="156" preserveAspectRatio="xMidYMin slice" opacity={full ? 0.95 : 0.55} style={{ filter: "grayscale(1) contrast(1.15) brightness(1.1)" }} />}
          <rect x="0" y="0" width="200" height="220" fill={color} opacity=".38" style={{ mixBlendMode: "multiply" }} />
          <g style={{ transform: `translateY(${y}px)`, transition: "transform 1.1s cubic-bezier(.3,.8,.3,1)" }}>
            <rect x="0" y="0" width="200" height="200" fill={`url(#${id("w")})`} opacity=".72" />
            <rect x="0" y="0" width="200" height="200" fill="#fff" filter={`url(#${id("t")})`} opacity=".34" />
            <rect x="0" y="0" width="200" height="200" fill="#000" filter={`url(#${id("g")})`} opacity=".45" />
            <rect x="0" y="0" width="200" height="2.5" fill="#fff" opacity=".85" /><rect x="0" y="2.5" width="200" height="7" fill="#fff" opacity=".12" />
          </g>
          <circle cx="100" cy="110" r="78" fill="none" stroke="#000" strokeOpacity=".35" strokeWidth="10" />
        </g>
        <path d="M48 78c8-20 28-34 52-36" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".16" />
        <circle cx="100" cy="110" r="80" fill="none" stroke={color} strokeWidth="2.5" opacity=".95" />
        <circle cx="100" cy="110" r="86" fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(541 * pct / 100).toFixed(1)} 541`} transform="rotate(-90 100 110)" style={{ transition: "stroke-dasharray 1.1s cubic-bezier(.3,.8,.3,1)" }} />
        {full && <circle className="bt-ult-run" cx="100" cy="110" r="94" fill="none" stroke={color} strokeWidth="2" strokeDasharray="6 14" />}
      </svg>
      <span className="bt-ult-pct">{full ? "PRÊT" : `${Math.round(pct)} %`}</span>
    </button>
  );
}
