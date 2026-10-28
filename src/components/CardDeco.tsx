import type { ReactNode } from "react";
import type { Rarity } from "@/generated/prisma/enums";

// Décors autour du cadre d'une carte (R et au-dessus), style interface futuriste : équerres biseautées qui se doublent avec la rareté,
// étiquette de données en haut, plaque symétrique et nœuds hexagonaux de l'UR. Un seul SVG par carte, sans filtre ni animation
// (mesuré : des dizaines d'éléments SVG séparés avec ombres lumineuses faisaient ramer l'album). Les coordonnées sont celles d'une
// carte large de 220 unités (haute de 308) ; la couleur vient de --rarity. La carte laisse déborder ces décors (voir .card dans globals.css).

const C = "var(--rarity)";
const C2 = "var(--rarity-light)";
const W = 220;
const H = 308;

const hex = (cx: number, cy: number, r: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");

/** Un motif dessiné pour le coin haut-gauche, répété aux quatre coins */
const Mirror = ({ children }: { children: ReactNode }) => (
  <>
    <g>{children}</g>
    <g transform={`translate(${W} 0) scale(-1 1)`}>{children}</g>
    <g transform={`translate(0 ${H}) scale(1 -1)`}>{children}</g>
    <g transform={`translate(${W} ${H}) scale(-1 -1)`}>{children}</g>
  </>
);

const Corner = ({ level }: { level: number }) => (
  <>
    <path d="M-7 26V4L4 -7H26" fill="none" stroke={C} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    {level >= 2 && (
      <>
        <path d="M-1 16V8L8 -1H16" fill="none" stroke={C2} strokeWidth="1.2" opacity=".8" />
        <rect x="-10" y="28" width="6" height="6" fill={C} />
      </>
    )}
    {level >= 3 && (
      <>
        <path d="M-7 40v14M34 -7h14" fill="none" stroke={C} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M30 -3h5M-3 30v5" stroke={C2} strokeWidth="1.4" />
      </>
    )}
    {level >= 4 && (
      <>
        <path d="M-12 12 12 -12" stroke={C2} strokeWidth="1.2" opacity=".7" />
        <circle cx="-7" cy="26" r="2.6" fill={C2} />
        <circle cx="26" cy="-7" r="2.6" fill={C2} />
      </>
    )}
  </>
);

/** Étiquette de données en haut (SR et au-dessus), qui s'enrichit en SSR puis en UR */
const Tag = ({ level }: { level: number }) => (
  <>
    <path d="M92 -8H128L122 2H98Z" fill={C} stroke={C2} strokeWidth="1.2" />
    {level >= 3 && (
      <>
        <path d="M82 -3H70M138 -3h12" fill="none" stroke={C} strokeWidth="2" strokeLinecap="round" />
        <circle cx="66" cy="-3" r="2.2" fill={C2} />
        <circle cx="154" cy="-3" r="2.2" fill={C2} />
        {[-8, W + 8].map((x) => (
          <path key={x} d={`M${x} 134V174`} fill="none" stroke={C} strokeWidth="2" strokeLinecap="round" />
        ))}
      </>
    )}
    {level >= 4 && (
      <>
        <path d="M92 -8 110 -22 128 -8" fill="none" stroke={C} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M104 -8 110 -15 116 -8Z" fill={C2} />
        <path d="M60 -3H40M180 -3h-20" stroke={C} strokeWidth="3" />
      </>
    )}
  </>
);

/** UR : plaque verticale sur chaque côté, symétrique à l'étiquette du haut */
const Plate = () => (
  <>
    {[1, -1].map((d) => {
      const x = d === 1 ? 0 : W; // d = 1 : côté gauche
      const p = (dx: number, y: number) => `${x - d * dx},${y}`;
      return (
        <g key={d}>
          <polygon points={`${p(13, 122)} ${p(13, 186)} ${p(3, 178)} ${p(3, 130)}`} fill={C} stroke={C2} strokeWidth="1.2" />
          <path d={`M${x - d * 18} 134V174`} stroke={C2} strokeWidth="1.4" opacity=".8" />
        </g>
      );
    })}
  </>
);

const DECO: Partial<Record<Rarity, ReactNode>> = {
  R: (
    <Mirror>
      <Corner level={1} />
    </Mirror>
  ),
  SR: (
    <>
      <Mirror>
        <Corner level={2} />
      </Mirror>
      <Tag level={2} />
    </>
  ),
  SSR: (
    <>
      <Mirror>
        <Corner level={3} />
      </Mirror>
      <Tag level={3} />
    </>
  ),
  UR: (
    <>
      <Mirror>
        <Corner level={4} />
      </Mirror>
      <Tag level={4} />
      <Plate />
    </>
  ),
};

export function CardDeco({ rarity }: { rarity: Rarity }) {
  const shapes = DECO[rarity];
  if (!shapes) return null;
  return (
    <svg className="card-deco" viewBox="0 0 220 308" preserveAspectRatio="none" aria-hidden>
      {shapes}
    </svg>
  );
}
