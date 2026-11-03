/** Coupe le son d'un contexte audio quand la page passe en arrière-plan (onglet changé, navigateur quitté sur mobile) et le relance au retour. */
export function suspendWhenHidden(ctx: AudioContext) {
  let paused = false;
  const sync = () => {
    if (ctx.state === "closed") return document.removeEventListener("visibilitychange", sync);
    if (document.hidden) {
      if (ctx.state === "running") { paused = true; ctx.suspend().catch(() => {}); }
    } else if (paused) {
      paused = false;
      ctx.resume().catch(() => {});
    }
  };
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("pagehide", sync);
}
