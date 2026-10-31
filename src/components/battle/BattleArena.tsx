"use client";

import { useRef, useState, useTransition } from "react";
import { abandonBattleAction, playActionAction, playAutoAction, setAttackTeamAction, startBattleAction } from "@/app/battle-actions";
import type { Spell, UnitId } from "@/lib/battle";
import type { BattleView } from "@/lib/battles";
import { BattlePlayer, type PlayerCharacter } from "./BattlePlayer";

export interface OpponentChoice {
  key: string;
  name: string;
  hint: string;
}

interface Props {
  /** Combat manuel resté ouvert (reprise après un rechargement) */
  initial: BattleView | null;
  /** Les 4 meilleures cartes du joueur, pour remplir l'équipe d'attaque d'un clic */
  bestCardIds: string[];
  teamReady: boolean;
  opponents: OpponentChoice[];
}

/** Écran de combat : choix de l'adversaire et du mode (automatique ou manuel), puis le lecteur. En manuel le serveur garde les choix et l'écran rejoue les événements au fur et à mesure. */
export function BattleArena({ initial, bestCardIds, teamReady: ready, opponents }: Props) {
  const [view, setView] = useState<BattleView | null>(initial);
  const [log, setLog] = useState(initial?.log ?? []);
  const [teamReady, setTeamReady] = useState(ready);
  const [opponent, setOpponent] = useState(initial?.opponent ?? opponents[0].key);
  // Choix du mode au lancement ; pendant le combat, `auto` se change à tout moment
  const [manual, setManual] = useState(true);
  const [auto, setAuto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const opponentName = (key: string) => opponents.find((o) => o.key === key)?.name ?? key;

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
      setView(r.battle);
      setLog(r.battle.log);
      setError(null);
    });

  const play = (spell: Spell, target: UnitId | null) =>
    start(async () => {
      if (!view) return;
      const r = await playActionAction(view.id, { spell, target });
      if (!r.ok) return setError(r.error);
      setError(null);
      // Seuls les nouveaux événements sont renvoyés ; le journal s'allonge
      setLog((l) => [...l, ...r.battle.log]);
      setView((v) => (v ? { ...v, status: r.battle.status, winner: r.battle.winner, actor: r.battle.actor, choices: r.battle.choices, wait: r.battle.wait } : v));
    });

  // Auto : le serveur joue l'action de ta carte. Une seule requête à la fois (le lecteur peut redemander à chaque rendu).
  const inflight = useRef(false);
  const autoStep = () => {
    if (!view || inflight.current) return;
    inflight.current = true;
    start(async () => {
      try {
        const r = await playAutoAction(view.id);
        if (!r.ok) {
          setAuto(false);
          return setError(r.error);
        }
        setError(null);
        setLog((l) => [...l, ...r.battle.log]);
        setView((v) => (v ? { ...v, status: r.battle.status, winner: r.battle.winner, actor: r.battle.actor, choices: r.battle.choices, wait: r.battle.wait } : v));
      } finally {
        inflight.current = false;
      }
    });
  };

  const backToMenu = () => {
    setView(null);
    setLog([]);
    setError(null);
  };

  const abandon = () =>
    start(async () => {
      if (!view) return;
      const r = await abandonBattleAction(view.id);
      if (r.ok) backToMenu();
      else setError(r.error);
    });

  if (!view) {
    return (
      <div className="vt-card" style={{ display: "grid", gap: "1rem", maxWidth: "40rem" }}>
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
            <small>Le combat est joué pour toi, tu le regardes.</small>
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
            <button type="button" className="bt-btn bt-play" onClick={launch} disabled={pending}>
              Lancer le combat
            </button>
          ) : (
            bestCardIds.length === 4 && (
              <button type="button" className="bt-btn" onClick={fillTeam} disabled={pending}>
                Utiliser mes 4 meilleures cartes
              </button>
            )
          )}
        </div>
      </div>
    );
  }

  // Rareté et type viennent du journal ; nom et image de la base
  const characters: Record<number, PlayerCharacter> = {};
  const first = log[0];
  if (first?.kind === "start") {
    for (const u of first.units) {
      const c = view.characters[u.characterId];
      characters[u.characterId] = { name: c?.name ?? "?", imageUrl: c?.imageUrl ?? "", rarity: u.rarity, type: u.type };
    }
  }

  return (
    <BattlePlayer
      key={view.id}
      log={log}
      characters={characters}
      names={{ A: "Ton équipe", B: opponentName(view.opponent) }}
      exitHref="/combat"
      live={
        view.manual
          ? {
              actor: view.actor,
              choices: view.choices,
              wait: view.wait,
              busy: pending,
              error,
              onPlay: play,
              onAbandon: view.status === "RUNNING" ? abandon : undefined,
              auto,
              onToggleAuto: () => setAuto((a) => !a),
              onAutoStep: autoStep,
              onNext: backToMenu,
            }
          : undefined
      }
      onNext={view.manual ? undefined : backToMenu}
    />
  );
}
