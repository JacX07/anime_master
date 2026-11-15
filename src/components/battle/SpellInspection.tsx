"use client";

import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { inspectionPosition, spellDescriptionParts } from "@/lib/spell-inspection";

export function SpellInspection({ id, anchor, name, target, description, note }: {
  id: string; anchor: HTMLElement; name: string; target: string; description: string; note: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const place = () => {
      const popup = ref.current;
      if (!popup) return;
      const rect = anchor.getBoundingClientRect();
      popup.style.maxHeight = `${Math.max(96, rect.top - 24)}px`;
      const position = inspectionPosition(rect, popup.getBoundingClientRect(), innerWidth);
      popup.style.left = `${position.left}px`;
      popup.style.top = `${position.top}px`;
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [anchor, name, description]);
  return createPortal(<div ref={ref} id={id} className="bt-spell-inspection" role="tooltip">
    <b>{name}</b><small>{target}</small>
    <p>{spellDescriptionParts(description).map((part, index) => part.effect ? <span key={index} className="bt-effect-name">{part.text}</span> : part.text)}</p>
    {note && <small>{note}</small>}
  </div>, document.body);
}
