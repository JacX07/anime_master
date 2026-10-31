"use client";

import { useEffect, useState, useTransition } from "react";
import { abandonBattleAction, getBattleAction, setAttackTeamAction, startBattleAction } from "@/app/battle-actions";
import type { BattleView } from "@/lib/battles";
import { LiveBattle } from "./LiveBattle";

export interface OpponentChoice {
  key: string;
  name: string;
  hint: string;
}

interface Props {
  /** Combat resté ouvert (reprise après un rechargement ou après la croix) */
  initial: BattleView | null;
  /** Les 4 meilleures cartes du joueur, pour remplir l'équipe d'attaque d'un clic */
  bestCardIds: string[];
  teamReady: boolean;
  opponents: OpponentChoice[];
}

/** Écran de combat : choix de l'adversaire et du mode de départ (Auto ou Manuel, modifiable en route), reprise d'un combat ouvert, puis le lecteur. */
export function BattleArena({ initial, bestCardIds, teamReady: ready, opponents }: Props) {
  const [view, setView] = useState<BattleView | null>(null);
  const [open, setOpen] = useState(initial);
  const [auto, setAuto] = useState(false);
  const [teamReady, setTeamReady] = useState(ready);
  const [opponent, setOpponent] = useState(opponents[0].key);
  const [manual, setManual] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Dernier réglage Auto / Manuel (modifié en plein combat) et dernier adversaire
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setManual(localStorage.getItem("bt-auto") === "off");
    const last = localStorage.getItem("bt-opponent");
    if (last && opponents.some((o) => o.key === last)) setOpponent(last);
  }, [opponents]);

  const opponentName = (key: string) => opponents.find((o) => o.key === key)?.name ?? key;
  const backToMenu = () => {
    setView(null);
    setOpen(null);
    setError(null);
  };

  const fillTeam = () =>
    start(async () => {
      const r = await setAttackTeamAction(bestCardIds);
      if (r.ok) setTeamReady(true);
      else setError(r.error);
    });

  const launch = () =>
    start(async () => {
      // Tous les combats sont suivis par le serveur : l'auto n'est qu'un réglage qu'on peut changer en route
      const r = await startBattleAction(opponent, true);
      if (!r.ok) return setError(r.error);
      setAuto(!manual);
      localStorage.setItem("bt-auto", manual ? "off" : "on");
      localStorage.setItem("bt-opponent", opponent);
      setView(r.battle);
      setError(null);
    });

  const abandonOpen = () =>
    start(async () => {
      if (!open) return;
      const r = await abandonBattleAction(open.id);
      if (r.ok) setOpen(null);
      else setError(r.error);
    });

  if (view) {
    return (
      <LiveBattle
        key={view.id}
        initial={view}
        initialAuto={auto}
        names={{ A: "Ton équipe", B: opponentName(view.opponent) }}
        // La croix laisse le combat ouvert : on le retrouve dans le menu pour le reprendre
        onExit={() =>
          start(async () => {
            const r = await getBattleAction(view.id);
            setOpen(r.ok && r.battle.status === "RUNNING" ? r.battle : null);
            setView(null);
          })
        }
        onNext={backToMenu}
      />
    );
  }

  return (
    <div className="vt-card" style={{ display: "grid", gap: "1rem", maxWidth: "40rem" }}>
      {open && (
        <div className="bt-choice" data-on style={{ display: "grid", gap: "0.5rem" }}>
          <b>Combat en cours contre {opponentName(open.opponent)}</b>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="bt-btn bt-play"
              onClick={() => {
                setAuto(false);
                setView(open);
              }}
            >
              Reprendre
            </button>
            <button type="button" className="bt-btn" onClick={abandonOpen} disabled={pending}>
              Abandonner
            </button>
          </div>
        </div>
      )}
      <fieldset className="bt-pick">
        <legend>Adversaire</legend>
        {opponents.map((o) => (
          <label key={o.key} className="bt-choice" data-on={opponent === o.key || undefined}>
            <input type="radio" name="opponent" checked={opponent === o.key} onChange={() => setOpponent(o.key)} />
            <b>{o.name}</b>
            <small>{o.hint}</small>
          </label>
        ))}
      </fieldset>
      <fieldset className="bt-pick">
        <legend>Mode de départ (modifiable en plein combat)</legend>
        <label className="bt-choice" data-on={!manual || undefined}>
          <input type="radio" name="mode" checked={!manual} onChange={() => setManual(false)} />
          <b>Automatique</b>
          <small>Ton équipe joue seule, tu regardes.</small>
        </label>
        <label className="bt-choice" data-on={manual || undefined}>
          <input type="radio" name="mode" checked={manual} onChange={() => setManual(true)} />
          <b>Manuel</b>
          <small>À chaque action, tu choisis le sort et la cible.</small>
        </label>
      </fieldset>
      {teamReady ? null : bestCardIds.length === 4 ? (
        <p className="vt-muted">Tu n&apos;as pas encore d&apos;équipe d&apos;attaque. Utilise tes 4 cartes les plus puissantes (4 personnages différents).</p>
      ) : (
        <p className="vt-muted">Il te faut au moins 4 personnages différents pour te battre. Ouvre des paquets !</p>
      )}
      {error && (
        <p className="bt-error" role="alert">
          {error}
        </p>
      )}
      <div>
        {teamReady ? (
          <button type="button" className="bt-btn bt-play" onClick={launch} disabled={pending || !!open}>
            Lancer le combat
          </button>
        ) : (
          bestCardIds.length === 4 && (
            <button type="button" className="bt-btn" onClick={fillTeam} disabled={pending}>
              Utiliser mes 4 meilleures cartes
            </button>
          )
        )}
        {open && <small className="vt-muted"> Reprends ou abandonne le combat en cours avant d&apos;en lancer un autre.</small>}
      </div>
    </div>
  );
}
