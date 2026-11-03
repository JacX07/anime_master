"use client";

import { useEffect, useState } from "react";
import { packAudio } from "@/lib/pack-audio";
import { AUDIO_PREF_EVENT } from "./AmbientSound";

/** Réglages du son : musique d'ambiance et sons des boutons (préférences gardées dans le navigateur). */
export function AudioSettings() {
  const [music, setMusic] = useState(true);
  const [ui, setUi] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Préférences localStorage relues après hydratation pour garder le HTML serveur stable.
    setMusic(packAudio.ambienceWanted);
    setUi(packAudio.uiWanted);
  }, []);
  const change = (kind: "music" | "ui") => {
    const next = kind === "music" ? !music : !ui;
    if (kind === "music") { setMusic(next); packAudio.setAmbience(next); } else { setUi(next); packAudio.setUi(next); }
    window.dispatchEvent(new Event(AUDIO_PREF_EVENT));
  };
  return (
    <ul className="settings-list">
      <li>
        <span><b>Ambiances</b><small>Musique d’ambiance du site. Elle s’efface pendant les combats.</small></span>
        <button type="button" className="ambient-toggle" aria-pressed={music} onClick={() => change("music")}>{music ? "♪ Ambiance activée" : "♪ Muet"}</button>
      </li>
      <li>
        <span><b>Effets</b><small>Sons des boutons, du survol et des sélections.</small></span>
        <button type="button" className="ambient-toggle ambient-ui" aria-pressed={ui} onClick={() => change("ui")}>{ui ? "◈ Effets activés" : "◈ Sans effets"}</button>
      </li>
    </ul>
  );
}
