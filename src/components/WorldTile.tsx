"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

/** Tuile d'un monde : un clic ouvre la vitrine (cartes en grand, passée en `vitrine`) ; Échap, un clic à côté ou ✕ la referme. */
export function WorldTile({ label, style, vitrine, children }: { label: string; style: CSSProperties; vitrine: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <div
      className="wd-tile"
      style={style}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => setOpen(true)}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          setOpen(true);
        }
      }}
    >
      {children}
      {open && (
        <div
          className="wd-vitrine"
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
          }}
        >
          <button type="button" className="wd-v-close" aria-label="Fermer" onClick={() => setOpen(false)}>
            ✕
          </button>
          <div className="wd-v-body" onClick={(e) => e.stopPropagation()}>
            {vitrine}
          </div>
        </div>
      )}
    </div>
  );
}
