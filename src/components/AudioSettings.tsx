"use client";

import { useEffect, useState } from "react";
import { getVolume, setVolume } from "@/lib/audio-volume";
import { packAudio } from "@/lib/pack-audio";
import { AUDIO_PREF_EVENT } from "./AmbientSound";

/** Réglages du son : musique d'ambiance et sons des boutons (préférences gardées dans le navigateur). */
export function AudioSettings() {
  const [music, setMusic] = useState(true);
  const [ui, setUi] = useState(true);
  const [volume, setVolumeState] = useState(70);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Préférences localStorage relues après hydratation pour garder le HTML serveur stable.
    setMusic(packAudio.ambienceWanted);
    setUi(packAudio.uiWanted);
    setVolumeState(Math.round(getVolume() * 100));
  }, []);
  const change = (kind: "music" | "ui") => {
    const next = kind === "music" ? !music : !ui;
    if (kind === "music") { setMusic(next); packAudio.setAmbience(next); } else { setUi(next); packAudio.setUi(next); }
    window.dispatchEvent(new Event(AUDIO_PREF_EVENT));
  };
  const changeVolume = (v: number) => { setVolumeState(v); setVolume(v / 100); };
  return (
    <ul className="settings-list">
      <li>
        <span><b>Volume général</b><small>Règle le niveau de tous les sons du site, combats compris.</small></span>
        <label className="settings-volume"><input type="range" min={0} max={100} step={5} value={volume} aria-label="Volume général" onChange={(e) => changeVolume(Number(e.target.value))} onPointerUp={() => packAudio.uiConfirm()} onKeyUp={() => packAudio.uiConfirm()} /><output>{volume} %</output></label>
      </li>
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
