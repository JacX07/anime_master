import type { Rarity } from "@/generated/prisma/enums";

// Décors autour du cadre d'une carte (R et au-dessus) : coins, couronne, filigrane et perles de l'UR (sans animation ni flou : trop lourd à l'écran). Tout est positionné en cqw
// pour suivre la taille de la carte ; la couleur vient de --rarity. La carte laisse déborder ces décors (voir .card dans globals.css).

const C = "var(--rarity)";
const C2 = "var(--rarity-light)";

const Corners = ({ big }: { big: boolean }) =>
  (["tl", "tr", "bl", "br"] as const).map((k) =>
    big ? (
      <svg key={k} className={`deco-corner ${k}`} viewBox="0 0 46 46" fill="none" stroke={C} strokeWidth="3" strokeLinecap="round">
        <path d="M4 42V14Q4 4 14 4H42" />
        <path d="M12 42V20Q12 12 20 12H42" strokeWidth="1.5" stroke={C2} opacity=".8" />
        <circle cx="4" cy="4" r="4" fill={C2} stroke="none" />
      </svg>
    ) : (
      <svg key={k} className={`deco-tick ${k}`} viewBox="0 0 22 22" fill="none" stroke={C} strokeWidth="2.4" strokeLinecap="round">
        <path d="M3 19V7Q3 3 7 3H19" />
      </svg>
    ),
  );

const Crest = () => (
  <svg className="deco-crest" viewBox="0 0 64 40">
    <path d="M32 2 40 14 32 38 24 14Z" fill={C} stroke={C2} strokeWidth="1.5" />
    <path d="M22 20C12 20 6 14 2 8c8 0 14 2 18 6ZM42 20c10 0 16-6 20-12-8 0-14 2-18 6Z" fill={C} opacity=".9" />
    <circle cx="32" cy="14" r="2.5" fill={C2} />
  </svg>
);

const Mini = () => (
  <svg className="deco-mini" viewBox="0 0 18 16">
    <path d="M9 1 14 8 9 15 4 8Z" fill={C} stroke={C2} strokeWidth="1.2" />
  </svg>
);

const Filigree = () => (
  <svg className="deco-fil" viewBox="0 0 240 22" fill="none" stroke={C2} strokeWidth="1.6" strokeLinecap="round">
    <path d="M70 12H18Q8 12 4 20M170 12h52Q232 12 236 20" />
    <path d="M62 12H30M178 12h32" stroke={C} strokeWidth="3" />
    <path d="M22 12 16 6 10 12 16 18ZM224 12 218 6 212 12 218 18Z" fill={C} strokeWidth="1.2" />
  </svg>
);

const Side = () =>
  (["l", "r"] as const).map((k) => (
    <svg key={k} className={`deco-side ${k}`} viewBox="0 0 18 28">
      <path d="M9 1 16 14 9 27 2 14Z" fill={C} stroke={C2} strokeWidth="1.4" />
      <path d="M9 7v14" stroke={C2} strokeWidth="1" />
    </svg>
  ));

const PEARLS = [-1, 1].flatMap((d) => [0, 1, 2].map((k) => ({ x: d * (24 + k * 6.4), y: -6.4 + k * 1.4 })));

export function CardDeco({ rarity }: { rarity: Rarity }) {
  if (rarity === "N") return null;
  return (
    <span className="card-deco" aria-hidden>
      <Corners big={rarity === "SSR" || rarity === "UR"} />
      {rarity === "SR" && <Mini />}
      {(rarity === "SSR" || rarity === "UR") && <Crest />}
      {rarity === "UR" && (
        <>
          <Filigree />
          <Side />
          {PEARLS.map((p, i) => (
            <i key={i} className="deco-pearl" style={{ left: `calc(50% + ${p.x}cqw)`, top: `${p.y}cqw` }} />
          ))}
        </>
      )}
    </span>
  );
}
