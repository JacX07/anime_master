"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Effets globaux de la refonte (docs/direction-artistique.md §4.22) : soulignement doré qui glisse sous
 * l'onglet actif, fondu d'entrée des pages, onde au clic des boutons. Tout est dessiné dans un calque à part
 * (jamais dans le DOM des composants, ce qui casserait l'hydratation de React).
 */
const GROUPS = ".mq-game-nav, .pg-tabs nav, .mq-section-tabs, .inventory-tabs, .eq-tabs, .quest-filters, .mq-market-tabs, .album-filters .vt-chips[aria-label='Possession'], .cs-sorts";
const ACTIVE = ":is(.mq-active, [aria-current='page'], [aria-current='true'], [aria-selected='true'], [aria-pressed='true'], [data-active='true'])";
const RIPPLE = ".ui-button, .fx-btn, .mq-play-button, .pk-open, .claim-button";

const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const signature = (group: Element) => [...group.querySelectorAll("a, button")].map((el) => el.textContent?.trim()).join("|").slice(0, 200);
/** Dernière position de chaque groupe (par libellés), pour glisser depuis l'onglet de la page précédente. */
const last = new Map<string, { x: number; w: number }>();

export function FxRuntime() {
  const pathname = usePathname();
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = layer.current;
    if (!root) return;
    const bars = new Map<Element, HTMLSpanElement>();
    let frame = 0;
    const update = () => {
      const seen = new Set<Element>();
      for (const group of document.querySelectorAll<HTMLElement>(GROUPS)) {
        const active = [...group.querySelectorAll<HTMLElement>(ACTIVE)].find((el) => el.closest(GROUPS) === group && el.getClientRects().length > 0);
        if (!active) continue;
        seen.add(group);
        const r = active.getBoundingClientRect();
        const pos = { x: r.left + 6, w: Math.max(12, r.width - 12) };
        let bar = bars.get(group);
        if (!bar) {
          bar = document.createElement("span");
          bar.className = "fx-tabbar";
          root.appendChild(bar);
          bars.set(group, bar);
          const prev = last.get(signature(group));
          if (prev && !reduce()) {
            bar.style.transition = "none";
            bar.style.transform = `translate(${prev.x}px, ${r.bottom - 2}px)`;
            bar.style.width = `${prev.w}px`;
            void bar.offsetWidth;
            bar.style.transition = "";
          }
        }
        bar.style.transform = `translate(${pos.x}px, ${r.bottom - 2}px)`;
        bar.style.width = `${pos.w}px`;
        bar.style.opacity = "1";
        last.set(signature(group), pos);
      }
      for (const [group, bar] of bars) if (!seen.has(group)) { bar.remove(); bars.delete(group); }
      document.documentElement.classList.add("fx-tabs-on");
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    // Pendant le défilement, la barre suit sans animation
    const onScroll = () => { for (const bar of bars.values()) bar.style.transition = "none"; update(); requestAnimationFrame(() => { for (const bar of bars.values()) bar.style.transition = ""; }); };
    schedule();
    const late = setTimeout(schedule, 400);
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-current", "aria-selected", "aria-pressed", "data-active", "class"] });
    addEventListener("resize", schedule);
    addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      cancelAnimationFrame(frame); clearTimeout(late); mo.disconnect();
      removeEventListener("resize", schedule); removeEventListener("scroll", onScroll, { capture: true });
      for (const bar of bars.values()) bar.remove();
    };
  }, [pathname]);

  // Fondu d'entrée de la page
  useEffect(() => {
    if (reduce()) return;
    const page = document.querySelector<HTMLElement>(".mq-page");
    if (!page) return;
    page.classList.remove("fx-enter");
    void page.offsetWidth;
    page.classList.add("fx-enter");
  }, [pathname]);

  // Onde au clic : un cadre fixe à la taille du bouton, dans le calque
  useEffect(() => {
    const root = layer.current;
    const down = (e: PointerEvent) => {
      if (!root || reduce()) return;
      const host = (e.target as Element | null)?.closest<HTMLElement>(RIPPLE);
      if (!host || (host as HTMLButtonElement).disabled) return;
      const r = host.getBoundingClientRect();
      const size = Math.max(r.width, r.height);
      const clip = document.createElement("span");
      clip.className = "fx-ripple-clip";
      clip.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
      const dot = document.createElement("span");
      dot.className = "fx-ripple";
      dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      clip.appendChild(dot);
      root.appendChild(clip);
      setTimeout(() => clip.remove(), 650);
    };
    addEventListener("pointerdown", down, true);
    return () => removeEventListener("pointerdown", down, true);
  }, []);

  // Lot 2 : les cartes s'inclinent en 3D et prennent un reflet qui suit la souris (hors combat)
  useEffect(() => {
    let current: HTMLElement | null = null;
    let frame = 0;
    const release = () => {
      if (!current) return;
      current.classList.remove("fx-tilt");
      current.style.removeProperty("transform");
      current = null;
    };
    const move = (e: PointerEvent) => {
      if (reduce() || e.pointerType === "touch") return;
      const card = (e.target as Element | null)?.closest<HTMLElement>(".card");
      if (card !== current) release();
      if (!card || card.closest(".bt-layout, .hs-fight, .pk-stage, [data-no-tilt]")) return;
      current = card;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.classList.add("fx-tilt");
        card.style.transform = `perspective(900px) rotateY(${(x - 0.5) * 16}deg) rotateX(${(0.5 - y) * 16}deg) translateZ(0)`;
        card.style.setProperty("--gx", `${x * 100}%`);
        card.style.setProperty("--gy", `${y * 100}%`);
      });
    };
    addEventListener("pointermove", move, { passive: true });
    addEventListener("pointerleave", release);
    addEventListener("scroll", release, { capture: true, passive: true });
    return () => { cancelAnimationFrame(frame); release(); removeEventListener("pointermove", move); removeEventListener("pointerleave", release); removeEventListener("scroll", release, { capture: true }); };
  }, []);

  return <div ref={layer} className="fx-layer" aria-hidden="true" />;
}
