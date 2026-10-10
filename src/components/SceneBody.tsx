"use client";

import { useEffect } from "react";

/** Pages à fond 3D plein écran : le menu du haut flotte dessus (voir `body.scene-active` dans globals.css). */
export function SceneBody() {
  useEffect(() => {
    document.body.classList.add("scene-active");
    return () => document.body.classList.remove("scene-active");
  }, []);
  return null;
}
