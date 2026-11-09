"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./tutorial.css";
import { getTutorial, nextTutorial, skipTutorial, type TutorialState } from "@/app/tutorial-actions";
import { phaseProgress, tutorialStep } from "@/lib/tutorial";

const GAP = 14;
const MARGIN = 16;

function visible(el: Element | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
}
const firstVisible = (selectors: string[]) => {
  for (const s of selectors) for (const el of document.querySelectorAll(s)) if (visible(el)) return el;
  return null;
};

/** Tutoriel en infobulles (docs/specs/guide.md, style : docs/direction-artistique.md §4.6–4.7). */
export function Tutorial() {
  const pathname = usePathname();
  const [state, setState] = useState<TutorialState>({ step: 0, locks: {} });
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [hidden, setHidden] = useState(false);
  const [engagedOn, setEngagedOn] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const target = useRef<HTMLElement | null>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [tipSize, setTipSize] = useState({ w: 280, h: 160 });
  const step = tutorialStep(state.step);

  const refresh = useCallback(() => { getTutorial().then(setState).catch(() => {}); }, []);
  useEffect(refresh, [refresh, pathname]);
  useEffect(() => {
    addEventListener("tutorial:refresh", refresh);
    return () => removeEventListener("tutorial:refresh", refresh);
  }, [refresh]);
  // Le joueur vient de cliquer l'élément ciblé : on le laisse faire jusqu'au changement d'étape ou de page.
  const here = `${state.step}|${pathname}`;
  const engaged = engagedOn === here;

  // Étapes d'action : on vérifie régulièrement si l'action est faite.
  useEffect(() => {
    if (step?.phase !== "action") return;
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [step?.phase, refresh]);

  // Présentation des modes : le menu JOUER reste ouvert.
  useEffect(() => {
    const open = step?.phase === "modes" && !hidden;
    window.dispatchEvent(new CustomEvent("tutorial:play", { detail: { open } }));
  }, [state.step, step?.phase, hidden, pathname]);

  // Suivi de l'élément ciblé (défilement, redimensionnement, menus qui s'ouvrent).
  useEffect(() => {
    if (!step) return;
    let last = "";
    let viewport = "";
    const track = () => {
      const fighting = !!document.querySelector(".hs-fight, .bt-layout, .pk-stage[data-revealing]") || pathname.startsWith("/combat");
      setHidden(fighting);
      const away = (step.phase === "action" || step.phase === "home") && pathname !== step.page;
      const selectors = away ? step.away ?? [] : step.targets;
      // Menu replié (petits écrans) : on cible le bouton Menu à la place de l'onglet.
      const el = firstVisible(selectors) ?? (away || step.phase === "tabs" || step.key === "play" ? firstVisible([".mq-navigation-toggle"]) : null);
      const size = `${innerWidth},${innerHeight}`;
      if (el !== target.current || size !== viewport) {
        viewport = size;
        target.current = el;
        const r = el?.getBoundingClientRect();
        if (el && r && (r.top < 80 || r.bottom > innerHeight)) el.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      }
      const r = el?.getBoundingClientRect() ?? null;
      const key = r ? `${r.left|0},${r.top|0},${r.width|0},${r.height|0}` : "none";
      if (key !== last) { last = key; setRect(r); }
    };
    track();
    const id = setInterval(track, 250);
    addEventListener("resize", track);
    addEventListener("scroll", track, true);
    return () => { clearInterval(id); removeEventListener("resize", track); removeEventListener("scroll", track, true); };
  }, [step, pathname]);

  // Un clic dans l'élément ciblé pendant une étape d'action masque la bulle.
  useEffect(() => {
    if (step?.phase !== "action") return;
    const down = (e: PointerEvent) => {
      const el = target.current;
      if (el && el.contains(e.target as Node) && pathname === step.page) setEngagedOn(here);
    };
    addEventListener("pointerdown", down, true);
    return () => removeEventListener("pointerdown", down, true);
  }, [step, pathname, here]);

  useLayoutEffect(() => {
    if (tip.current) setTipSize({ w: tip.current.offsetWidth, h: tip.current.offsetHeight });
  }, [state.step, rect, error]);

  if (!step || hidden || engaged) return null;

  const next = async () => { setPending(true); setError(""); try { setState(await nextTutorial(state.step)); } catch { setError("Enregistrement impossible. Réessaie."); } finally { setPending(false); } };
  const skip = async () => { setPending(true); setError(""); try { await skipTutorial(); setState({ step: 0, locks: {} }); } catch { setError("Enregistrement impossible. Réessaie."); } finally { setPending(false); } };

  // Bulle sous la cible si la place le permet, sinon au-dessus ; sans cible, au centre.
  let pos: { left: number; top: number };
  if (rect) {
    const below = rect.bottom + GAP + tipSize.h < innerHeight - MARGIN;
    const top = Math.max(MARGIN, Math.min(below ? rect.bottom + GAP : rect.top - GAP - tipSize.h, innerHeight - tipSize.h - MARGIN));
    const left = Math.min(Math.max(MARGIN, rect.left + rect.width / 2 - tipSize.w / 2), innerWidth - tipSize.w - MARGIN);
    pos = { left, top };
  } else pos = { left: (innerWidth - tipSize.w) / 2, top: Math.max(MARGIN, (innerHeight - tipSize.h) / 2) };

  const { index, total } = phaseProgress(state.step);
  const EYEBROW: Record<string, string> = { action: "TUTORIEL", home: "L’ACCUEIL", modes: "LES MODES DE JEU", tabs: "LES ONGLETS", shortcuts: "LES RACCOURCIS", combat: "LE COMBAT" };
  const eyebrow = step.phase === "end" ? "TUTORIEL" : `${EYEBROW[step.phase]} · ${index} / ${total}`;
  const awayHint = (step.phase === "action" || step.phase === "home") && pathname !== step.page;
  const lock = step.mode ? state.locks[step.mode] : undefined;

  // Rendu dans <body> : la barre du haut (flou d'arrière-plan) piégerait les positions fixes.
  return createPortal(
    <div className="mq-app-shell tuto-layer" data-phase={step.phase}>
      {rect
        ? <div className="tuto-ring" style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8 }} aria-hidden="true" />
        : <div className="tuto-veil" aria-hidden="true" />}
      <div ref={tip} className="tuto-tip" role="dialog" aria-live="polite" aria-label={`Tutoriel : ${step.title}`} style={pos}>
        <p className="tuto-eyebrow">{eyebrow}</p>
        <h2>{step.title}</h2>
        <p>{awayHint ? `${step.text} Suis l’élément entouré pour y aller.` : step.text}</p>
        {step.points && <ul className="tuto-points">{step.points.map((point) => <li key={point}>{point}</li>)}</ul>}
        {lock && <p className="tuto-lock">{lock}</p>}
        {error && <p role="alert">{error}</p>}
        <div className="tuto-row">
          <button type="button" className="tuto-skip" onClick={skip} disabled={pending}>{step.phase === "end" ? "Fermer" : "Passer le tutoriel"}</button>
          {step.phase === "action"
            ? <span className="tuto-wait">En attente</span>
            : <button type="button" className="ui-button" onClick={next} disabled={pending}>{step.phase === "end" ? "Terminer" : "Suivant"}</button>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
