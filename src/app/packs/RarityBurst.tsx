import type { CSSProperties } from "react";

/** Éclat plein scène d'un SSR ou d'un UR (docs/direction-artistique.md §6) : tout avance par crans.
 *  Anneau gravé qui tourne de trois crans (deux anneaux contre-rotatifs pour l'UR), plaque de rareté qui claque,
 *  lames de lumière, éclats anguleux, fissures claires, éclair bref ; secousse crantée pour l'UR. 1,7 s. */
const SHARDS = [
  [-170, -90, 120], [150, -120, -200], [-90, 120, 250], [190, 70, -90], [-40, -150, 180], [60, 150, -240], [-200, 20, 60], [110, -40, 300],
  [-130, 90, -150], [20, -190, 90], [230, -20, -300], [-240, -60, 210], [90, 110, -60], [-60, 170, 150],
] as const;

function Ring({ r, reverse }: { r: number; reverse?: boolean }) {
  const ticks = Array.from({ length: 24 }, (_, i) => {
    const a = (i * 15 * Math.PI) / 180;
    const [r1, r2] = [104, i % 2 ? 112 : 118];
    return <line key={i} x1={115 + r1 * Math.sin(a)} y1={115 - r1 * Math.cos(a)} x2={115 + r2 * Math.sin(a)} y2={115 - r2 * Math.cos(a)} strokeWidth={i % 2 ? 2 : 3} />;
  });
  return (
    <span className="pk-burst-ring" data-reverse={reverse || undefined} style={{ "--size": `${r}px` } as CSSProperties}>
      <svg viewBox="0 0 230 230" aria-hidden="true">
        <circle cx="115" cy="115" r="100" fill="none" strokeWidth="3" />
        <circle cx="115" cy="115" r="92" fill="none" strokeWidth="2" strokeDasharray={reverse ? "6 5" : "30 8"} className="pk-burst-dim" />
        <g>{ticks}</g>
        <path d="M115 -4l5 5-5 5-5-5z M115 224l5 5-5 5-5-5z" className="pk-burst-gem" />
      </svg>
    </span>
  );
}

export function RarityBurst({ rarity, onEnd }: { rarity: "SSR" | "UR"; onEnd: () => void }) {
  const ur = rarity === "UR";
  return (
    <div className="pk-burst" data-rarity={rarity} aria-hidden="true" onAnimationEnd={(e) => e.target === e.currentTarget && onEnd()}>
      <Ring r={230} />
      {ur && <Ring r={290} reverse />}
      <svg className="pk-burst-cracks" viewBox="0 0 760 400" preserveAspectRatio="none">
        <g fill="none" strokeWidth="2" strokeLinejoin="miter">
          <path d="M0 60L120 90L170 70L300 150" />
          <path d="M760 40L650 100L610 80L480 160" />
          <path d="M0 340L110 300L160 320L290 250" />
          <path d="M760 360L660 310L620 330L490 250" />
          {ur && <path d="M380 0L360 60L400 100L370 150" />}
          {ur && <path d="M380 400L400 340L360 300L390 250" />}
        </g>
      </svg>
      {[-30, 28, 90].slice(0, ur ? 3 : 2).map((rot, i) => <i key={rot} className="pk-burst-slash" style={{ "--rot": `${rot}deg`, "--i": i } as CSSProperties} />)}
      {SHARDS.slice(0, ur ? 14 : 9).map(([x, y, r], i) => <i key={i} className="pk-burst-shard" style={{ "--x": `${x}px`, "--y": `${y}px`, "--r": `${r}deg`, "--d": `${0.55 + (i % 5) * 0.012}s` } as CSSProperties} />)}
      <b className="pk-burst-plate">{rarity}</b>
      <span className="pk-burst-flash" />
    </div>
  );
}
