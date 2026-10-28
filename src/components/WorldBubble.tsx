"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Bulle d'aperçu d'une tuile de monde : sort à droite de la tuile, ou à gauche s'il n'y a pas la place (dernière colonne). */
export function WorldBubble({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const tile = el?.parentElement;
    if (!el || !tile) return;
    const place = () => {
      const room = window.innerWidth - tile.getBoundingClientRect().right;
      el.dataset.side = room < el.offsetWidth + 24 ? "left" : "right";
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
