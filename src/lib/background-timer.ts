// Minuterie qui n'est pas ralentie quand l'onglet est masqué : les navigateurs bornent les `setTimeout` d'une page en arrière-plan
// (au mieux un par seconde, puis un par minute), ce qui figerait l'animation d'un combat. Un Worker garde son rythme normal.

let worker: Worker | null | undefined;
let nextId = 1;
const pending = new Map<number, () => void>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    const source = "self.onmessage=function(e){var i=e.data[0],ms=e.data[1];setTimeout(function(){self.postMessage(i)},ms)}";
    const created = new Worker(URL.createObjectURL(new Blob([source], { type: "text/javascript" })));
    created.onmessage = (e: MessageEvent<number>) => {
      const run = pending.get(e.data);
      if (run) { pending.delete(e.data); run(); }
    };
    created.onerror = () => { worker = null; };
    worker = created;
  } catch {
    worker = null; // Workers indisponibles : on retombe sur setTimeout
  }
  return worker;
}

/** Comme `setTimeout`, mais à la bonne vitesse même quand l'onglet est en arrière-plan. Renvoie la fonction d'annulation. */
export function backgroundTimeout(run: () => void, ms: number): () => void {
  const w = typeof window === "undefined" ? null : getWorker();
  if (!w) {
    const t = setTimeout(run, ms);
    return () => clearTimeout(t);
  }
  const id = nextId++;
  pending.set(id, run);
  w.postMessage([id, Math.max(0, ms)]);
  return () => { pending.delete(id); };
}
