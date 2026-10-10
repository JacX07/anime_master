"use client";

import { useEffect, useRef } from "react";

/** Menu navigable au clavier et à la manette (flèches, croix directionnelle) : la première entrée est sélectionnée à l'arrivée. */
export function MenuNav({ children, label }: { children: React.ReactNode; label: string }) {
  const nav = useRef<HTMLElement>(null);
  const items = () => [...(nav.current?.querySelectorAll<HTMLElement>("a.gm-item") ?? [])];

  useEffect(() => {
    items()[0]?.focus({ preventScroll: true });
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    const step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    const list = items();
    if (list.length === 0) return;
    e.preventDefault();
    const at = list.indexOf(document.activeElement as HTMLElement);
    list[(at + step + list.length) % list.length].focus();
  }

  return (
    <nav ref={nav} className="gm-menu" aria-label={label} onKeyDown={onKeyDown}>
      {children}
    </nav>
  );
}
