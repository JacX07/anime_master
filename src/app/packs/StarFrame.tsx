import type { CSSProperties, ReactNode } from "react";

/** Briques du style « dos de carte » (docs/direction-artistique.md §6) : filets fins, cercles pleins et pointillés,
 *  étoile à quatre branches, losanges, cadre double à coins biseautés. Tout se dessine par crans (`pk-draw`). */
export const at = (d: number, t?: number, n?: number) => ({ "--d": `${d}s`, ...(t ? { "--t": `${t}s` } : {}), ...(n ? { "--n": n } : {}) }) as CSSProperties;

export const chamfer = (w: number, h: number, i: number, c: number) =>
  `M${i + c},${i} H${w - i - c} L${w - i},${i + c} V${h - i - c} L${w - i - c},${h - i} H${i + c} L${i},${h - i - c} V${i + c}Z`;

/** Cadre double aux coins biseautés, tracé de 0,1 s à 1 s. */
export function ChamferFrame({ w, h }: { w: number; h: number }) {
  if (!w || !h) return null;
  return (
    <svg className="pk-frame" width={w} height={h} aria-hidden="true">
      <path className="pk-draw" d={chamfer(w, h, 10, 18)} pathLength={1} strokeWidth={1.6} style={at(0.1, 0.8, 16)} />
      <path className="pk-draw" d={chamfer(w, h, 20, 12)} pathLength={1} strokeWidth={0.8} style={at(0.22, 0.8, 16)} />
    </svg>
  );
}

const RINGS: readonly [number, number, boolean][] = [[40, 0.9, false], [62, 0.8, true], [88, 1, false], [116, 0.8, true], [146, 1.2, false], [178, 0.8, true]];

/** Astrolabe : six cercles (pleins qui se tracent, pointillés qui apparaissent), étoile centrale cachée jusqu'à l'embrasement.
 *  `ticks` ajoute les 60 graduations ; `extras` ajoute axes, diagonales, losanges et points (qui arrivent à `lateAt`). */
export function StarRings({ ticks, extras, lateAt = 1.9, children }: { ticks?: boolean; extras?: boolean; lateAt?: number; children?: ReactNode }) {
  return (
    <svg className="pk-astro" viewBox="0 0 400 400" aria-hidden="true">
      {RINGS.map(([r, w, dot], i) => dot
        ? <circle key={r} className="pk-fadein" cx={200} cy={200} r={r} strokeWidth={w} strokeDasharray="1 5" style={at(0.1 + i * 0.12, 0.4)} />
        : <circle key={r} className="pk-draw" cx={200} cy={200} r={r} strokeWidth={w} pathLength={1} style={at(0.1 + i * 0.12, 0.5, 8)} />)}
      {ticks && Array.from({ length: 60 }, (_, i) => {
        const a = (i * Math.PI) / 30, l = i % 5 ? 6 : 12;
        return <line key={i} className="pk-tick" x1={200 + Math.sin(a) * 182} y1={200 - Math.cos(a) * 182} x2={200 + Math.sin(a) * (182 + l)} y2={200 - Math.cos(a) * (182 + l)} strokeWidth={0.8} style={{ "--i": i } as CSSProperties} />;
      })}
      {extras && (
        <g>
          <line className="pk-popin pk-late" x1={200} y1={10} x2={200} y2={390} strokeWidth={0.8} strokeDasharray="5 7" style={at(lateAt)} />
          <line className="pk-popin pk-late" x1={10} y1={200} x2={390} y2={200} strokeWidth={0.8} strokeDasharray="5 7" style={at(lateAt)} />
          {[[200, 54], [346, 200], [200, 346], [54, 200]].map(([x, y], i) => <path key={i} className="pk-popin pk-fill" d={`M${x},${y - 8} L${x + 4.5},${y} L${x},${y + 8} L${x - 4.5},${y}Z`} style={at(lateAt + i * 0.06)} />)}
          {[[118, 118], [282, 118], [282, 282], [118, 282]].map(([x, y], i) => <circle key={i} className="pk-popin pk-fill" cx={x} cy={y} r={3} style={at(lateAt + 0.05 + i * 0.06)} />)}
        </g>
      )}
      <path className="pk-star" d="M200,132 C202,188 212,198 268,200 C212,202 202,212 200,268 C198,212 188,202 132,200 C188,198 198,188 200,132Z" />
      {children}
    </svg>
  );
}
