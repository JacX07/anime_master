"use client";

import { useCallback, useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";

export type InspectSpell = (key: string | null, anchor: HTMLElement | null) => void;

/** A hold inspects; its release must never become a spell selection. */
export function useHoldInspection(onInspect: InspectSpell, enabled: boolean) {
  const callback = useRef(onInspect);
  const press = useRef<{ key: string; anchor: HTMLElement; x: number; y: number; held: boolean; timer: ReturnType<typeof setTimeout> } | null>(null);
  const suppressClick = useRef(false);
  useEffect(() => { callback.current = onInspect; }, [onInspect]);
  const end = useCallback(() => {
    const current = press.current;
    if (!current) return;
    clearTimeout(current.timer);
    press.current = null;
    if (current.held) suppressClick.current = true;
  }, []);
  const cancel = useCallback(() => { if (press.current) suppressClick.current = true; end(); callback.current(null, null); }, [end]);
  useEffect(() => {
    const visibility = () => { if (document.hidden) cancel(); };
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") cancel(); };
    window.addEventListener("blur", cancel);
    window.addEventListener("pointerup", end);
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("blur", cancel);
      window.removeEventListener("pointerup", end);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("keydown", escape);
      cancel();
    };
  }, [cancel, end]);
  useEffect(() => { if (!enabled) cancel(); }, [enabled, cancel]);

  const start = (key: string, anchor: HTMLElement, x = 0, y = 0) => {
    end();
    suppressClick.current = false;
    if (!enabled) return;
    const current = { key, anchor, x, y, held: false, timer: setTimeout(() => {
      if (press.current !== current) return;
      current.held = true;
      callback.current(key, anchor);
    }, 350) };
    press.current = current;
  };
  return (key: string, onTap: (anchor: HTMLElement) => void) => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0 || !event.isPrimary) return;
      start(key, event.currentTarget, event.clientX, event.clientY);
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Synthetic pointers have no native capture. */ }
    },
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
      const current = press.current;
      if (current && !current.held && Math.hypot(event.clientX - current.x, event.clientY - current.y) > 12) {
        suppressClick.current = true;
        end();
      }
    },
    onPointerUp: end,
    onPointerCancel: cancel,
    onLostPointerCapture: end,
    onBlur: end,
    onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
      if (suppressClick.current) { suppressClick.current = false; event.preventDefault(); return; }
      onTap(event.currentTarget);
    },
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      if (!event.repeat) start(key, event.currentTarget);
    },
    onKeyUp: (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      const wasHeld = press.current?.held;
      end();
      if (!wasHeld && !suppressClick.current) onTap(event.currentTarget);
      suppressClick.current = false;
    },
  });
}
