"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { packAudio } from "@/lib/pack-audio";
import "./select-menu.css";

const ROW = 36;
const MAX_HEIGHT = 320;

interface Item { index: number; label: string; disabled: boolean; header?: boolean }
interface Menu { select: HTMLSelectElement; items: Item[]; active: number; style: React.CSSProperties }

function itemsOf(select: HTMLSelectElement): Item[] {
  const out: Item[] = [];
  let index = 0;
  const add = (o: HTMLOptionElement) => out.push({ index: index++, label: o.text, disabled: o.disabled });
  for (const child of Array.from(select.children)) {
    if (child instanceof HTMLOptGroupElement) {
      out.push({ index: -1, label: child.label, disabled: true, header: true });
      for (const o of Array.from(child.children)) if (o instanceof HTMLOptionElement) add(o);
    } else if (child instanceof HTMLOptionElement) add(child);
  }
  return out;
}

/** Remplace la fenêtre native des <select> (souris et clavier) par un menu du thème qui fait un tic à chaque ligne franchie. */
export function SelectMenu() {
  const [menu, setMenuState] = useState<Menu | null>(null);
  const ref = useRef<Menu | null>(null);
  const list = useRef<HTMLUListElement>(null);
  const openedAt = useRef(0);
  const lastRow = useRef(0);
  const setMenu = (m: Menu | null) => { ref.current = m; setMenuState(m); };

  useEffect(() => {
    const close = (refocus = false) => {
      const m = ref.current;
      if (!m) return;
      setMenu(null);
      if (refocus) m.select.focus();
    };
    const open = (select: HTMLSelectElement) => {
      const items = itemsOf(select);
      const rect = select.getBoundingClientRect();
      const height = Math.min(MAX_HEIGHT, items.length * ROW + 8);
      const below = window.innerHeight - rect.bottom - 8;
      const up = below < height && rect.top > below;
      const style: React.CSSProperties = { left: rect.left, minWidth: rect.width, maxWidth: window.innerWidth - rect.left - 8, ...(up ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }) };
      openedAt.current = performance.now();
      setMenu({ select, items, active: select.selectedIndex, style });
      packAudio.uiOpen();
    };
    const pick = (m: Menu, index: number) => {
      if (index < 0 || m.select.options[index]?.disabled) return;
      const changed = m.select.selectedIndex !== index;
      m.select.selectedIndex = index;
      if (changed) m.select.dispatchEvent(new Event("change", { bubbles: true }));
      close(true);
    };
    const move = (m: Menu, delta: number, to?: "first" | "last") => {
      const enabled = m.items.filter((i) => !i.header && !i.disabled).map((i) => i.index);
      if (!enabled.length) return;
      const at = enabled.indexOf(m.active);
      const next = to === "first" ? enabled[0] : to === "last" ? enabled[enabled.length - 1] : enabled[Math.max(0, Math.min(enabled.length - 1, at + delta))];
      if (next !== m.active) { setMenu({ ...m, active: next }); packAudio.uiTick(); }
    };
    const mousedown = (e: MouseEvent) => {
      const t = e.target;
      if (t instanceof HTMLSelectElement && e.button === 0 && !t.disabled && matchMedia("(pointer: fine)").matches) {
        e.preventDefault(); // bloque la fenêtre native
        t.focus();
        if (ref.current?.select === t) close();
        else open(t);
      } else if (ref.current && !(t instanceof Element && t.closest(".sm-menu"))) close();
    };
    const keydown = (e: KeyboardEvent) => {
      const m = ref.current;
      if (m) {
        const steps: Record<string, () => void> = {
          ArrowDown: () => move(m, 1), ArrowUp: () => move(m, -1), PageDown: () => move(m, 8), PageUp: () => move(m, -8),
          Home: () => move(m, 0, "first"), End: () => move(m, 0, "last"),
          Enter: () => pick(m, m.active), " ": () => pick(m, m.active), Escape: () => close(true), Tab: () => close(),
        };
        const step = steps[e.key];
        if (step && e.key !== "Tab") { e.preventDefault(); step(); } else if (step) step();
        return;
      }
      const t = e.target;
      if (t instanceof HTMLSelectElement && !t.disabled && (e.key === " " || e.key === "F4" || (e.altKey && e.key === "ArrowDown")) && matchMedia("(pointer: fine)").matches) {
        e.preventDefault();
        open(t);
      }
    };
    const dismiss = (e: Event) => { if (!(e.target instanceof Element && e.target.closest(".sm-menu"))) close(); };
    document.addEventListener("mousedown", mousedown, true);
    document.addEventListener("keydown", keydown, true);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("blur", dismiss);
    return () => {
      document.removeEventListener("mousedown", mousedown, true);
      document.removeEventListener("keydown", keydown, true);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("blur", dismiss);
    };
  }, []);

  const active = menu?.active;
  useEffect(() => {
    list.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, menu === null]);

  if (!menu) return null;
  const hover = (index: number, e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || index === menu.active || menu.items.find((i) => i.index === index)?.disabled) return;
    setMenu({ ...menu, active: index });
    packAudio.uiTick();
  };
  const scrolled = (e: React.UIEvent<HTMLUListElement>) => {
    const row = Math.floor(e.currentTarget.scrollTop / ROW);
    if (row === lastRow.current) return;
    lastRow.current = row;
    if (performance.now() - openedAt.current > 200) packAudio.uiTick();
  };
  // Dans une fenêtre modale (<dialog> en couche supérieure), le menu doit y être rendu, sinon il s'ouvre derrière elle
  const host = menu.select.closest("dialog[open]") ?? document.body;
  return createPortal(
    <ul ref={list} className="sm-menu" role="listbox" style={menu.style} onScroll={scrolled}>
      {menu.items.map((item, k) => item.header ? (
        <li key={k} className="sm-group" role="presentation">{item.label}</li>
      ) : (
        <li
          key={k}
          className="sm-opt"
          role="option"
          data-i={item.index}
          data-active={item.index === menu.active ? "" : undefined}
          aria-selected={item.index === menu.select.selectedIndex}
          aria-disabled={item.disabled || undefined}
          onPointerOver={(e) => hover(item.index, e)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (item.disabled) return;
            const changed = menu.select.selectedIndex !== item.index;
            menu.select.selectedIndex = item.index;
            if (changed) menu.select.dispatchEvent(new Event("change", { bubbles: true }));
            setMenu(null);
            menu.select.focus();
          }}
        >{item.label}</li>
      ))}
    </ul>,
    host,
  );
}
