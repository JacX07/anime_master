"use client";

import { useId, useRef, useState, type ReactNode } from "react";

/** Même navigation sur tous les écrans ; repliable au toucher et au clavier sur mobile. */
export function Navigation({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const id = useId();
  return (
    <div className="mq-navigation" data-open={open} onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        toggle.current?.focus();
      }
    }}>
      <button type="button" className="ui-button mq-navigation-toggle" ref={toggle}
        aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>Menu</button>
      <div className="mq-navigation-content" id={id} onClick={(event) => {
        if ((event.target as HTMLElement).closest("a, .mq-play-button")) setOpen(false);
      }}>
        {children}
      </div>
    </div>
  );
}
