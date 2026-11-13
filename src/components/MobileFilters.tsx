"use client";

import { useId, useState, type ReactNode } from "react";

/** Les mêmes filtres restent ouverts sur PC et se déplient au toucher sur téléphone. */
export function MobileFilters({ children, active = false }: { children: ReactNode; active?: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <div className="mobile-filters" data-open={open}>
    <button type="button" className="mobile-filters-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>Filtres{active ? " · actifs" : ""} ⌄</button>
    <div id={id} className="mobile-filters-panel">{children}</div>
  </div>;
}
