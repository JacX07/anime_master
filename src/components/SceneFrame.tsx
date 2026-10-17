"use client";

import { useEffect, useRef, useState } from "react";
import { isSceneProgress, SceneLoader } from "./SceneLoader";

/**
 * Fond 3D du menu d'accueil dans une iframe, avec un écran de chargement (barre suivant les étapes envoyées par la scène) qui s'efface quand la scène a fini de
 * compiler ses shaders (message `scene-ready`).
 */
export function SceneFrame({ src }: { src: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState<{ p: number; label?: string }>({ p: 0 });

  useEffect(() => {
    const onMessage = (e: MessageEvent<{ type?: string }>) => {
      if (e.origin !== location.origin || e.source !== frame.current?.contentWindow) return;
      if (isSceneProgress(e.data)) return setProgress({ p: e.data.p, label: e.data.label });
      if (e.data?.type !== "scene-ready") return;
      setReady(true);
      frame.current?.contentWindow?.postMessage({ type: "scene-ack" }, location.origin);
    };
    window.addEventListener("message", onMessage);
    const fallback = setTimeout(() => setReady(true), 20_000); // sans WebGL, on ne reste pas bloqué sur le chargement
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(fallback);
    };
  }, []);

  return (
    <>
      <iframe ref={frame} src={src} title="" aria-hidden="true" tabIndex={-1} className="gm-bg" />
      <SceneLoader target={progress.p} label={progress.label} ready={ready} />
    </>
  );
}
