"use client";

import { useRef, useState, useTransition } from "react";
import { abandonBattleAction, playActionAction, playAutoAction } from "@/app/battle-actions";
import type { Spell, UnitId } from "@/lib/battle";
import type { BattleView } from "@/lib/battles";
import { BattlePlayer, type PlayerCharacter } from "./BattlePlayer";

interface Props {
  /** Combat déjà créé côté serveur (lancé en mode suivi : Auto et Manuel sont un simple réglage) */
  initial: BattleView;
  /** Réglage de départ : l'équipe joue seule */
  initialAuto: boolean;
  names: { A: string; B: string };
  title?: string;
  /** Appelé quand la lecture arrive au bout du combat, avec le combat final (butin compris) */
  onEnd?: (view: BattleView) => void;
  /** Écran de fin fourni par la page (résultat, butin, boutons) ; sinon l'écran par défaut avec « Nouveau combat » */
  renderEnd?: (view: BattleView) => React.ReactNode;
  /** Croix « Quitter » : lien (le combat reste ouvert, on le reprend plus tard) */
  exitHref?: string;
  /** Croix « Quitter » : fonction ; abandonne d'abord le combat s'il est en cours si `abandonOnExit` */
  onExit?: () => void;
  abandonOnExit?: boolean;
  /** « Nouveau combat » de l'écran de fin par défaut, et retour après un abandon */
  onNext?: () => void;
}

/** Combat suivi par le serveur : chaque choix du joueur (ou l'action automatique) est enregistré, l'écran rejoue les nouveaux événements. */
export function LiveBattle({ initial, initialAuto, names, title, onEnd, renderEnd, exitHref, onExit, abandonOnExit, onNext }: Props) {
  const [view, setView] = useState(initial);
  const [log, setLog] = useState(initial.log);
  const [auto, setAuto] = useState(initialAuto);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Une seule requête à la fois (le lecteur peut redemander à chaque rendu)
  const inflight = useRef(false);

  const apply = (next: BattleView) => {
    setError(null);
    setLog((l) => [...l, ...next.log]);
    setView((v) => ({ ...v, status: next.status, winner: next.winner, loot: next.loot, actor: next.actor, choices: next.choices, wait: next.wait }));
  };

  const send = (call: () => ReturnType<typeof playAutoAction>) => {
    if (inflight.current) return;
    inflight.current = true;
    start(async () => {
      try {
        const r = await call();
        if (!r.ok) {
          setAuto(false);
          return setError(r.error);
        }
        apply(r.battle);
      } finally {
        inflight.current = false;
      }
    });
  };

  const play = (spell: Spell, target: UnitId | null) => send(() => playActionAction(view.id, { spell, target }));
  const autoStep = () => send(() => playAutoAction(view.id));

  const abandon = (then?: () => void) =>
    start(async () => {
      const r = await abandonBattleAction(view.id);
      if (r.ok) then?.();
      else setError(r.error);
    });

  // Rareté et type viennent du journal ; nom et image de la base
  const characters: Record<number, PlayerCharacter> = {};
  const first = log[0];
  if (first?.kind === "start") {
    for (const u of first.units) {
      const c = view.characters[u.characterId];
      characters[u.characterId] = { name: c?.name ?? "?", imageUrl: c?.imageUrl ?? "", rarity: u.rarity, type: u.type };
    }
  }

  const running = view.status === "RUNNING";
  return (
    <BattlePlayer
      key={view.id}
      log={log}
      characters={characters}
      names={names}
      title={title}
      exitHref={exitHref}
      onExit={onExit ? () => (abandonOnExit && running ? abandon(onExit) : onExit()) : undefined}
      onEnd={onEnd ? () => onEnd(view) : undefined}
      onNext={onNext}
      endExtra={renderEnd ? renderEnd(view) : undefined}
      live={{
        actor: view.actor,
        choices: view.choices,
        wait: view.wait,
        busy: pending,
        error,
        onPlay: play,
        onAbandon: running ? () => abandon(onExit ?? onNext) : undefined,
        auto,
        onToggleAuto: () => setAuto((a) => !a),
        onAutoStep: autoStep,
        onNext,
      }}
    />
  );
}
