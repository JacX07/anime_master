"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { CardType, Rarity } from "@/generated/prisma/enums";
import { affinity, type BattleEvent, type Side, type Spell, type Status, type UnitId, type UnitView } from "@/lib/battle";
import { holdFor, replayAll, replayStart, replayStep, spellLabel, STATUS_INFO, type Pop, type Replay } from "@/lib/battle-replay";
import { TYPE_LABELS } from "@/lib/labels";
import { attackElement } from "@/lib/attack-element";
import { attackVisual, attackWeapon } from "@/lib/attack-visual";
import { actionVisualTargets } from "@/lib/combat-vfx-events";
import { CombatVfx } from "./combat-vfx";
import { PERSISTENT_STATUSES, STATUS_FX } from "./status-vfx";
import { Icon, StatusIcon, TypeIcon } from "../icons";
import { BattleReport } from "./BattleReport";
import { TurnOrder } from "./TurnOrder";
import { replayTurnOrder } from "@/lib/battle-report";
import { SpellsPanel } from "./BattlePanels";
import { BattleVictory } from "./BattleVictory";
import "./battle.css";
import "./spell-hand.css";
import type { MusicTrack } from "@/lib/track-music";
import { backgroundTimeout } from "@/lib/background-timer";
import { BattleAudio } from "./sound";
import { useSpellFx } from "./RepeatControls";
import { EffectsPanel } from "./EffectsPanel";
import { ULT_COLOR } from "./SpellHand";
import { fxStream } from "@/lib/fx";

export interface PlayerCharacter {
  name: string;
  imageUrl: string;
  rarity: Rarity;
  type: CardType;
  series?: string | null;
}

interface Props {
  /** Musique du combat : général (par défaut), raid ou PvP */
  music?: MusicTrack;
  /** Première tentative en donjon : les effets restent actifs malgré la préférence globale. */
  allowDisableSpellFx?: boolean;
  log: BattleEvent[];
  /** characterId → ce qu'il faut pour dessiner la carte */
  characters: Record<number, PlayerCharacter>;
  names?: Record<Side, string>;
  /** Lien « nouveau combat » de l'écran de fin */
  nextHref?: string;
  /** Appelé une fois, quand la lecture arrive au bout du journal */
  onEnd?: () => void;
  /** Titre affiché en haut à gauche (ex. nom du combat d'histoire) */
  title?: string;
  /** Contenu ajouté à l'écran de fin (butin, boutons de la page appelante) */
  endExtra?: React.ReactNode;
  /** Étoiles imposées par le mode (histoire) */
  stars?: number | null;
  /** Quitter par une fonction plutôt que par un lien */
  onExit?: () => void;
  /** « Nouveau combat » sous forme de bouton (à la place du lien) */
  onNext?: () => void;
  /** Où mène la croix « Quitter » (le combat prend tout l'écran) */
  exitHref?: string;
  /** Mode manuel : le journal grandit à chaque choix du joueur */
  live?: LiveControl;
}

/** Ce que le mode manuel donne au lecteur : qui doit agir, les choix permis, et comment jouer. */
export interface LiveControl {
  /** Carte du joueur qui doit agir (null : l'adversaire joue ou le combat est fini) */
  actor: UnitId | null;
  choices: { spell: Spell; targets: (UnitId | null)[] }[];
  /** Actions que chaque carte doit encore attendre avant son sort affilié */
  wait: Record<string, number>;
  timeline: UnitId[];
  busy: boolean;
  error?: string | null;
  onPlay: (spell: Spell, target: UnitId | null) => void;
  /** Mode auto : la stratégie automatique joue à ta place, on peut revenir au manuel à tout moment */
  auto: boolean;
  /** Absent : pas d'interrupteur Auto (arène live) */
  onToggleAuto?: () => void;
  /** Demande au serveur de jouer l'action de la carte qui doit agir */
  onAutoStep: () => void;
  /** « Terminer » : le serveur joue la suite en auto, sans animation */
  onFinish?: () => void;
  /** Incrémenté quand l'écran doit sauter au résultat dès que le journal contient la fin */
  skipNonce?: number;
  /** Abandon du combat en cours (compté comme perdu) */
  onAbandon?: () => void;
  /** Affiché à côté de l'interrupteur : chrono de l'arène live */
  countdown?: ReactNode;
  /** Bouton de l'écran de fin à la place du lien « Nouveau combat » */
  onNext?: () => void;
}

const SPEEDS = [1, 2, 4] as const;
const POSITIONS = [1, 2, 3, 4];
const pct = (x: number) => `${Math.round(x * 100)} %`;
const num = new Intl.NumberFormat("fr-FR");

/** Lecteur de combat 4 contre 4 : rejoue un journal d'événements (docs/specs/combat.md §9), avec lecture, pause et vitesse. */
export function BattlePlayer(props: Props) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHost(document.body);
  }, []);
  // Sort de la page animée : son contexte d'empilement cachait le combat derrière l'en-tête.
  return host ? createPortal(<div className="mq-app-shell mq-battle-overlay"><BattlePlayerContent {...props} /></div>, host) : null;
}

function BattlePlayerContent({ music = "combat", allowDisableSpellFx = true, log, characters, names = { A: "Équipe A", B: "Équipe B" }, nextHref, onNext, onEnd, title, endExtra, stars, onExit, exitHref = "/", live }: Props) {
  // Plein écran : la page derrière ne défile pas
  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, []);
  const [rp, setRp] = useState<Replay>(() => replayStart(log));
  const [playing, setPlaying] = useState(true);
  const pauseMenu = useRef<HTMLDialogElement>(null);
  const wasPlaying = useRef(true);
  const [detailsHost, setDetailsHost] = useState<HTMLDivElement | null>(null);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  // Effets de sorts désactivés : pas d'effets visuels des sorts, combat joué deux fois plus vite (v0.3.0)
  const [preferredSpellFx, setSpellFx] = useSpellFx();
  const spellFx = !allowDisableSpellFx || preferredSpellFx;
  const pace = spellFx ? speed : speed * 2;
  // En direct (mode manuel), le journal grandit : rattraper le journal ne veut pas dire que le combat est fini
  const caughtUp = rp.idx >= log.length;
  const finished = caughtUp && (!live || rp.end !== null);
  const [selection, setSelection] = useState<{ key: string; spell: Spell } | null>(null);
  const selectionKey = `${live?.actor ?? ""}:${log.length}`;
  const spell: Spell = selection?.key === selectionKey ? selection.spell : "base";
  // `ready` : le journal est rattrapé et une de tes cartes doit agir ; `awaiting` : c'est à toi de choisir (pas en auto)
  const ready = !!live && caughtUp && !rp.end && live.actor !== null;
  const awaiting = ready && !live?.auto;
  const autoStep = live?.onAutoStep;
  const autoOn = !!live?.auto;
  const autoBusy = !!live?.busy;
  const autoFailed = !!live?.error;
  const choice = awaiting ? live?.choices.find((c) => c.spell === spell) : undefined;
  // Sort lancé : la carte se désagrège en particules qui filent vers le lanceur, il les « consomme », puis le coup part (maquette sorts-cartes)
  const [consuming, setConsuming] = useState(false);
  const cancelCast = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelCast.current?.(), []);
  const play = (s: Spell, target: UnitId | null) => {
    if (consuming) return;
    setSelection(null);
    const root = document.querySelector(".mq-battle-overlay");
    const caster = live?.actor ? root?.querySelector<HTMLElement>(`[data-unit="${live.actor}"]`) : null;
    const source = root?.querySelector<HTMLElement>(s === "ultimate" ? ".bt-ult" : `.bt-hand-card[data-spell="${s}"]`);
    const color = source ? getComputedStyle(source).getPropertyValue(s === "ultimate" ? "--ult" : "--accent").trim() || "#c4a76d" : "#c4a76d";
    const stream = spellFx && source && caster ? fxStream(source, caster, [color], s === "ultimate" ? 320 : 220, speed) : null;
    if (stream && source && caster) {
      if (s !== "ultimate") source.classList.add("bt-gone");
      setConsuming(true);
      caster.style.setProperty("--charge", color);
      const absorb = setTimeout(() => caster.classList.add("bt-absorb"), stream.duration * .65);
      const finish = setTimeout(() => cancelCast.current?.(), stream.duration);
      cancelCast.current = () => {
        clearTimeout(absorb); clearTimeout(finish); stream.cancel();
        caster.classList.remove("bt-absorb"); source.classList.remove("bt-gone");
        caster.style.removeProperty("--charge");
        cancelCast.current = null;
        setConsuming(false);
      };
    }
    // L'action est envoyée immédiatement ; seul le lecteur attend l'absorption visuelle.
    live?.onPlay(s, target);
  };
  useEffect(() => {
    // En auto, dès que l'écran a rattrapé le journal, le serveur joue l'action suivante
    if (ready && autoOn && !autoBusy && !autoFailed && playing && !consuming) autoStep?.();
  }, [ready, autoOn, autoBusy, autoFailed, playing, consuming, autoStep, rp.idx]);

  // Carte dont les sorts sont affichés sous le plateau : celle qu'on a touchée, sinon celle qui joue
  const [picked, setPicked] = useState<UnitId | null>(null);

  // Chaque événement reste à l'écran le temps de sa durée (divisée par la vitesse), puis le suivant s'applique
  const playbackHold = useRef({ idx: rp.idx, remaining: holdFor(log, rp.idx - 1) });
  useEffect(() => {
    if (playbackHold.current.idx !== rp.idx) playbackHold.current = { idx: rp.idx, remaining: holdFor(log, rp.idx - 1) };
    if (!playing || caughtUp || consuming) return;
    const hold = playbackHold.current;
    const started = performance.now();
    // Minuterie d'arrière-plan : l'animation continue au même rythme quand on change d'onglet
    const cancel = backgroundTimeout(() => setRp((s) => replayStep(s, log)), hold.remaining / pace);
    return () => {
      cancel();
      hold.remaining = Math.max(0, hold.remaining - (performance.now() - started) * pace);
    };
  }, [playing, caughtUp, consuming, pace, rp.idx, log]);

  useEffect(() => {
    if (finished) onEnd?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  // Vitesse courante pour les animations et les sons programmés depuis des effets
  const speedRef = useRef(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // Son : effets sur chaque événement, musique pendant la lecture. Le navigateur ne laisse jouer qu'après un geste (voir onPointerDown).
  const audio = useRef<BattleAudio | null>(null);
  const track = useRef(music);
  const getAudio = () => (audio.current ??= new BattleAudio(track.current));
  const [sfxOn, setSfxOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  useEffect(() => {
    // Réglages mémorisés d'une visite à l'autre
    const savedSpeed = Number(localStorage.getItem("bt-speed"));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedSpeed === 1 || savedSpeed === 2 || savedSpeed === 4) setSpeed(savedSpeed);
    setSfxOn(localStorage.getItem("bt-sfx") !== "off");
    setMusicOn(localStorage.getItem("bt-music") !== "off");
  }, []);
  useEffect(() => {
    getAudio().setSfx(sfxOn);
  }, [sfxOn]);
  useEffect(() => {
    const a = getAudio();
    a.musicOn = musicOn;
    if (musicOn && playing && !finished) a.startMusic();
    else a.stopMusic();
    return () => a.stopMusic();
  }, [musicOn, playing, finished]);
  useEffect(
    () => () => {
      audio.current?.dispose();
      audio.current = null;
    },
    [],
  );
  const lastIdx = useRef(rp.idx);
  useEffect(() => {
    const before = lastIdx.current;
    lastIdx.current = rp.idx;
    const ev = log[rp.idx - 1];
    // Un seul événement à la fois : pas de bruit quand on saute à la fin ou qu'on recommence
    if (ev && rp.idx === before + 1) {
      // Carte qui agit : l'acteur d'une action, la source d'un coup
      const who = ev.kind === "action" ? ev.actor : ev.kind === "damage" || ev.kind === "dodge" ? ev.source : null;
      const id = who ? rp.info[who]?.characterId : undefined;
      getAudio().play(ev, log[rp.idx - 2], rp.cur, speedRef.current, { element: id ? attackElement(id) : null, magic: id ? attackVisual(id) === "magic" : false });
    }
  }, [rp.idx, rp.cur, rp.info, log]);
  const toggle = (key: "bt-sfx" | "bt-music", on: boolean, set: (v: boolean) => void) => {
    set(on);
    localStorage.setItem(key, on ? "on" : "off");
  };

  // Mouvements des cartes (Web Animations, durées divisées par la vitesse) : élan vers la cible, secousse à l'impact
  const stage = useRef<HTMLDivElement>(null);
  const vfx = useRef<CombatVfx | null>(null);
  const visualIndex = useRef(rp.idx);
  useEffect(() => {
    if (!stage.current) return;
    const controller = new CombatVfx(stage.current);
    vfx.current = controller;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => controller.clear();
    reducedMotion.addEventListener("change", onMotionChange);
    return () => {
      reducedMotion.removeEventListener("change", onMotionChange);
      controller.dispose();
      vfx.current = null;
    };
  }, []);
  useEffect(() => { vfx.current?.setPlayback(speed, playing); }, [speed, playing]);
  useEffect(() => {
    const before = visualIndex.current;
    visualIndex.current = rp.idx;
    if (before === rp.idx) return;
    if (rp.idx !== before + 1) { vfx.current?.clear(); return; }
    const ev = log[rp.idx - 1];
    const root = stage.current;
    const controller = vfx.current;
    if (!controller || !ev || !root || !spellFx || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = (id: UnitId) => root.querySelector<HTMLElement>(`[data-unit="${id}"]`);
    if (ev.kind === "action") {
      const a = el(ev.actor);
      const t = ev.target && ev.target[0] !== ev.actor[0] ? el(ev.target) : null;
      if (!a) return;
      const visual = attackVisual(rp.info[ev.actor].characterId);
      const element = attackElement(rp.info[ev.actor].characterId);
      const targets = actionVisualTargets(log, rp.idx - 1);
      const center = (card: HTMLElement) => {
        const r = card.querySelector(".bt-card")?.getBoundingClientRect() ?? card.getBoundingClientRect();
        const bounds = root.getBoundingClientRect();
        return { x: r.left + r.width / 2 - bounds.left + root.scrollLeft, y: r.top + r.height / 2 - bounds.top + root.scrollTop };
      };
      if (visual !== "melee") {
        const from = center(a);
        const intensity = ev.spell === "ultimate" ? 1.35 : ev.spell === "base" ? 1 : 1.15;
        const weapon = attackWeapon(rp.info[ev.actor].characterId);
        // Une lame est brandie par la carte : elle suit la première coupe (une zone ne la déplace qu'une fois)
        const wielder = visual === "slash" ? a : null;
        targets.forEach((hit, i) => {
          const target = el(hit.target);
          if (target) controller.play({ style: visual, from, to: center(target), impactAt: hit.at, intensity, weapon, dodge: hit.dodge, targetCard: target.querySelector<HTMLElement>(".bt-card"), actorCard: i === 0 ? wielder : null, element });
        });
        if (!targets.length) controller.play({ style: visual, from, to: { x: from.x + 70, y: from.y }, impactAt: 480, intensity, weapon, support: true, actorCard: wielder });
        if (!wielder) controller.animate(a, [{ transform: "none" }, { transform: "scale(1.04)", offset: .3 }, { transform: "none" }], { duration: 480 });
      } else if (!t) {
        // Zone, soin ou soutien : la carte se lève sur place
        controller.animate(a, [{ transform: "none" }, { transform: "translateY(-6%) scale(1.1)", offset: 0.45 }, { transform: "none" }], { duration: 700, easing: "ease-in-out" });
      } else {
        const ra = a.getBoundingClientRect();
        const rt = t.getBoundingClientRect();
        const dx = (rt.left + rt.width / 2 - (ra.left + ra.width / 2)) * 0.62;
        const dy = (rt.top + rt.height / 2 - (ra.top + ra.height / 2)) * 0.62;
        // Le sommet de l'élan tombe sur l'impact (480 ms plus tard, voir holdFor)
        controller.animate(a, [{ transform: "none" }, { transform: `translate(${dx}px, ${dy}px) scale(1.12)`, offset: 0.63 }, { transform: "none" }], {
          duration: 760, easing: "cubic-bezier(.35,.05,.3,1)",
        });
        if (element) {
          const from = center(a);
          for (const hit of targets) {
            const target = el(hit.target), card = target?.querySelector<HTMLElement>(".bt-card");
            if (!target || !card) continue;
            const r = card.getBoundingClientRect();
            controller.elementHit({ element, style: "melee", from, to: center(target), card: { w: r.width, h: r.height }, impactAt: hit.at, dodge: hit.dodge });
          }
        }
      }
    } else if (ev.kind === "status" && ev.on) {
      const card = el(ev.target)?.querySelector<HTMLElement>(".bt-card");
      const fx = STATUS_FX[ev.status];
      if (card && fx) controller.status(card, fx.apply, fx.bad, ev.status === "stun");
    } else if (ev.kind === "damage") {
      const card = el(ev.target)?.querySelector<HTMLElement>(".bt-card");
      const k = ev.crit ? 1.6 : 1;
      if (card) controller.animate(card,
        [
          { transform: "none", filter: "brightness(2.4)" },
          { transform: `translateX(${-5 * k}%)`, offset: 0.2 },
          { transform: `translateX(${4 * k}%)`, offset: 0.45 },
          { transform: `translateX(${-2 * k}%)`, offset: 0.7 },
          { transform: "none", filter: "brightness(1)" },
        ],
        { duration: ev.crit ? 460 : 320, easing: "ease-out" },
      );
      if (ev.crit) controller.animate(root,[{ transform: "none" }, { transform: "translate(-6px, 3px)" }, { transform: "translate(5px, -3px)" }, { transform: "none" }], { duration: 300 });
    }
  }, [rp.idx, rp.info, log, spellFx]);

  const restart = () => {
    cancelCast.current?.();
    setRp(replayStart(log));
    setPlaying(true);
  };
  const skip = () => { cancelCast.current?.(); setRp({ ...replayAll(log), pops: [] }); };
  // Saut au résultat demandé par le combat en direct (« Terminer », onglet en arrière-plan) : dès que la fin est dans le journal
  const skipped = useRef(0);
  useEffect(() => {
    const nonce = live?.skipNonce ?? 0;
    if (nonce > skipped.current && log[log.length - 1]?.kind === "end") {
      cancelCast.current?.();
      skipped.current = nonce;
      setRp({ ...replayAll(log), pops: [] });
    }
  }, [live?.skipNonce, log]);

  const end = rp.end;
  const actor = rp.cur && !finished ? rp.info[rp.cur.actor] : null;
  const actorName = actor ? characters[actor.characterId]?.name : null;

  const order = end ? [] : replayTurnOrder(log, rp.idx, rp.cur?.actor ?? null, rp.info, (id) => !!rp.units[id]?.ko, caughtUp && live ? live.timeline : undefined, !caughtUp ? live?.timeline : undefined);
  const spellUnit = (awaiting ? live?.actor : null) ?? picked ?? rp.cur?.actor ?? ("A1" as UnitId);

  return (
    <div className="bt-layout bt-layout-with-order bt-layout-diagonal" onPointerDown={() => getAudio().unlock()}>
      <div className="fx-layer" aria-hidden="true" />
      {/* Ultime lancé (par n'importe quel camp) : son nom s'écrit au milieu de l'écran */}
      {spellFx && rp.cur?.spell === "ultimate" && !finished && (
        <div key={rp.cur.n} className="bt-ult-wrap" style={{ "--spd": speed, "--ult": ULT_COLOR[rp.cur.type] } as React.CSSProperties} aria-hidden="true">
          <div className="bt-ult-flash" />
          <div className="bt-ult-banner"><small>Ultime · {characters[rp.info[rp.cur.actor].characterId]?.name ?? ""}</small>{rp.cur.name}</div>
        </div>
      )}
      {/* Titre, commandes rapides et menu pause, puis ordre de combat. */}
      <div className="bt-head">
        <div className="bt-head-copy" aria-live="polite">
        {title && <b className="bt-title">{title}</b>}
        <span className="bt-round">{rp.round ? `Tour ${rp.round}` : "Prêts ?"}</span>
        <span className="bt-line">
          {end
            ? "Combat terminé"
            : awaiting && live?.actor
              ? `À toi : ${characters[rp.info[live.actor].characterId]?.name ?? ""}`
              : rp.cur && actorName
                ? `${actorName} · ${spellLabel(rp.cur.spell, rp.cur.type, rp.cur.name)}`
                : ""}
        </span>
        </div>
        <div className="bt-head-actions">
          {live?.countdown && !end && live.countdown}
          {live && !end && live.onToggleAuto && (
              <button type="button" className="bt-sw" role="switch" aria-checked={live.auto} onClick={live.onToggleAuto} title="Auto : ton équipe joue seule. Manuel : tu choisis. Tu peux changer à tout moment.">
                <span className="bt-sw-tr" aria-hidden="true" />
                Auto
              </button>
          )}
            <button
              type="button"
              className="bt-spd"
              onClick={() => {
                const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
                setSpeed(next);
                localStorage.setItem("bt-speed", String(next));
              }}
              aria-label={`Vitesse ×${speed}, cliquer pour changer`}
              title="Changer la vitesse (×1, ×2, ×4)"
            >
              ×{speed}
              <small>Vitesse</small>
            </button>
          <button type="button" className="bt-pause-trigger" aria-label="Ouvrir le menu pause" title="Pause et réglages" onClick={() => {
            wasPlaying.current = playing;
            cancelCast.current?.();
            setPlaying(false);
            pauseMenu.current?.showModal();
          }}><Icon name="pause" /></button>
        </div>
      </div>
      <TurnOrder order={order} info={rp.info} characters={characters} onPick={setPicked} ended={!!end} />
    <div className="bt" ref={stage} data-paused={!playing || undefined} style={{ "--spd": speed } as React.CSSProperties}>
      <div className="bt-arena">
      <div className="bt-formation">
      <span className="bt-versus" aria-hidden="true">VS</span>
      {(["B", "A"] as const).map((side) => (
        <section key={side} className="bt-team" data-side={side} data-result={end ? (end.winner === side ? "win" : end.winner ? "lose" : "draw") : undefined}>
          <h3 className="bt-team-name">
            {names[side]}
            {rp.first === side && <span title="Cette équipe joue en premier"> · commence</span>}
          </h3>
          <div className="bt-row">
            {POSITIONS.filter((p) => rp.info[`${side}${p}` as UnitId]).map((p) => {
              const id = `${side}${p}` as UnitId;
              return <Unit key={id} id={id} rp={rp} characters={characters} acting={awaiting ? live?.actor === id : rp.cur?.actor === id && !finished}
                  turn={awaiting && live?.actor === id}
                  picked={spellUnit === id}
                  targetable={!!choice?.targets.includes(id)}
                  rel={relation(rp.info[spellUnit], rp.info[id], rp.units[id].ko)}
                  onPick={() => (choice?.targets.includes(id) ? play(choice.spell, id) : setPicked(picked === id ? null : id))}
                />;
            })}
          </div>
        </section>
      ))}
      </div>
      </div>



      {end && (
        <div className="bt-end" role="region" aria-label="Résultat du combat" data-winner={end.winner ?? "draw"}>
          <div className="bt-result-window">
          <BattleVictory log={log} rp={rp} characters={characters} names={names} end={end} stars={stars} />
          {endExtra !== undefined ? (
            // La page appelante fournit tout l'écran de fin (résultat, butin, boutons)
            endExtra
          ) : (
            <>
          <span>
            {end.reason === "ko"
              ? `Toute l'équipe adverse est à terre, en ${end.rounds} tours.`
              : `Temps écoulé après ${end.rounds} tours · PV restants : ${names.A} ${pct(end.hpLeft.A)}, ${names.B} ${pct(end.hpLeft.B)}.`}
          </span>
          <span className="bt-end-actions">
            <button type="button" className="bt-btn" onClick={restart}>
              Rejouer
            </button>
            {(live?.onNext ?? onNext) && (
              <button type="button" className="bt-btn" onClick={live?.onNext ?? onNext}>
                Nouveau combat
              </button>
            )}
            {nextHref && (
              <Link className="bt-btn" href={nextHref}>
                Nouveau combat
              </Link>
            )}
            {onExit ? (
              <button type="button" className="bt-btn" onClick={onExit}>
                Quitter
              </button>
            ) : (
              <Link className="bt-btn" href={exitHref}>
                Quitter
              </Link>
            )}
          </span>
            </>
          )}
          <BattleReport log={log} characters={characters} names={names} />
          </div>
        </div>
      )}
    </div>

      <SpellsPanel
        effects={<EffectsPanel unit={rp.info[spellUnit]} state={rp.units[spellUnit]} info={rp.info} characters={characters} />}
        unit={rp.info[spellUnit]}
        character={characters[rp.info[spellUnit].characterId]}
        detailsHost={detailsHost}
        choose={
          awaiting && live
            ? {
                choices: live.choices,
                spell,
                wait: live.wait[spellUnit] ?? 0,
                waitSpecial: live.wait[`${spellUnit}:special`] ?? 0,
                waitTertiary: live.wait[`${spellUnit}:tertiary`] ?? 0,
                busy: live.busy || consuming,
                error: live.error,
                onSpell: (s) => {
                  const c = live.choices.find((x) => x.spell === s);
                  // Sort de zone : pas de cible à choisir
                  if (c && c.targets.length === 1 && c.targets[0] === null) play(s, null);
                  else setSelection({ key: selectionKey, spell: s === spell ? "base" : s });
                },
              }
            : undefined
        }
      />
      <dialog ref={pauseMenu} className="bt-confirm bt-pause-menu" aria-labelledby="battle-pause-title" onClose={() => setPlaying(wasPlaying.current)}>
        <h2 id="battle-pause-title">{finished ? "Combat terminé" : "Pause"}</h2>
        {live?.countdown && !end && <p>Le chrono de l’arène continue pendant ce menu.</p>}
        <button type="button" className="ui-button bt-resume" onClick={() => {
          wasPlaying.current = true;
          if (finished) restart();
          pauseMenu.current?.close();
        }}><Icon name="lecture" />{finished ? "Rejouer" : "Reprendre le combat"}</button>
        <div className="bt-pause-settings" aria-label="Réglages du combat">
            <button type="button" className="bt-ico" data-off={!spellFx || undefined} aria-pressed={spellFx} aria-label="Effets de sorts" disabled={!allowDisableSpellFx} title={!allowDisableSpellFx ? "Gagne cette difficulté pour débloquer le mode sans effets" : spellFx ? "Effets de sorts : activés" : "Effets de sorts : désactivés (combat plus rapide)"} onClick={() => setSpellFx(!spellFx)}>
              <Icon name="ultime" />
            </button>
            <button type="button" className="bt-ico" data-off={!sfxOn || undefined} aria-pressed={sfxOn} aria-label="Effets sonores" title="Effets sonores" onClick={() => toggle("bt-sfx", !sfxOn, setSfxOn)}>
              <Icon name="son" />
            </button>
            <button type="button" className="bt-ico" data-off={!musicOn || undefined} aria-pressed={musicOn} aria-label="Musique" title="Musique" onClick={() => toggle("bt-music", !musicOn, setMusicOn)}>
              <Icon name="musique" />
            </button>
        </div>
        <div ref={setDetailsHost} className="bt-pause-details" />
        <div className="bt-pause-actions">
            <button type="button" className="bt-ico" onClick={() => { wasPlaying.current = true; pauseMenu.current?.close(); cancelCast.current?.(); if (live?.onFinish && !rp.end) live.onFinish(); else skip(); }} disabled={finished} aria-label={live?.onFinish ? "Terminer le combat en automatique, sans animation" : "Aller à la fin"} title={live?.onFinish ? "Terminer (auto, sans animation)" : "Aller à la fin"}>
              <Icon name="fin" />
            </button>
          {live?.onAbandon && !end ? (
            <button type="button" className="ui-button bt-confirm-leave" onClick={live.onAbandon} disabled={live.busy}>Abandonner</button>
          ) : onExit ? (
            <button type="button" className="ui-button" onClick={onExit}>Quitter le combat</button>
          ) : <Link className="ui-button" href={exitHref}>Quitter le combat</Link>}
        </div>
      </dialog>
    </div>
  );
}

/** Affinité de la carte suivie contre une carte adverse vivante (docs/specs/combat.md §2). */
function relation(focus: UnitView, other: UnitView, ko: boolean): "strong" | "weak" | null {
  if (ko || focus.id[0] === other.id[0]) return null;
  const a = affinity(focus.type, other.type);
  return a > 1 ? "strong" : a < 1 ? "weak" : null;
}

function Unit({
  id, rp, characters, acting, turn, picked, targetable, rel, onPick,
}: {
  /** Affinité de la carte suivie contre celle-ci : fort (×1,1) ou faible (×0,95) */
  rel: "strong" | "weak" | null;
  /** C'est à toi de choisir pour cette carte (mode manuel) */
  turn: boolean;
  id: UnitId;
  rp: Replay;
  characters: Record<number, PlayerCharacter>;
  acting: boolean;
  picked: boolean;
  targetable: boolean;
  onPick: () => void;
}) {
  const info = rp.info[id];
  const st = rp.units[id];
  const ch = characters[info.characterId];
  const aimed = rp.cur?.target === id && !rp.end;
  const cast = acting && rp.cur ? spellLabel(rp.cur.spell, rp.cur.type, rp.cur.name) : null;
  // Effets persistants : seulement les statuts qui changent la lecture du combat
  const ambient = st.ko || rp.end ? "" : PERSISTENT_STATUSES.filter((k) => (k === "exposed" ? st.exposed : (st.fx as Status[]).includes(k))).map((k) => STATUS_FX[k].ambient).join("");
  return (
    <div
      className="bt-unit"
      role="button"
      tabIndex={0}
      aria-pressed={picked}
      onClick={onPick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick();
        }
      }}
      data-picked={picked || undefined}
      data-targetable={targetable || undefined}
      data-turn={turn || undefined}
      data-boss={info.boss || undefined}
      aria-label={`${ch?.name ?? id}${info.boss ? " · Boss" : ""}`}
      data-pos={id[1]}
      data-unit={id} data-rarity={info.rarity} data-type={info.type} data-ko={st.ko || undefined} data-acting={acting || undefined} data-aimed={aimed || undefined}>
      {info.boss && <span className="bt-boss-badge">♛ Boss</span>}
      <div className="bt-card">
        {/* Image servie par le CDN AniList, comme sur les cartes de l'album */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="bt-art" src={ch?.imageUrl} alt={ch?.name ?? ""} referrerPolicy="no-referrer" draggable={false} />
        <span className="bt-type" title={TYPE_LABELS[info.type].name}>
          <TypeIcon type={info.type} />
        </span>
        <span className="bt-rarity rtag" data-rarity={info.rarity}><b>{info.rarity}</b></span>
        {rel && (
          <span className="bt-aff" data-aff={rel} title={rel === "strong" ? "Le lanceur inflige ×1,1 à ce type" : "Le lanceur inflige ×0,95 à ce type, et en reçoit ×1,1"}>
            {rel === "strong" ? "▲ ×1,1" : "▼ ×0,95"}
          </span>
        )}
        <div className="bt-name" title={ch?.name}>
          {ch?.name}
        </div>
        {st.ko && <span className="bt-ko">K.O.</span>}
      </div>
      {ambient && <svg className="bt-sfx bt-sfx-am" viewBox="0 0 120 152" preserveAspectRatio="none" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ambient }} />}
      {/* Hors de la carte (qui rogne ce qui dépasse) pour que l'infobulle puisse sortir */}
      <ul className="bt-states" aria-label="États">
        {(["exposed", "weaken", "elan"] as const)
          .filter((k) => st[k])
          .concat(st.fx as never[])
          .map((k: Status) => (
            <li key={k} data-state={k} data-bad={STATUS_INFO[k].bad || undefined} tabIndex={0} aria-label={`${STATUS_INFO[k].label} : ${STATUS_INFO[k].help}`} onClick={(e) => e.stopPropagation()}>
              <StatusIcon status={k} />
              {st.fxd?.[k]?.turns !== undefined && <span className="bt-state-turns" aria-hidden="true">{st.fxd[k]!.turns}</span>}
              <span className="bt-tip" role="tooltip">
                <b>{STATUS_INFO[k].label}</b>
                {STATUS_INFO[k].help}
              </span>
            </li>
          ))}
      </ul>
      {cast && (
        <span key={rp.cur!.n} className="bt-cast">
          {cast}
        </span>
      )}
      <div className="bt-bars" role="meter" aria-label={`PV de ${ch?.name ?? id}`} aria-valuemin={0} aria-valuemax={Math.round(info.maxHp)} aria-valuenow={Math.round(st.hp)}>
        <div className="bt-hp">
          <i style={{ width: `${(st.hp / info.maxHp) * 100}%` }} />
        </div>
        <div className="bt-shield">
          <i style={{ width: `${Math.min(1, st.shield / info.maxHp) * 100}%` }} />
        </div>
      </div>
      <div className="bt-hpnum">
        {num.format(Math.ceil(st.hp))}
        {st.shield > 0.5 && <span className="bt-shnum"> +{num.format(Math.ceil(st.shield))}</span>}
      </div>
      <div className="bt-pops" aria-hidden>
        {rp.pops
          .filter((p) => p.unit === id)
          .map((p) => (
            <PopView key={p.id} pop={p} />
          ))}
      </div>
    </div>
  );
}


/** Nombre flottant ou effet de sort posé sur une carte ; il s'anime et s'efface tout seul (voir battle.css). */
function PopView({ pop }: { pop: Pop }) {
  // Décalage stable propre à chaque pop, pour que deux nombres consécutifs ne se superposent pas
  const style = { "--ox": `${((pop.id * 37) % 41) - 20}%` } as React.CSSProperties;
  switch (pop.kind) {
    case "fx":
      return <Fx fx={pop.fx} big={pop.big} />;
    case "damage": {
      const soaked = pop.absorbed >= pop.amount * 0.999;
      return (
        <span className="bt-num" data-kind={soaked ? "soaked" : "damage"} data-crit={pop.crit || undefined} style={style}>
          {num.format(Math.round(pop.amount))}
          {pop.crit && <small>CRITIQUE</small>}
          {pop.affinity && <small data-affinity={pop.affinity}>{pop.affinity === "strong" ? "▲ Efficace" : "▼ Résisté"}</small>}
          {pop.exposedBonus && <small>◎ Exposé</small>}
          {!soaked && pop.absorbed > 0 && <small data-affinity="shield">Bouclier −{num.format(Math.round(pop.absorbed))}</small>}
        </span>
      );
    }
    case "dodge":
      return (
        <span className="bt-num" data-kind="status" data-status="elan" style={style}>
          Esquive !
        </span>
      );
    case "heal":
      return (
        <>
          <Fx fx="heal" big={false} />
          <span className="bt-num" data-kind="heal" style={style}>
            +{num.format(Math.round(pop.amount))}
          </span>
        </>
      );
    case "shield":
      return pop.amount > 0 ? (
        <span className="bt-num" data-kind="shield" style={style}>
          +{num.format(Math.round(pop.amount))}
        </span>
      ) : (
        <span className="bt-num" data-kind="soaked" style={style}>
          Bouclier perdu
        </span>
      );
    case "poison":
      return (
        <span className="bt-num" data-kind="damage" style={style}>
          {num.format(Math.round(pop.amount))}
          <small>{pop.bleed ? "Saignement" : pop.burn ? "Brûlure" : "Poison"}</small>
        </span>
      );
    case "revive":
      return (
        <span className="bt-num" data-kind="heal" style={style}>
          Réanimé !
        </span>
      );
    case "resist":
      return (
        <span className="bt-num" data-kind="soaked" style={style}>
          Résiste
        </span>
      );
    case "status":
      return pop.on ? (
        <span className="bt-num" data-kind="status" data-status={pop.status} style={style}>
          {STATUS_INFO[pop.status].label}
        </span>
      ) : null;
  }
}

/** Effet visuel d'un sort : un décor de particules par type, tracé en CSS (voir [data-fx] dans battle.css). */
function Fx({ fx, big }: { fx: CardType | "base" | "heal"; big: boolean }) {
  const parts = fx === "COMBAT" || fx === "MAGIE" ? 8 : fx === "heal" || fx === "base" ? 5 : 3;
  return (
    <span className="bt-fx" data-fx={fx} data-big={big || undefined} aria-hidden>
      {Array.from({ length: parts }, (_, i) => (
        <i key={i} style={{ "--i": i, "--n": parts } as React.CSSProperties} />
      ))}
    </span>
  );
}
