"use client";

import { useEffect } from "react";

/**
 * Pages à fond 3D plein écran : le menu du haut flotte dessus (voir `body.scene-active` dans globals.css).
 * `night` : décor sombre, le menu du haut passe en texte clair.
 */
export function SceneBody({ night = false }: { night?: boolean }) {
  useEffect(() => {
    const classes = night ? ["scene-active", "scene-night"] : ["scene-active"];
    document.body.classList.add(...classes);
    return () => document.body.classList.remove(...classes);
  }, [night]);
  return null;
}
