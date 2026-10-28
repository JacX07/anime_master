"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Bulle d'aperçu d'une tuile de monde : sort à droite de la tuile, à gauche en bout de ligne, et dessous quand l'écran est trop étroit pour les deux côtés. */
export function WorldBubble({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const tile = el?.parentElement;
    if (!el || !tile) return;
    const place = () => {
      const r = tile.getBoundingClientRect();
      const need = el.offsetWidth + 24;
      el.dataset.side = window.innerWidth - r.right >= need ? "right" : r.left >= need ? "left" : "below";
    };
    tile.addEventListener("pointerenter", place);
    tile.addEventListener("focus", place);
    return () => {
      tile.removeEventListener("pointerenter", place);
      tile.removeEventListener("focus", place);
    };
  }, []);
  return (
    <div ref={ref} className="wd-bubble" data-side="right" aria-hidden>
      {children}
    </div>
  );
}
