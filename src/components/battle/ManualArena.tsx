"use client";

import { useState, useTransition } from "react";
import { abandonBattleAction, playActionAction, setAttackTeamAction, startBattleAction } from "@/app/battle-actions";
import type { Spell, UnitId } from "@/lib/battle";
import type { BattleView } from "@/lib/battles";
import { BattlePlayer, type PlayerCharacter } from "./BattlePlayer";

interface Props {
  /** Combat manuel resté ouvert (reprise après un rechargement) */
  initial: BattleView | null;
  /** Les 4 meilleures cartes du joueur, pour remplir l'équipe d'attaque d'un clic */
  bestCardIds: string[];
  teamReady: boolean;
}

const NAMES = { A: "Ton équipe", B: "Équipe d'essai" };

/** Combat manuel contre l'équipe d'essai : le serveur garde les choix, l'écran rejoue les événements au fur et à mesure. */
export function ManualArena({ initial, bestCardIds, teamReady: ready }: Props) {
  const [view, setView] = useState<BattleView | null>(initial);
  const [log, setLog] = useState(initial?.log ?? []);
  const [teamReady, setTeamReady] = useState(ready);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const adopt = (v: BattleView) => {
    setView(v);
    setLog(v.log);
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
      const r = await startBattleAction("test", true);
      if (r.ok) adopt(r.battle);
      else setError(r.error);
    });

  const play = (spell: Spell, target: UnitId | null) =>
    start(async () => {
      if (!view) return;
      const r = await playActionAction(view.id, { spell, target });
      if (!r.ok) return setError(r.error);
      setError(null);
      // Seuls les nouveaux événements sont renvoyés ; le journal s'allonge
      setLog((l) => [...l, ...r.battle.log]);
      setView((v) => (v ? { ...v, status: r.battle.status, winner: r.battle.winner, actor: r.battle.actor, choices: r.battle.choices } : v));
    });

  const abandon = () =>
    start(async () => {
      if (!view) return;
      const r = await abandonBattleAction(view.id);
      if (r.ok) {
        setView(null);
        setLog([]);
      } else setError(r.error);
    });

  if (!view) {
    return (
      <div className="vt-card" style={{ display: "grid", gap: "0.8rem", maxWidth: "36rem" }}>
        {teamReady ? (
          <p className="vt-muted">Ton équipe d&apos;attaque est prête. À chaque action, tu choisis le sort et la cible ; l&apos;adversaire joue seul.</p>
        ) : bestCardIds.length === 4 ? (
          <p className="vt-muted">Tu n&apos;as pas encore d&apos;équipe d&apos;attaque. Utilise tes 4 cartes les plus puissantes (4 personnages différents).</p>
        ) : (
          <p className="vt-muted">Il te faut au moins 4 personnages différents pour te battre. Ouvre des paquets !</p>
        )}
        {error && <p className="bt-error" role="alert">{error}</p>}
        <div>
          {teamReady ? (
            <button type="button" className="bt-btn" onClick={launch} disabled={pending}>
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
    <>
      <BattlePlayer
        key={view.id}
        log={log}
        characters={characters}
        names={NAMES}
        live={{
          actor: view.actor,
          choices: view.choices,
          busy: pending,
          error,
          onPlay: play,
          onNext: () => {
            setView(null);
            setLog([]);
            setError(null);
          },
        }}
      />
      {view.status === "RUNNING" && (
        <p style={{ textAlign: "center", marginTop: "0.8rem" }}>
          <button type="button" className="bt-btn" onClick={abandon} disabled={pending}>
            Abandonner (compté comme perdu)
          </button>
        </p>
      )}
    </>
  );
}
