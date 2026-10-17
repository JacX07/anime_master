"use client";

import { useEffect, useState } from "react";

/** Message envoyé par les scènes 3D (public/pack-opening) à chaque étape de leur démarrage. */
export type SceneProgress = { type: "scene-progress"; p: number; label?: string };
export const isSceneProgress = (d: unknown): d is SceneProgress => (d as SceneProgress | null)?.type === "scene-progress";

/**
 * Écran de chargement des scènes 3D : illustration plein écran et barre qui suit les étapes réelles du démarrage
 * (moteur, décor, images, compilation des shaders). Entre deux étapes, la barre avance doucement d'elle-même sans
 * dépasser la suivante, pour ne pas paraître figée pendant la compilation. Il couvre toute la page, en-tête compris.
 */
export function SceneLoader({ target, label, ready }: { target: number; label?: string; ready: boolean }) {
  // Avance d'attente ajoutée à la dernière étape annoncée (repart de zéro à chaque nouvelle étape)
  const [wait, setWait] = useState({ at: target, c: 0 });
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setWait((w) => (w.at === target ? { at: target, c: w.c + (12 - w.c) * 0.03 } : { at: target, c: 0 })), 100);
    return () => clearInterval(id);
  }, [target]);
  const creep = wait.at === target ? wait.c : 0;

  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => setGone(true), 450); // le temps que la barre file jusqu'au bout
    return () => clearTimeout(id);
  }, [ready]);

  const pct = ready ? 100 : Math.min(97, target + creep);
  return (
    <div className="scene-loader" data-ready={gone} aria-hidden="true">
      <img className="scene-loader-art" src="/loading/foret.webp" srcSet="/loading/foret-960.webp 960w, /loading/foret.webp 1582w" sizes="100vw" alt="" fetchPriority="high" />
      <div className="scene-loader-panel">
        <span className="scene-loader-name">Anime Masters</span>
        <div className="scene-loader-track">
          <span className="scene-loader-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="scene-loader-meta">
          <span>{ready ? "Prêt" : (label ?? "Ouverture de la brèche…")}</span>
          <span>{Math.round(pct)} %</span>
        </div>
      </div>
    </div>
  );
}
