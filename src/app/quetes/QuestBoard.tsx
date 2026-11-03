"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { getAdventure } from "@/lib/adventure-state";
import { Icon } from "@/components/icons";
import { claimPeriodicQuestAction } from "./actions";

/** Quête quotidienne ou hebdomadaire, prête à afficher (dates déjà résolues côté serveur). */
export type PeriodicQuestView = {
  key: string; period: "daily" | "weekly"; title: string; description: string;
  target: number; progress: number; crystals: number; claimed: boolean; claimable: boolean;
};

const PERIODS = [["daily", "Quotidiennes", "Se remettent à zéro chaque jour à minuit."], ["weekly", "Hebdomadaires", "Se remettent à zéro chaque lundi à minuit."]] as const;

export function QuestBoard({ state, quests }: { state: Awaited<ReturnType<typeof getAdventure>>; quests: PeriodicQuestView[] }) {
  const router = useRouter();
  const [period, setPeriod] = useState<"daily" | "weekly">("daily");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const nextMode = state.modes.find((m) => !m.unlocked);
  const waiting = (p: "daily" | "weekly") => quests.filter((q) => q.period === p && q.claimable).length;
  const shown = quests.filter((q) => q.period === period);
  const claimable = quests.filter((q) => q.claimable);

  const claim = (keys: string[]) => start(async () => {
    setError(null);
    for (const key of keys) {
      const r = await claimPeriodicQuestAction(key);
      if (!r.ok) { setError(r.error); break; }
    }
    router.refresh();
  });

  return <>
    <section className="quest-identity"><div><p className="quest-kicker">{state.rank.name}</p><h2>Arpenteur niveau {state.level}</h2><p>{state.rank.lore}</p></div><div className="quest-xp"><b>{state.xp.toLocaleString("fr-FR")} XP</b><progress aria-label="Progression vers le prochain niveau" value={state.next === null ? 1 : state.xp - state.floor} max={state.next === null ? 1 : state.next - state.floor} /><small>{state.next === null ? "Empreinte au niveau maximal" : `${state.next - state.xp} XP avant le niveau ${state.level + 1}`}</small></div></section>
    {nextMode && <section className="quest-next"><div><p className="quest-kicker">Prochain passage</p><h2>{nextMode.label}</h2><p>{nextMode.lore}</p></div><p>Niveau {nextMode.level} {state.level >= nextMode.level ? "✓" : `· actuel ${state.level}`}</p><Link href="/histoire" className="ui-button">Continuer l’histoire</Link></section>}
    <section aria-label="Quêtes périodiques">
      <div className="qp-head">
        <div className="qp-tabs" role="tablist" aria-label="Période">
          {PERIODS.map(([key, label]) => (
            <button key={key} type="button" role="tab" className="ui-button" aria-selected={period === key} data-active={period === key} onClick={() => setPeriod(key)}>
              {label}{waiting(key) > 0 && <span className="qp-badge" aria-label={`${waiting(key)} à récupérer`}>{waiting(key)}</span>}
            </button>
          ))}
        </div>
        {claimable.length > 1 && <button type="button" className="ui-button" data-active="true" disabled={busy} onClick={() => claim(claimable.map((q) => q.key))}>Tout récupérer ({claimable.length})</button>}
      </div>
      <p className="qp-sub">{PERIODS.find(([k]) => k === period)![2]}</p>
      {error && <p role="alert" className="qp-error">{error}</p>}
      <ul className="qp-list">
        {shown.map((q) => (
          <li key={q.key} data-ready={q.claimable} data-claimed={q.claimed}>
            <div className="qp-meta">
              <b>{q.title}</b>
              <small>{q.progress} / {q.target}</small>
              {!q.claimable && !q.claimed && <i className="qp-bar"><b style={{ width: `${Math.round((q.progress / q.target) * 100)}%` }} /></i>}
            </div>
            <span className="qp-reward"><Icon name="cristal" />+{q.crystals}</span>
            {q.claimable ? <button type="button" className="claim-button" disabled={busy} onClick={() => claim([q.key])}><span aria-hidden="true" className="claim-dot" />Récupérer</button>
              : q.claimed ? <span className="qp-state qp-done">✓ Récupérée</span>
              : <span className="qp-state">En cours</span>}
          </li>
        ))}
      </ul>
      {!shown.length && <p className="qp-sub">Aucune quête pour le moment.</p>}
    </section>
    <p className="quest-note">Chaque niveau d’Arpenteur atteint rapporte 25 Ryō, avec 100 Ryō supplémentaires tous les dix niveaux ; le versement est automatique.</p>
  </>;
}
