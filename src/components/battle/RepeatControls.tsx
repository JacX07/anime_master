"use client";

import { useEffect, useState } from "react";

const KEY = "bt-fx";
const EVENT = "bt-fx-change";
const readFx = () => { try { return localStorage.getItem(KEY) !== "off"; } catch { return true; } };

/**
 * « Effets de sorts » (v0.3.0) : désactivés, le combat se joue quand même à l'écran (cartes, PV, dégâts),
 * sans les effets visuels des sorts et plus vite. Réglage partagé entre le lecteur et l'écran de fin.
 */
export function useSpellFx() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOn(readFx());
    const sync = () => setOn(readFx());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  const set = (value: boolean) => {
    try { localStorage.setItem(KEY, value ? "on" : "off"); } catch { /* réglage du moment seulement */ }
    setOn(value);
    window.dispatchEvent(new Event(EVENT));
  };
  return [on, set] as const;
}

/** Écran de fin : rejouer le combat avec ou sans effets de sorts (un nouveau combat, nouveau tirage aléatoire). */
export function ReplayOptions({ unlocked = true }: { unlocked?: boolean }) {
  const [fx, setFx] = useSpellFx();
  return <label className="hs-chain"><input type="checkbox" disabled={!unlocked} checked={unlocked && !fx} onChange={(e) => setFx(!e.target.checked)} /> {unlocked ? "Rejouer sans effets de sorts (plus rapide, le combat reste visible)" : "Gagne cette difficulté pour débloquer le rejeu sans effets de sorts"}</label>;
}
