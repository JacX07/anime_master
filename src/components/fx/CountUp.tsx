"use client";

import { useEffect, useRef, useState } from "react";

const fmt = new Intl.NumberFormat("fr-FR");

/** Nombre qui défile jusqu'à sa nouvelle valeur (lot 3 de la refonte), avec un petit sursaut doré. */
export function CountUp({ value, id }: { value: number; id: string }) {
  const [shown, setShown] = useState(value);
  const [bump, setBump] = useState(false);
  const from = useRef(value);
  useEffect(() => {
    // Valeur de la page précédente : le compteur défile aussi après une navigation
    let start = from.current;
    try { const saved = sessionStorage.getItem(`fx-count:${id}`); if (saved !== null && start === value) start = Number(saved); } catch { /* stockage indisponible */ }
    try { sessionStorage.setItem(`fx-count:${id}`, String(value)); } catch { /* stockage indisponible */ }
    from.current = value;
    if (start === value || !Number.isFinite(start) || matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(value); return; }
    setBump(true);
    const t0 = performance.now();
    const D = 900;
    let frame = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / D);
      setShown(Math.round(start + (value - start) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) frame = requestAnimationFrame(step); else setBump(false);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, id]);
  return <span className={bump ? "fx-count fx-bump" : "fx-count"}>{fmt.format(shown)}</span>;
}
