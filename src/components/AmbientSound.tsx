"use client";

import { useEffect, useState } from "react";
import { packAudio } from "@/lib/pack-audio";

/** Musique d'ambiance sur tout le site : démarre au premier clic (règle des navigateurs), se coupe pendant un combat. */
export function AmbientSound() {
  const [on, setOn] = useState(false);

  useEffect(() => setOn(packAudio.ambienceWanted), []);

  useEffect(() => {
    if (!on) return;
    let started = packAudio.unlocked;
    const start = () => {
      started = true;
      packAudio.startAmbience();
    };
    // Un combat joue sa propre musique : l'ambiance s'efface tant qu'il est à l'écran
    const watch = window.setInterval(() => {
      const fighting = document.querySelector(".bt-head") !== null;
      if (fighting) packAudio.pauseAmbience();
      else if (started) packAudio.startAmbience();
    }, 1000);
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    return () => {
      window.clearInterval(watch);
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
      packAudio.pauseAmbience();
    };
  }, [on]);

  return (
    <button type="button" className="ambient-toggle" aria-pressed={on} onClick={() => { const next = !on; setOn(next); packAudio.setAmbience(next); }} title="Musique d'ambiance">
      {on ? "♪ Ambiance" : "♪ Muet"}
    </button>
  );
}
