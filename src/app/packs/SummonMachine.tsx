"use client";

import { useEffect, useRef, useState } from "react";
import type { Rarity } from "@/generated/prisma/enums";
import { packAudio } from "@/lib/pack-audio";
import { ChamferFrame, StarRings } from "./StarFrame";

/** Invocation « graduations » (docs/direction-artistique.md §6) : cadre biseauté, astrolabe qui se trace, 60 graduations
 *  qui se remplissent pendant qu'une aiguille fait un tour par crans (12) avec son arc lumineux, puis verrouillage à la couleur
 *  de la meilleure rareté (étoile, anneaux de choc). N'importe quel clic sur l'écran, ou Échap, l'abrège (son coupé). */
const LOCK = 2.05;

export function SummonMachine({ rarity, fast, onDone }: { rarity: Rarity; fast: boolean; onDone: () => void }) {
  const [locked, setLocked] = useState(false);
  const [box, setBox] = useState<[number, number]>([0, 0]);
  const root = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; });
  const k = fast ? 0.6 : 1;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { done.current(); return; }
    const timers = [window.setTimeout(() => setLocked(true), LOCK * k * 1000), window.setTimeout(() => done.current(), (LOCK + 0.8) * k * 1000)];
    const skip = () => { packAudio.cut(); done.current(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") skip(); };
    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", key);
    const ro = new ResizeObserver(([e]) => setBox([Math.round(e.contentRect.width), Math.round(e.contentRect.height)]));
    if (root.current) ro.observe(root.current);
    return () => { timers.forEach((t) => window.clearTimeout(t)); window.removeEventListener("pointerdown", skip); window.removeEventListener("keydown", key); ro.disconnect(); };
  }, [k]);

  return (
    <div ref={root} className="pk-machine" data-locked={locked || undefined} data-rarity={locked ? rarity : undefined} style={{ "--k": k } as React.CSSProperties} role="status" aria-label="Invocation en cours, cliquer pour passer">
      <ChamferFrame w={box[0]} h={box[1]} />
      <div className="pk-machine-dial">
        <StarRings ticks extras lateAt={1.9}>
          <line className="pk-needle" x1={200} y1={200} x2={200} y2={22} strokeWidth={1.4} />
          <circle className="pk-draw pk-trail" cx={200} cy={200} r={170} pathLength={1} strokeWidth={2.4} style={{ "--d": ".25s", "--t": "1.7s", "--n": 12 } as React.CSSProperties} />
        </StarRings>
      </div>
      {locked && <><i className="pk-ring" /><i className="pk-ring" style={{ "--o": "0.12s" } as React.CSSProperties} /></>}
    </div>
  );
}
