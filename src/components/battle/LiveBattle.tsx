"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { abandonBattleAction, finishAutoAction, playActionAction, playAutoAction, setBattleAutoAction } from "@/app/battle-actions";
import type { Spell, UnitId } from "@/lib/battle";
import type { MusicTrack } from "@/lib/track-music";
import type { BattleView } from "@/lib/battles";
import { BattlePlayer, type PlayerCharacter } from "./BattlePlayer";

interface Props {
  /** Combat déjà créé côté serveur (lancé en mode suivi : Auto et Manuel sont un simple réglage) */
  initial: BattleView;
  /** Réglage de départ : l'équipe joue seule */
  initialAuto: boolean;
  /** Musique du combat (raid, PvP) ; général par défaut */
  music?: MusicTrack;
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
export function LiveBattle({ music, initial, initialAuto, names, title, onEnd, renderEnd, exitHref, onExit, abandonOnExit, onNext }: Props) {
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
  const stepsRef = useRef(view.steps);
  const statusRef = useRef(view.status);

  const apply = (next: BattleView) => {
    stepsRef.current = next.steps;
    statusRef.current = next.status;
    setError(null);
    setLog((l) => [...l, ...next.log]);
    setView((v) => ({ ...v, steps: next.steps, status: next.status, spellFxUnlocked: next.spellFxUnlocked, winner: next.winner, loot: next.loot, storyStars: next.storyStars, actor: next.actor, choices: next.choices, wait: next.wait, timeline: next.timeline }));
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
    if (statusRef.current !== "RUNNING" || finishing.current) return;
    finishWanted.current = true;
    if (inflight.current) return;
    finishWanted.current = false;
    finishing.current = true;
    setSkipNonce((n) => n + 1);
    send(() => finishAutoAction(view.id, stepsRef.current));
  };
  const finishRef = useRef(finish);
  useEffect(() => { finishRef.current = finish; });

  // Le jeu continue quand on change d'onglet (les minuteries y sont ralenties) : en auto, l'onglet masqué termine le combat côté serveur tout de suite ;
  // en manuel, après 15 secondes sans revenir, l'automatique prend le relais. Dans les deux cas rien n'est abandonné.
  useEffect(() => {
    // Combat déjà résolu (lancé en auto) : on saute simplement l'animation
    const hurry = () => (statusRef.current === "RUNNING" ? finishRef.current() : setSkipNonce((n) => n + 1));
    let waiting: ReturnType<typeof setTimeout> | undefined;
    const onVisibility = () => {
      clearTimeout(waiting);
      if (!document.hidden) return;
      if (auto) hurry();
      else waiting = setTimeout(() => { if (document.hidden) hurry(); }, 15_000);
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => { clearTimeout(waiting); document.removeEventListener("visibilitychange", onVisibility); };
  }, [auto]);

  // Quitter la page (autre page, fermeture, croix) : le combat se termine côté serveur au lieu d'être abandonné.
  const leaving = useRef(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => { clearTimeout(leaveTimer.current); }, [view.id]);
  useEffect(() => {
    const finishOnLeave = () => {
      if (leaving.current || statusRef.current !== "RUNNING") return;
      leaving.current = true;
      void finishAutoAction(view.id, stepsRef.current);
    };
    window.addEventListener("pagehide", finishOnLeave);
    // Démontage différé : le double montage de React (développement) l'annule aussitôt.
    return () => { window.removeEventListener("pagehide", finishOnLeave); leaveTimer.current = setTimeout(finishOnLeave, 50); };
  }, [view.id]);

  // Le serveur retient le réglage Auto : un combat laissé ouvert est alors terminé par le serveur au prochain lancement.
  useEffect(() => { if (statusRef.current === "RUNNING") void setBattleAutoAction(view.id, auto); }, [auto, view.id]);

  const play = (spell: Spell, target: UnitId | null) => send(() => playActionAction(view.id, { spell, target }, view.steps));
  const autoStep = () => send(() => playAutoAction(view.id, view.steps));

  // Croix : on quitte l'écran sans abandonner ; l'automatique termine le combat (victoire et butin possibles)
  const leaveRunning = (then?: () => void) =>
    start(async () => {
      leaving.current = true;
      await finishAutoAction(view.id, stepsRef.current);
      then?.();
    });

  const abandon = (then?: () => void) =>
    start(async () => {
      leaving.current = true;
      const r = await abandonBattleAction(view.id);
      if (r.ok) then?.();
      else setError(r.error);
    });

  // Rareté et type viennent du journal ; nom et image de la base
  const characters: Record<number, PlayerCharacter> = {};
  const first = log[0];
  const startedUnits = log.flatMap((e) => (e.kind === "start" || e.kind === "wave" ? e.units : []));
  if (first?.kind === "start") {
    for (const u of startedUnits) {
      const c = view.characters[u.characterId];
      characters[u.characterId] = { name: c?.name ?? "?", imageUrl: c?.imageUrl ?? "", rarity: u.rarity, type: u.type };
    }
  }

  const running = view.status === "RUNNING";
  return (
    <BattlePlayer
      key={view.id}
      music={music}
      log={log}
      allowDisableSpellFx={view.spellFxUnlocked !== false}
      characters={characters}
      names={names}
      title={title}
      exitHref={exitHref}
      onExit={onExit ? () => (abandonOnExit && running ? leaveRunning(onExit) : onExit()) : undefined}
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
