"use client";

import { useEffect, useRef, useState } from "react";
import type { Rarity } from "@/generated/prisma/enums";

const TICKS = 4;

/** Mécanisme d'invocation (docs/direction-artistique.md §6) : quatre crans secs, verrouillage à la couleur
 *  de la meilleure rareté du paquet, trois éclats qui tombent, puis la main passe aux cartes. Un clic l'abrège. */
export function SummonMachine({ rarity, fast, onDone }: { rarity: Rarity; fast: boolean; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [locked, setLocked] = useState(false);
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { done.current(); return; }
    const beat = fast ? 170 : 300;
    const timers = Array.from({ length: TICKS }, (_, i) => window.setTimeout(() => setStep(i + 1), 60 + beat * i));
    timers.push(window.setTimeout(() => setLocked(true), 60 + beat * TICKS));
    timers.push(window.setTimeout(() => done.current(), 60 + beat * TICKS + (fast ? 520 : 700)));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [fast]);

  return (
    <div role="button" tabIndex={0} className="pk-machine" data-locked={locked || undefined} data-rarity={locked ? rarity : undefined}
      style={{ "--step": step } as React.CSSProperties} onClick={() => done.current()}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); done.current(); } }} aria-label="Invocation en cours, cliquer pour passer">
      <span className="pk-machine-part pk-machine-gear" aria-hidden="true" />
      <span className="pk-machine-part pk-machine-pinion" aria-hidden="true" />
      <span className="pk-machine-part pk-machine-dial" aria-hidden="true" />
      <span className="pk-machine-ring" aria-hidden="true" />
      <span className="pk-machine-needle" aria-hidden="true" />
      <span className="pk-machine-hub" aria-hidden="true" />
      {locked && [0, 1, 2].map((k) => <i key={k} className="pk-machine-shard" style={{ "--k": k } as React.CSSProperties} aria-hidden="true" />)}
    </div>
  );
}
