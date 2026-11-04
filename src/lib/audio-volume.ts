// Volume général du site (0 à 1), gardé dans le navigateur et partagé par les sons du site et ceux du combat.

const KEY = "am-volume";
export const VOLUME_EVENT = "am-volume-change";
/** Un peu plus bas que l'ancien niveau fixe (les sons étaient jugés trop forts). */
export const DEFAULT_VOLUME = 0.7;

export function getVolume(): number {
  try {
    const raw = localStorage.getItem(KEY);
    const n = raw === null ? DEFAULT_VOLUME : Number(raw);
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : DEFAULT_VOLUME;
  } catch { return DEFAULT_VOLUME; }
}

export function setVolume(v: number) {
  const value = Math.min(1, Math.max(0, v));
  try { localStorage.setItem(KEY, String(value)); } catch { /* stockage indisponible */ }
  window.dispatchEvent(new Event(VOLUME_EVENT));
}

/** Appelle `fn` à chaque changement de volume (autre onglet compris) ; renvoie la fonction d'arrêt. */
export function onVolumeChange(fn: (v: number) => void): () => void {
  const handler = () => fn(getVolume());
  window.addEventListener(VOLUME_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => { window.removeEventListener(VOLUME_EVENT, handler); window.removeEventListener("storage", handler); };
}
