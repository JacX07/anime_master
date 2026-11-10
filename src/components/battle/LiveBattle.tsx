"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { abandonBattleAction, finishAutoAction, playActionAction, playAutoAction } from "@/app/battle-actions";
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
  /** Sans animation : en auto, le combat est terminé côté serveur dès son ouverture (boucles de rejeu) */
  instant?: boolean;
}

/** Réglage « sans animation » gardé d'un combat à l'autre (boucles de rejeu). */
export const instantSetting = () => { try { return localStorage.getItem("bt-instant") === "on"; } catch { return false; } };

/** Combat suivi par le serveur : chaque choix du joueur (ou l'action automatique) est enregistré, l'écran rejoue les nouveaux événements. */
export function LiveBattle({ initial, initialAuto, names, title, onEnd, renderEnd, exitHref, onExit, abandonOnExit, onNext, instant }: Props) {
  const [view, setView] = useState(initial);
  const [log, setLog] = useState(initial.log);
  const [auto, setAuto] = useState(initialAuto);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Une seule requête à la fois (le lecteur peut redemander à chaque rendu)
  const inflight = useRef(false);
  // « Terminer » demandé pendant une requête : relancé dès qu'elle revient
  const finishWanted = useRef(false);
  const [skipNonce, setSkipNonce] = useState(0);

  const apply = (next: BattleView) => {
    setError(null);
    setLog((l) => [...l, ...next.log]);
    setView((v) => ({ ...v, steps: next.steps, status: next.status, winner: next.winner, loot: next.loot, storyStars: next.storyStars, actor: next.actor, choices: next.choices, wait: next.wait, timeline: next.timeline }));
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
        if (finishWanted.current) queueMicrotask(() => finishRef.current());
      }
    });
  };

  // Termine tout de suite en automatique (serveur), puis l'écran saute au résultat
  const finishing = useRef(false);
  const finish = () => {
    if (view.status !== "RUNNING" || finishing.current) return;
    finishWanted.current = true;
    if (inflight.current) return;
    finishWanted.current = false;
    finishing.current = true;
    setSkipNonce((n) => n + 1);
    send(() => finishAutoAction(view.id, view.steps));
  };
  const finishRef = useRef(finish);
  const statusRef = useRef(view.status);
  useEffect(() => { finishRef.current = finish; statusRef.current = view.status; });

  // Le jeu continue quand on change d'onglet : en auto, l'onglet masqué termine le combat côté serveur (les minuteries y sont ralenties)
  useEffect(() => {
    // Combat déjà résolu (lancé en auto) : on saute simplement l'animation
    const hurry = () => (statusRef.current === "RUNNING" ? finishRef.current() : setSkipNonce((n) => n + 1));
    const onHide = () => { if (document.hidden && auto) hurry(); };
    if ((instant || document.hidden) && auto) hurry();
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  const play = (spell: Spell, target: UnitId | null) => send(() => playActionAction(view.id, { spell, target }, view.steps));
  const autoStep = () => send(() => playAutoAction(view.id, view.steps));

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
      stars={view.storyStars}
      live={{
        actor: view.actor,
        choices: view.choices,
        wait: view.wait,
        timeline: view.timeline,
        busy: pending,
        error,
        onPlay: play,
        onAbandon: running ? () => abandon(onExit ?? onNext) : undefined,
        auto,
        onToggleAuto: () => {
          // Le réglage est gardé pour le combat suivant
          localStorage.setItem("bt-auto", auto ? "off" : "on");
          setAuto(!auto);
        },
        onAutoStep: autoStep,
        onNext,
        onFinish: running ? finish : undefined,
        skipNonce,
      }}
    />
  );
}
