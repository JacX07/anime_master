"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./icons";

export interface NavItem {
  href: string;
  icon: string;
  label: string;
}

/** Onglet « agrégateur » : un seul bouton dans la barre, qui déroule la liste des pages d'une même famille. Souligné quand on est sur l'une d'elles. */
export function NavMenu({ icon, label, items }: { icon: string; label: string; items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const current = items.some((i) => pathname.startsWith(i.href));

  // Fermé quand on change de page (ajustement d'état pendant le rendu, comme AlbumLink)
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="nav-menu" ref={root}>
      <button
        type="button"
        className="site-link nav-menu-btn"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="true"
        aria-current={current ? "page" : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name={icon} />
        {label}
        <span className="nav-caret" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <ul className="nav-panel" id={panelId}>
          {items.map((i) => (
            <li key={i.href}>
              <Link href={i.href} className="nav-panel-link" aria-current={pathname.startsWith(i.href) ? "page" : undefined}>
                <Icon name={i.icon} />
                {i.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
