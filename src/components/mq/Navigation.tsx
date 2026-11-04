"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/** Même navigation sur tous les écrans ; repliable au toucher et au clavier sur mobile. */
export function Navigation({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  // Un clic ou un toucher en dehors du menu le referme.
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <div className="mq-navigation" ref={root} data-open={open} onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        toggle.current?.focus();
      }
    }}>
      <button type="button" className="ui-button mq-navigation-toggle" ref={toggle}
        aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}><i className="mq-burger" aria-hidden="true" />Menu</button>
      <span className="mq-navigation-scrim" aria-hidden="true" onClick={() => setOpen(false)} />
      <div className="mq-navigation-content" id={id} onClick={(event) => {
        if ((event.target as HTMLElement).closest("a, .mq-play-button")) setOpen(false);
      }}>
        {children}
      </div>
    </div>
  );
}
