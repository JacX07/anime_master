"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { discardMechanicAction, mergeMechanicAction, startMechanicAction } from "./actions";

interface Job { id: string; characterId: number; wish: string; status: string; branch: string | null; attempts: number; report: string | null; log: string }
const LABEL: Record<string, string> = { queued: "En attente", running: "L'agent travaille…", review: "Prête à valider", failed: "Échec", merged: "Fusionnée" };

/** Demande d'une mécanique absente du moteur : un agent Claude Code l'implémente sur une branche, tu valides. */
export function MechanicPanel({ characterId }: { characterId: number }) {
  const router = useRouter();
  const [wish, setWish] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [, start] = useTransition();

  const load = useCallback(async () => {
    const r = await fetch("/api/builder/jobs", { cache: "no-store" });
    if (r.ok) setJobs((await r.json()).jobs);
  }, []);
  const active = jobs.some((j) => j.status === "queued" || j.status === "running");
  useEffect(() => {
    const first = setTimeout(load, 0);
    if (!active) return () => clearTimeout(first);
    const t = setInterval(load, 3000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [load, active]);

  const run = (f: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      const r = await f();
      setMsg(r.ok ? "" : (r.error ?? "Erreur"));
      await load();
      if (r.ok) after?.();
    });

  return (
    <details className="sb-mech" open={jobs.length > 0 || undefined}>
      <summary>Mécanique sur mesure (implémentée par l&apos;IA)</summary>
      <p className="sb-desc">
        Décris le sort voulu. Si les effets existants ne suffisent pas, un agent Claude Code ajoute la mécanique au moteur sur une branche séparée, lance les garde-fous (typecheck, lint, check:spells/battle/replay, combats existants inchangés), simule un brouillon et te fait un retour. Rien n&apos;est fusionné sans ton accord. Compte quelques minutes.
      </p>
      <textarea rows={3} value={wish} onChange={(e) => setWish(e.target.value)} placeholder="Ex. : vole 10 % des PV max de l'ennemi le plus fort et les donne à l'allié le plus blessé, une fois par combat" />
      <div className="sb-actions">
        <button type="button" className="bt-btn" disabled={wish.trim().length < 10}
          onClick={() => run(() => startMechanicAction(characterId, wish), () => setWish(""))}>Implémenter</button>
        {msg && <span className="sb-err">{msg}</span>}
      </div>
      {jobs.map((j) => (
        <article key={j.id} className="sb-job" data-status={j.status}>
          <header>
            <strong>{LABEL[j.status] ?? j.status}</strong> <span>— perso #{j.characterId}{j.attempts ? `, tentative ${j.attempts}` : ""}{j.branch ? ` — ${j.branch}` : ""}</span>
          </header>
          <p>{j.wish}</p>
          {j.report && <pre>{j.report}</pre>}
          {open === j.id && <pre>{j.log}</pre>}
          <div className="sb-actions">
            <button type="button" className="bt-btn" onClick={() => setOpen(open === j.id ? null : j.id)}>Journal</button>
            {j.status === "review" && (
              <button type="button" className="bt-btn sb-go" onClick={() => run(() => mergeMechanicAction(j.id), () => router.refresh())}>Valider (fusionner dans main)</button>
            )}
            {(j.status === "review" || j.status === "failed") && (
              <button type="button" className="bt-btn" onClick={() => run(() => discardMechanicAction(j.id))}>Rejeter</button>
            )}
          </div>
        </article>
      ))}
    </details>
  );
}
