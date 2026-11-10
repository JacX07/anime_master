"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import type { Rarity } from "@/generated/prisma/enums";
import { packAudio } from "@/lib/pack-audio";
import { Icon } from "./icons";
import "./awakening-stars.css";

/** Étoile confirmée par le serveur : un cran et un éclat, sans rejouer au rafraîchissement. */
export function AwakeningStars({ stars, rarity, gainedStar = 0 }: { stars: number; rarity: Rarity; gainedStar?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const played = useRef(0);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    if (!gainedStar || played.current === gainedStar) return;
    if (media.matches || document.hidden) { played.current = gainedStar; return; }
    const target = ref.current?.querySelector<HTMLElement>(`[data-star="${gainedStar}"]`);
    if (!target) return;
    // Activity recrée les effets au retour ; attendre une frame permet aussi le double montage de développement.
    const frame = requestAnimationFrame(() => { played.current = gainedStar; });
    const animations: Animation[] = [];
    const ease = "cubic-bezier(.2,.9,.3,1)";
    const animate = (element: Element | null, frames: Keyframe[], options: KeyframeAnimationOptions) => {
      if (element) animations.push(element.animate(frames, { fill: "none", ...options }));
    };
    animate(target.querySelector(".awakening-glyph"), [
      { opacity: .16, transform: "scale(1)" },
      { opacity: 1, transform: "scale(.92)", offset: .18 },
      { opacity: 1, transform: "scale(1.2)", offset: .48 },
      { opacity: 1, transform: "scale(1)" },
    ], { duration: 420, easing: ease });
    animate(target.querySelector(".awakening-burst"), [
      { opacity: 0, transform: "scale(.55)" },
      { opacity: .45, transform: "scale(.8)", offset: .22 },
      { opacity: 0, transform: "scale(1.5)" },
    ], { duration: 460, delay: 80, easing: ease });
    target.querySelectorAll(".awakening-spark").forEach((spark, index) => {
      const [x, y] = [[-27, -23], [27, -19], [3, 32]][index];
      animate(spark, [{ opacity: 0, transform: "translate(0,0) scale(.35)" }, { opacity: .75, offset: .2 },
        { opacity: 0, transform: `translate(${x}px,${y}px) scale(.12)` }], { duration: 360, delay: 120 + index * 25, easing: ease });
    });
    let stopSound: (() => void) | undefined;
    try { stopSound = packAudio.awaken(); } catch { /* Le son indisponible ne bloque pas le résultat. */ }
    const stop = () => {
      animations.forEach((animation) => animation.cancel());
      stopSound?.();
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", key, true);
      document.removeEventListener("visibilitychange", visibility);
      media.removeEventListener("change", motion);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); stop(); }
    };
    const visibility = () => { if (document.hidden) stop(); };
    const motion = () => { if (media.matches) stop(); };
    const timer = setTimeout(stop, 620);
    document.addEventListener("keydown", key, true);
    document.addEventListener("visibilitychange", visibility);
    media.addEventListener("change", motion);
    return stop;
  }, [gainedStar]);
  return <span ref={ref} className="awakening-stars" role="img" aria-label={`${stars} étoiles sur 5`}
    style={{ "--awakening-color": `var(--rarity-${rarity})` } as CSSProperties}>
    {[1, 2, 3, 4, 5].map((n) => <span key={n} className="awakening-star" data-star={n} data-on={n <= stars || undefined}>
      <Icon name="etoile" className="awakening-glyph" />
      {n === gainedStar && <><span className="awakening-burst"><Icon name="etoile" /></span>{[0, 1, 2].map((i) => <span key={i} className="awakening-spark"><Icon name="etoile" /></span>)}</>}
    </span>)}
  </span>;
}
