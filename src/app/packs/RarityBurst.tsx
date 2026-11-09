"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { packAudio } from "@/lib/pack-audio";
import { at, chamfer, ChamferFrame, StarRings } from "./StarFrame";

/** Éclat plein écran d'un SSR ou d'un UR (docs/direction-artistique.md §6) : « constellation encadrée ».
 *  Le fond disparaît, un cadre biseauté se trace, des diagonales convergent vers un cadre qui se dessine autour de la future carte,
 *  les losanges s'allument un à un, l'étoile embrase tout (--S : 1,3 s SSR, 1,5 s UR) et la carte sort de l'étoile :
 *  petite, puis grosse au premier plan, puis elle redescend. Un clic ou Échap abrège (son coupé). */
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
  { x: "62%", y: "34%", s: 44, g: 0.5 }, { x: "36%", y: "66%", s: 34, g: 0.7 }, { x: "58%", y: "70%", s: 26, g: 0.9 },
] as const;

export function RarityBurst({ rarity, onEnd, children }: { rarity: "SSR" | "UR"; onEnd: () => void; children?: ReactNode }) {
  const [[w, h]] = useState<[number, number]>(() => [window.innerWidth + 16, window.innerHeight + 16]);
  const skip = () => { packAudio.cut(); onEnd(); };
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { packAudio.cut(); onEnd(); } };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onEnd]);

  const cx = w / 2, cy = h / 2;
  const cw = Math.min(224, (w - 16) * 0.58), bw = cw + 70, bh = cw * 1.4 + 70, c = 18;
  const x0 = cx - bw / 2, x1 = cx + bw / 2, y0 = cy - bh / 2, y1 = cy + bh / 2;
  const nodes = [[cx, y0], [x1, y0 + c], [x1, cy], [x1, y1 - c], [cx, y1], [x0, y1 - c], [x0, cy], [x0, y0 + c]];
  const box = (m: number) => chamfer(bw + 2 * m, bh + 2 * m, 0, c + m);

  return (
    <div className="pk-burst" data-rarity={rarity} role="presentation" onPointerDown={skip} onAnimationEnd={(e) => { if (e.animationName === "pk-fade-out" && (e.target as HTMLElement).classList.contains("pk-bg")) onEnd(); }}>
      <div className="pk-bg" />
      <div className="pk-light" />
      <ChamferFrame w={w} h={h} />
      <svg className="pk-cstl" width={w} height={h} aria-hidden="true">
        {[[0, 0, x0, y0], [w, 0, x1, y0], [0, h, x0, y1], [w, h, x1, y1]].map(([ax, ay, bx, by], i) => <line key={i} className="pk-draw" x1={ax} y1={ay} x2={bx} y2={by} pathLength={1} strokeWidth={0.8} style={at(0.2 + i * 0.06, 0.8, 12)} />)}
        <g transform={`translate(${x0} ${y0})`}>
          <path className="pk-draw pk-box" d={box(0)} pathLength={1} strokeWidth={1.4} style={at(0.7, 0.9, 18)} />
        </g>
        <g transform={`translate(${x0 - 14} ${y0 - 14})`}>
          <path className="pk-fadein" d={box(14)} strokeWidth={0.8} strokeDasharray="4 5" style={at(1.2, 0.3)} />
        </g>
        {nodes.map(([x, y], i) => <path key={i} className="pk-popin pk-fill" d={`M${x},${y - 9} L${x + 5},${y} L${x},${y + 9} L${x - 5},${y}Z`} style={at(0.75 + i * 0.11)} />)}
      </svg>
      <div className="pk-burst-astro"><StarRings /></div>
      <Rays n={24} r0={40} r1={300} w={0.8} k={1} className="pk-rays-1" />
      <Rays n={10} r0={60} r1={340} w={1.6} k={5} className="pk-rays-2" />
      <Rays n={18} r0={50} r1={330} w={1} k={9} className="pk-rays-3" />
      {children && <div className="pk-burst-card">{children}<div className="pk-sheen"><i /></div></div>}
      <i className="pk-ring" /><i className="pk-ring" style={{ "--o": "0.12s" } as CSSProperties} /><i className="pk-ring pk-ring-ur" style={{ "--o": "0.24s" } as CSSProperties} />
      <i className="pk-flash" />
      {GLINTS.map((g, i) => (
        <svg key={i} className="pk-glint" viewBox="-50 -50 100 100" style={{ left: g.x, top: g.y, width: g.s, height: g.s, margin: `${-g.s / 2}px 0 0 ${-g.s / 2}px`, "--g": `${g.g}s` } as CSSProperties}>
          <path d="M0,-50 L5,-5 L50,0 L5,5 L0,50 L-5,5 L-50,0 L-5,-5Z" />
        </svg>
      ))}
    </div>
  );
}
