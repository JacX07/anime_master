"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fond 3D du menu d'accueil dans une iframe, avec un écran de chargement qui s'efface quand la scène a fini de
 * compiler ses shaders (message `scene-ready`). Le menu, lui, reste affiché et utilisable par-dessus.
 */
export function SceneFrame({ src }: { src: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onMessage = (e: MessageEvent<{ type?: string }>) => {
      if (e.origin !== location.origin || e.source !== frame.current?.contentWindow || e.data?.type !== "scene-ready") return;
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
      <div className="scene-loader scene-loader-under" data-ready={ready} aria-hidden="true">
        <span className="scene-loader-bar" />
      </div>
    </>
  );
}
