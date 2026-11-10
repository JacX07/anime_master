"use client";

import { useEffect, useState } from "react";
import { packAudio } from "@/lib/pack-audio";

export const AUDIO_PREF_EVENT = "am-audio-pref";
const INTERACTIVE = "a[href], button, summary, [role=button], [role=radio], [role=tab], [role=menuitem], label[for], .flip";
// Ces éléments jouent leur propre son (ouverture de paquet, retournement des cartes, bouton d'ambiance)
const OWN_SOUND = ".pk-open, .flip, .ambient-toggle, .ambient-ui, .awaken-action";
const PRIMARY = ".pk-open, .vt-btn, .site-cta, .mq-header-cta, .mq-play-button, .bt-play, .daily-bonus, .gear-upgrade, .gear-equip, .mq-sell-button, [type=submit]";

/** Sons du site : musique d'ambiance (démarre au premier clic, se coupe en combat) et sons d'interface (survol, clic, sélection). */
export function AmbientSound() {
  const [music, setMusic] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Préférences localStorage relues après hydratation pour garder le HTML serveur stable.
    setMusic(packAudio.ambienceWanted);
    packAudio.uiOn = packAudio.uiWanted;
  }, []);

  // La page Paramètres change les préférences : elle prévient ici pour démarrer ou couper l'ambiance.
  useEffect(() => {
    const sync = () => { setMusic(packAudio.ambienceWanted); };
    window.addEventListener(AUDIO_PREF_EVENT, sync);
    return () => window.removeEventListener(AUDIO_PREF_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!music) return;
    let started = packAudio.unlocked;
    const start = () => {
      started = true;
      packAudio.startAmbience();
    };
    // Un combat joue sa propre musique : l'ambiance s'efface tant qu'il est à l'écran
    const watch = window.setInterval(() => {
      if (document.querySelector(".bt-head") !== null) packAudio.pauseAmbience();
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
  }, [music]);

  useEffect(() => {
    const target = (e: Event) => (e.target instanceof Element ? e.target.closest(INTERACTIVE) : null);
    const over = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = target(e);
      if (!el || (e.relatedTarget instanceof Node && el.contains(e.relatedTarget))) return;
      if ((el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") return;
      packAudio.uiHover();
    };
    const click = (e: MouseEvent) => {
      const el = target(e);
      if (!el || el.closest(OWN_SOUND)) return;
      if ((el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") return packAudio.uiDenied();
      if (el.matches(PRIMARY)) return packAudio.uiConfirm();
      if (el.matches("[role=radio], [role=tab], [aria-pressed], [aria-current], [data-active], summary")) return packAudio.uiSelect();
      if (el.matches("a[href]")) return packAudio.uiNav();
      packAudio.uiClick();
    };
    // Listes déroulantes fermées (flèches du clavier) : un tic à chaque option franchie au clavier ou validée (le survol du menu ouvert n'émet aucun évènement)
    const tick = (e: Event) => {
      if (e.target instanceof HTMLSelectElement && !e.target.disabled) packAudio.uiTick();
    };
    const arrows = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(e.key)) tick(e);
    };
    document.addEventListener("keydown", arrows, true);
    document.addEventListener("change", tick, true);
    const unlock = () => packAudio.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    document.addEventListener("pointerover", over, true);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("pointerover", over, true);
      document.removeEventListener("click", click, true);
      document.removeEventListener("keydown", arrows, true);
      document.removeEventListener("change", tick, true);
    };
  }, []);

  return null;
}
