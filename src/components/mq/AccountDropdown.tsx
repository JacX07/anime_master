"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Menu du profil : au survol sur grand écran (CSS), au toucher sur téléphone et tablette (clic sur l'avatar). */
export function AccountDropdown({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", key); };
  }, [open]);
  return (
    <div className="mq-nav-dropdown mq-account" ref={root} data-open={open}
      onClickCapture={(e) => {
        const target = e.target as HTMLElement;
        if (window.matchMedia("(max-width: 1499px)").matches && target.closest(".mq-player")) { e.preventDefault(); setOpen((o) => !o); }
        else if (target.closest(".mq-account-panel a")) setOpen(false);
      }}>
      {children}
    </div>
  );
}
