import type { CSSProperties, ReactNode } from "react";

/** Éclat plein écran d'un SSR ou d'un UR (docs/direction-artistique.md §6) : « horloge + portes ».
 *  Deux portes de bronze se ferment, une horloge s'allume sur la jonction et avance par crans jusqu'à la frappe,
 *  les portes s'ouvrent sur la lumière et la carte en sort : petite, puis grosse au premier plan, puis elle redescend.
 *  Tout est piloté en CSS par --S (instant de la frappe : 1,65 s en SSR, 1,85 s en UR). */
const rand = (i: number, k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };

function Rays({ n, r0, r1, w, k, className }: { n: number; r0: number; r1: number; w: number; k: number; className: string }) {
  return (
    <svg className={`pk-rays ${className}`} viewBox="-200 -200 400 400" strokeWidth={w} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + rand(i, k) * 0.12;
        const l = r0 + (0.4 + rand(i, k + 1) * 0.6) * (r1 - r0);
        return <line key={i} x1={Math.cos(a) * r0} y1={Math.sin(a) * r0} x2={Math.cos(a) * l} y2={Math.sin(a) * l} />;
      })}
    </svg>
  );
}

const GLINTS = [
  { x: "50%", y: "20%", s: 40, k: 0, g: 0.45 }, { x: "50%", y: "78%", s: 32, k: 0, g: 0.6 },
  { x: "62%", y: "34%", s: 44, k: 1, g: 0.95 }, { x: "36%", y: "66%", s: 34, k: 1, g: 1.15 }, { x: "58%", y: "70%", s: 26, k: 1, g: 1.35 },
] as const;

export function RarityBurst({ rarity, onEnd, children }: { rarity: "SSR" | "UR"; onEnd: () => void; children?: ReactNode }) {
  return (
    <div className="pk-burst" data-rarity={rarity} aria-hidden="true" onAnimationEnd={(e) => { if (e.animationName === "pk-fade-out" && (e.target as HTMLElement).classList.contains("pk-bg")) onEnd(); }}>
      <div className="pk-bg" />
      <div className="pk-light" />
      <Rays n={30} r0={40} r1={290} w={1.6} k={1} className="pk-rays-1" />
      <Rays n={14} r0={70} r1={340} w={3} k={5} className="pk-rays-2" />
      <Rays n={22} r0={50} r1={330} w={2} k={9} className="pk-rays-3" />
      {children && <div className="pk-burst-card">{children}<div className="pk-sheen"><i /></div></div>}
      <div className="pk-door pk-door-l"><i /></div>
      <div className="pk-door pk-door-r"><i /></div>
      <svg className="pk-clock" viewBox="-100 -100 200 200" aria-hidden="true">
        <circle r="92" /><circle r="84" strokeWidth="1" strokeDasharray="2 5" /><circle r="40" strokeWidth="1.5" />
        {Array.from({ length: 12 }, (_, i) => <line key={i} y1="-92" y2="-78" transform={`rotate(${i * 30})`} />)}
        <g className="pk-clock-hand"><line y2="-68" strokeWidth="4" /><circle r="6" /></g>
      </svg>
      <i className="pk-ring" /><i className="pk-ring" style={{ "--o": "0.12s" } as CSSProperties} /><i className="pk-ring pk-ring-ur" style={{ "--o": "0.24s" } as CSSProperties} />
      <i className="pk-flash" />
      {GLINTS.map((g, i) => (
        <svg key={i} className="pk-glint" viewBox="-50 -50 100 100" style={{ left: g.x, top: g.y, width: g.s, height: g.s, margin: `${-g.s / 2}px 0 0 ${-g.s / 2}px`, "--k": g.k, "--g": `${g.g}s` } as CSSProperties}>
          <path d="M0,-50 L7,-7 L50,0 L7,7 L0,50 L-7,7 L-50,0 L-7,-7Z" />
        </svg>
      ))}
    </div>
  );
}
