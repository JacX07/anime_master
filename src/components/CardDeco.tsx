import type { ReactNode } from "react";
import type { Rarity } from "@/generated/prisma/enums";

// Décors autour du cadre d'une carte (R et au-dessus) : coins, couronne, filigrane et perles de l'UR. Un seul SVG par carte, sans
// filtre ni animation (mesuré : des dizaines d'éléments SVG séparés avec ombres lumineuses faisaient ramer l'album). Les coordonnées
// sont celles d'une carte large de 220 unités (haute de 308) ; la couleur vient de --rarity. La carte laisse déborder ces décors
// (voir .card dans globals.css).

const C = "var(--rarity)";
const C2 = "var(--rarity-light)";

const Tick = ({ t }: { t: string }) => (
  <g transform={t} fill="none" stroke={C} strokeWidth="2.4" strokeLinecap="round">
    <path d="M3 19V7Q3 3 7 3H19" />
  </g>
);
const Ticks = () => (
  <>
    <Tick t="translate(-6 -6)" />
    <Tick t="translate(226 -6) scale(-1 1)" />
    <Tick t="translate(-6 314) scale(1 -1)" />
    <Tick t="translate(226 314) scale(-1 -1)" />
  </>
);

const Corner = ({ t }: { t: string }) => (
  <g transform={t} fill="none" stroke={C} strokeWidth="3" strokeLinecap="round">
    <path d="M4 42V14Q4 4 14 4H42" />
    <path d="M12 42V20Q12 12 20 12H42" strokeWidth="1.5" stroke={C2} opacity=".8" />
    <circle cx="4" cy="4" r="4" fill={C2} stroke="none" />
  </g>
);
const Corners = () => (
  <>
    <Corner t="translate(-12 -12)" />
    <Corner t="translate(232 -12) scale(-1 1)" />
    <Corner t="translate(-12 320) scale(1 -1)" />
    <Corner t="translate(232 320) scale(-1 -1)" />
  </>
);

/** Cimier : large de 72 unités, posé sur le bord haut */
const Crest = () => (
  <g transform="translate(74 -31) scale(1.125)">
    <path d="M32 6 40 16 32 30 24 16Z" fill={C} stroke={C2} strokeWidth="1.5" />
    <path d="M22 20C12 20 6 14 2 8c8 0 14 2 18 6ZM42 20c10 0 16-6 20-12-8 0-14 2-18 6Z" fill={C} opacity=".9" />
    <circle cx="32" cy="15" r="2.5" fill={C2} />
  </g>
);

const Mini = () => (
  <g transform="translate(101 -9)">
    <path d="M9 1 14 8 9 15 4 8Z" fill={C} stroke={C2} strokeWidth="1.2" />
  </g>
);

const Filigree = () => (
  <g transform="translate(-10 -10)" fill="none" stroke={C2} strokeWidth="1.6" strokeLinecap="round">
    <path d="M70 12H18Q8 12 4 20M170 12h52Q232 12 236 20" />
    <path d="M62 12H30M178 12h32" stroke={C} strokeWidth="3" />
    <path d="M22 12 16 6 10 12 16 18ZM224 12 218 6 212 12 218 18Z" fill={C} strokeWidth="1.2" />
  </g>
);

const Side = ({ x }: { x: number }) => (
  <g transform={`translate(${x} 140)`}>
    <path d="M9 1 16 14 9 27 2 14Z" fill={C} stroke={C2} strokeWidth="1.4" />
    <path d="M9 7v14" stroke={C2} strokeWidth="1" />
  </g>
);

const PEARLS = [-1, 1].flatMap((d) => [0, 1, 2].map((k) => ({ x: 110 + d * (52 + k * 14), y: -14 + k * 3 })));

const DECO: Partial<Record<Rarity, ReactNode>> = {
  R: <Ticks />,
  SR: (
    <>
      <Ticks />
      <Mini />
    </>
  ),
  SSR: (
    <>
      <Corners />
      <Crest />
    </>
  ),
  UR: (
    <>
      <Corners />
      <Crest />
      <Filigree />
      <Side x={-9} />
      <Side x={211} />
      {PEARLS.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={C2} />
      ))}
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
