"use client";

import { useEffect, useRef, useState } from "react";

/** Combats déjà relancés : l'écran de fin peut être rendu deux fois (bureau et mobile), la relance ne part qu'une fois. */
const relaunched = new Set<string>();

const read = (key: string) => { try { return localStorage.getItem(key) === "on"; } catch { return false; } };
const write = (key: string, on: boolean) => { try { localStorage.setItem(key, on ? "on" : "off"); } catch { /* réglage du moment seulement */ } };

/** Réglages de rejeu gardés d'une visite à l'autre : répéter le combat gagné, et le jouer sans animation. */
export function useRepeatSetting() {
  const [repeat, setRepeat] = useState(false);
  const [instant, setInstant] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRepeat(read("bt-repeat"));
    setInstant(read("bt-instant"));
  }, []);
  return {
    repeat, instant,
    setRepeat: (on: boolean) => { setRepeat(on); write("bt-repeat", on); },
    setInstant: (on: boolean) => { setInstant(on); write("bt-instant", on); },
  };
}
export type RepeatSetting = ReturnType<typeof useRepeatSetting>;

/**
 * Fin d'un combat gagné : « Répéter ce combat » relance le même combat (en auto) après un court délai,
 * tout de suite si l'onglet est en arrière-plan ou sans animation. S'arrête sur une défaite ou une erreur (énergie vide).
 */
export function RepeatControls({ setting, won, battleId, error, onRepeat }: { setting: RepeatSetting; won: boolean; battleId: string; error: string | null; onRepeat: () => void }) {
  const { repeat, instant } = setting;
  const go = repeat && won && !error;
  const [left, setLeft] = useState(3);
  const done = useRef(onRepeat);
  useEffect(() => { done.current = onRepeat; });
  useEffect(() => {
    if (!go) return;
    if (instant || document.hidden || left <= 0) {
      if (relaunched.has(battleId)) return;
      relaunched.add(battleId);
      done.current();
      return;
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [go, instant, left, battleId]);
  return <div className="hs-repeat">
    <label className="hs-chain"><input type="checkbox" checked={repeat} onChange={(e) => setting.setRepeat(e.target.checked)} /> Répéter ce combat automatiquement (combats déjà gagnés)</label>
    <label className="hs-chain"><input type="checkbox" checked={instant} onChange={(e) => setting.setInstant(e.target.checked)} /> Sans animation</label>
    {go && !instant && <p className="hs-countdown" role="timer">Nouveau combat dans {Math.max(left, 0)} s… <button type="button" className="bt-btn" onClick={() => setting.setRepeat(false)}>Arrêter</button></p>}
    {repeat && !won && <p className="hs-team-note">Répétition arrêtée : combat perdu.</p>}
  </div>;
}
