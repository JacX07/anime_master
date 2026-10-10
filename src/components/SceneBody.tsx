"use client";

import { useEffect } from "react";

/**
 * Pages à fond 3D plein écran : le menu du haut flotte dessus (voir `body.scene-active` dans globals.css).
 * `night` : décor sombre, le menu du haut passe en texte clair.
 * `scroll` : page qui défile (pas de plein écran fixe ni de menu flottant).
 */
export function SceneBody({ night = false, scroll = false }: { night?: boolean; scroll?: boolean }) {
  useEffect(() => {
    const classes = [...(scroll ? [] : ["scene-active"]), ...(night ? ["scene-night"] : [])];
    document.body.classList.add(...classes);
    return () => document.body.classList.remove(...classes);
  }, [night, scroll]);
  return null;
}
