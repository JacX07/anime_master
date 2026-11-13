"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { abandonBattleAction, finishAutoAction, playActionAction, playAutoAction } from "@/app/battle-actions";
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
  /** Croix « Quitter » : lien ; sur un combat en cours, un panneau demande confirmation (le combat est alors abandonné) */
  exitHref?: string;
  /** Croix « Quitter » : fonction, appelée après confirmation si le combat est en cours */
  onExit?: () => void;
  /** Conservé pour les pages : quitter un combat en cours demande toujours confirmation */
  abandonOnExit?: boolean;
  /** « Nouveau combat » de l'écran de fin par défaut, et retour après un abandon */
  onNext?: () => void;
}

/** Combat suivi par le serveur : chaque choix du joueur (ou l'action automatique) est enregistré, l'écran rejoue les nouveaux événements. */
export function LiveBattle({ music, initial, initialAuto, names, title, onEnd, renderEnd, exitHref, onExit, onNext }: Props) {
  const router = useRouter();
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

  // Changer d'onglet ne change rien : l'animation continue à son rythme (minuterie d'arrière-plan du lecteur) et le serveur joue action par action.

  // Quitter le combat ne le résout jamais : fermer l'onglet demande confirmation au navigateur, la croix ouvre notre panneau.
  // Un combat laissé ouvert est abandonné (défaite, sans butin) au prochain lancement.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (statusRef.current === "RUNNING") { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [view.id]);

  const play = (spell: Spell, target: UnitId | null) => send(() => playActionAction(view.id, { spell, target }, view.steps));
  const autoStep = () => send(() => playAutoAction(view.id, view.steps));

  // Demande de sortie (croix ou « Abandonner ») : panneau de confirmation, puis abandon côté serveur
  const [confirming, setConfirming] = useState<null | (() => void)>(null);
  const abandon = (then?: () => void) =>
    start(async () => {
      const r = await abandonBattleAction(view.id);
      if (r.ok) { setConfirming(null); then?.(); }
      else { setConfirming(null); setError(r.error); }
    });
  const leave = onExit ?? (exitHref ? () => router.push(exitHref) : undefined);

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
    <>
    <BattlePlayer
      key={view.id}
      music={music}
      log={log}
      allowDisableSpellFx={view.spellFxUnlocked !== false}
      characters={characters}
      names={names}
      title={title}
      exitHref={exitHref}
      onExit={leave ? () => (running ? setConfirming(() => leave) : leave()) : undefined}
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
        onAbandon: running ? () => setConfirming(() => (onExit ?? onNext ?? (() => {}))) : undefined,
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
    <LeaveConfirm open={!!confirming} busy={pending} onStay={() => setConfirming(null)} onLeave={() => abandon(confirming ?? undefined)} />
    </>
  );
}

/** Panneau « Quitter le combat ? » : le combat n'est pas résolu, il est abandonné (défaite, aucun butin). */
function LeaveConfirm({ open, busy, onStay, onLeave }: { open: boolean; busy: boolean; onStay: () => void; onLeave: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="bt-confirm" onClose={onStay} aria-labelledby="bt-confirm-title">
      <h2 id="bt-confirm-title">Quitter le combat ?</h2>
      <p>Le combat ne sera <b>pas résolu</b> : il est abandonné, compté comme une défaite, sans butin ni victoire. Ton énergie est rendue.</p>
      <div className="bt-confirm-row">
        <button type="button" className="bt-btn" onClick={onStay} disabled={busy} autoFocus>Rester dans le combat</button>
        <button type="button" className="bt-btn bt-confirm-leave" onClick={onLeave} disabled={busy}>{busy ? "…" : "Quitter le combat"}</button>
      </div>
    </dialog>
  );
}
