"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CardType, Rarity } from "@/generated/prisma/enums";
import { affinity, type BattleEvent, type Side, type Spell, type Status, type UnitId, type UnitView } from "@/lib/battle";
import { historyOf, holdFor, replayAll, replayStart, replayStep, spellLabel, STATUS_INFO, type Pop, type Replay } from "@/lib/battle-replay";
import { TYPE_LABELS } from "@/lib/labels";
import { TypeIcon } from "../icons";
import { History, SpellsPanel } from "./BattlePanels";
import "./battle.css";
import { BattleAudio } from "./sound";

export interface PlayerCharacter {
  name: string;
  imageUrl: string;
  rarity: Rarity;
  type: CardType;
  series?: string | null;
}

interface Props {
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
  busy: boolean;
  error?: string | null;
  onPlay: (spell: Spell, target: UnitId | null) => void;
  /** Mode auto : la stratégie automatique joue à ta place, on peut revenir au manuel à tout moment */
  auto: boolean;
  onToggleAuto: () => void;
  /** Demande au serveur de jouer l'action de la carte qui doit agir */
  onAutoStep: () => void;
  /** Abandon du combat en cours (compté comme perdu) */
  onAbandon?: () => void;
  /** Bouton de l'écran de fin à la place du lien « Nouveau combat » */
  onNext?: () => void;
}

const SPEEDS = [1, 2, 4] as const;
const POSITIONS = [1, 2, 3, 4];
const pct = (x: number) => `${Math.round(x * 100)} %`;
const num = new Intl.NumberFormat("fr-FR");

/** Lecteur de combat 4 contre 4 : rejoue un journal d'événements (docs/specs/combat.md §9), avec lecture, pause et vitesse. */
export function BattlePlayer({ log, characters, names = { A: "Équipe A", B: "Équipe B" }, nextHref, onNext, onEnd, title, endExtra, onExit, exitHref = "/", live }: Props) {
  // Plein écran : la page derrière ne défile pas
  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, []);
  const [drawer, setDrawer] = useState(false);
  const [rp, setRp] = useState<Replay>(() => replayStart(log));
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  // En direct (mode manuel), le journal grandit : rattraper le journal ne veut pas dire que le combat est fini
  const caughtUp = rp.idx >= log.length;
  const finished = caughtUp && (!live || rp.end !== null);
  const [spell, setSpell] = useState<Spell | null>(null);
  // `ready` : le journal est rattrapé et une de tes cartes doit agir ; `awaiting` : c'est à toi de choisir (pas en auto)
  const ready = !!live && caughtUp && !rp.end && live.actor !== null;
  const awaiting = ready && !live?.auto;
  const autoStep = live?.onAutoStep;
  const autoOn = !!live?.auto;
  const autoBusy = !!live?.busy;
  const autoFailed = !!live?.error;
  useEffect(() => {
    // En auto, dès que l'écran a rattrapé le journal, le serveur joue l'action suivante
    if (ready && autoOn && !autoBusy && !autoFailed && playing) autoStep?.();
  }, [ready, autoOn, autoBusy, autoFailed, playing, autoStep, rp.idx]);
  const choice = awaiting ? live?.choices.find((c) => c.spell === spell) : undefined;
  const play = (s: Spell, target: UnitId | null) => {
    setSpell(null);
    live?.onPlay(s, target);
  };
  // Carte dont les sorts sont affichés sous le plateau : celle qu'on a touchée, sinon celle qui joue
  const [picked, setPicked] = useState<UnitId | null>(null);

  // Chaque événement reste à l'écran le temps de sa durée (divisée par la vitesse), puis le suivant s'applique
  useEffect(() => {
    if (!playing || caughtUp) return;
    const t = setTimeout(() => setRp((s) => replayStep(s, log)), holdFor(log, rp.idx - 1) / speed);
    return () => clearTimeout(t);
  }, [playing, caughtUp, speed, rp.idx, log]);

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
  const getAudio = () => (audio.current ??= new BattleAudio());
  const [sfxOn, setSfxOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  useEffect(() => {
    // Réglages mémorisés d'une visite à l'autre
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    if (ev && rp.idx === before + 1) getAudio().play(ev, log[rp.idx - 2], rp.cur, speedRef.current);
  }, [rp.idx, rp.cur, log]);
  const toggle = (key: "bt-sfx" | "bt-music", on: boolean, set: (v: boolean) => void) => {
    set(on);
    localStorage.setItem(key, on ? "on" : "off");
  };

  // Mouvements des cartes (Web Animations, durées divisées par la vitesse) : élan vers la cible, secousse à l'impact
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ev = log[rp.idx - 1];
    const root = stage.current;
    if (!ev || !root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = (id: UnitId) => root.querySelector<HTMLElement>(`[data-unit="${id}"]`);
    const ms = (n: number) => n / speedRef.current;
    if (ev.kind === "action") {
      const a = el(ev.actor);
      const t = ev.target && ev.target[0] !== ev.actor[0] ? el(ev.target) : null;
      if (!a) return;
      if (!t) {
        // Zone, soin ou soutien : la carte se lève sur place
        a.animate([{ transform: "none" }, { transform: "translateY(-6%) scale(1.1)", offset: 0.45 }, { transform: "none" }], { duration: ms(700), easing: "ease-in-out" });
      } else {
        const ra = a.getBoundingClientRect();
        const rt = t.getBoundingClientRect();
        const dx = (rt.left + rt.width / 2 - (ra.left + ra.width / 2)) * 0.62;
        const dy = (rt.top + rt.height / 2 - (ra.top + ra.height / 2)) * 0.62;
        // Le sommet de l'élan tombe sur l'impact (480 ms plus tard, voir holdFor)
        a.animate([{ transform: "none" }, { transform: `translate(${dx}px, ${dy}px) scale(1.12)`, offset: 0.63 }, { transform: "none" }], {
          duration: ms(760),
          easing: "cubic-bezier(.35,.05,.3,1)",
        });
      }
    } else if (ev.kind === "damage") {
      const card = el(ev.target)?.querySelector<HTMLElement>(".bt-card");
      const k = ev.crit ? 1.6 : 1;
      card?.animate(
        [
          { transform: "none", filter: "brightness(2.4)" },
          { transform: `translateX(${-5 * k}%)`, offset: 0.2 },
          { transform: `translateX(${4 * k}%)`, offset: 0.45 },
          { transform: `translateX(${-2 * k}%)`, offset: 0.7 },
          { transform: "none", filter: "brightness(1)" },
        ],
        { duration: ms(ev.crit ? 460 : 320), easing: "ease-out" },
      );
      if (ev.crit) root.animate([{ transform: "none" }, { transform: "translate(-6px, 3px)" }, { transform: "translate(5px, -3px)" }, { transform: "none" }], { duration: ms(300) });
    }
  }, [rp.idx, log]);

  const restart = () => {
    setRp(replayStart(log));
    setPlaying(true);
  };
  const skip = () => setRp({ ...replayAll(log), pops: [] });

  const end = rp.end;
  const actor = rp.cur && !finished ? rp.info[rp.cur.actor] : null;
  const actorName = actor ? characters[actor.characterId]?.name : null;

  const history = historyOf(log, rp.idx);
  const spellUnit = (awaiting ? live?.actor : null) ?? picked ?? rp.cur?.actor ?? ("A1" as UnitId);

  return (
    <div className="bt-layout" onPointerDown={() => getAudio().unlock()}>
      <History entries={history} rp={rp} characters={characters} names={names} open={drawer} onClose={() => setDrawer(false)} />
    <div className="bt" ref={stage} style={{ "--spd": speed } as React.CSSProperties}>
      <div className="bt-head" aria-live="polite">
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
        <button type="button" className="bt-btn bt-drawer-btn" onClick={() => setDrawer(true)}>
          Historique
        </button>
        {onExit ? (
          <button type="button" className="bt-btn bt-exit" onClick={onExit} aria-label="Quitter le combat" title="Quitter le combat">
            ✕
          </button>
        ) : (
          <Link className="bt-btn bt-exit" href={exitHref} aria-label="Quitter le combat" title="Quitter le combat">
            ✕
          </Link>
        )}
      </div>

      {(["B", "A"] as const).map((side) => (
        <section key={side} className="bt-team" data-side={side} data-result={end ? (end.winner === side ? "win" : end.winner ? "lose" : "draw") : undefined}>
          <h3 className="bt-team-name">
            {names[side]}
            {rp.first === side && <span title="Cette équipe joue en premier"> · commence</span>}
          </h3>
          <div className="bt-row">
            {POSITIONS.map((p) => {
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

      <div className="bt-controls">
        <button type="button" className="bt-btn" onClick={restart} aria-label="Recommencer" title="Recommencer">
          ⟲
        </button>
        <button
          type="button"
          className="bt-btn bt-play"
          onClick={() => (finished ? restart() : setPlaying((p) => !p))}
          aria-label={finished ? "Rejouer" : playing ? "Pause" : "Lecture"}
        >
          {finished ? "Rejouer" : playing ? "❚❚ Pause" : "▶ Lecture"}
        </button>
        <button type="button" className="bt-btn" onClick={skip} disabled={finished} aria-label="Aller à la fin" title="Aller à la fin">
          Fin
        </button>
        <div className="bt-speed" role="group" aria-label="Vitesse">
          {SPEEDS.map((s) => (
            <button key={s} type="button" className="bt-btn" aria-pressed={speed === s}
              onClick={() => {
                setSpeed(s);
                localStorage.setItem("bt-speed", String(s));
              }}>
              ×{s}
            </button>
          ))}
        </div>
        <div className="bt-speed" role="group" aria-label="Son">
          <button type="button" className="bt-btn" aria-pressed={sfxOn} onClick={() => toggle("bt-sfx", !sfxOn, setSfxOn)}>
            Effets
          </button>
          <button type="button" className="bt-btn" aria-pressed={musicOn} onClick={() => toggle("bt-music", !musicOn, setMusicOn)}>
            Musique
          </button>
        </div>
        {live && !end && (
          <button type="button" className="bt-btn" aria-pressed={live.auto} onClick={live.onToggleAuto} title="Auto : ton équipe joue seule. Manuel : tu choisis. Tu peux changer à tout moment.">
            {live.auto ? "Auto" : "Manuel"}
          </button>
        )}
        {live?.onAbandon && !end && (
          <button type="button" className="bt-btn" onClick={() => window.confirm("Abandonner ? Le combat sera compté comme perdu.") && live.onAbandon?.()} disabled={live.busy}>
            Abandonner
          </button>
        )}
        <div className="bt-progress" role="progressbar" aria-valuemin={0} aria-valuemax={log.length} aria-valuenow={rp.idx} aria-label="Avancement du combat">
          <i style={{ width: `${(rp.idx / log.length) * 100}%` }} />
        </div>
      </div>

      {end && (
        <div className="bt-end" role="status" data-winner={end.winner ?? "draw"}>
          {endExtra !== undefined ? (
            // La page appelante fournit tout l'écran de fin (résultat, butin, boutons)
            endExtra
          ) : (
            <>
          <b>{end.winner ? `Victoire — ${names[end.winner]}` : "Match nul"}</b>
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
        </div>
      )}
    </div>

      <SpellsPanel
        unit={rp.info[spellUnit]}
        character={characters[rp.info[spellUnit].characterId]}
        followsAction={picked === null}
        choose={
          awaiting && live
            ? {
                choices: live.choices,
                spell,
                wait: live.wait[spellUnit] ?? 0,
                waitSpecial: live.wait[`${spellUnit}:special`] ?? 0,
                busy: live.busy,
                error: live.error,
                onSpell: (s) => {
                  const c = live.choices.find((x) => x.spell === s);
                  // Sort de zone : pas de cible à choisir
                  if (c && c.targets.length === 1 && c.targets[0] === null) play(s, null);
                  else setSpell(s === spell ? null : s);
                },
              }
            : undefined
        }
      />
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
      data-pos={id[1]}
      data-unit={id} data-rarity={info.rarity} data-type={info.type} data-ko={st.ko || undefined} data-acting={acting || undefined} data-aimed={aimed || undefined}>
      <div className="bt-card">
        {/* Image servie par le CDN AniList, comme sur les cartes de l'album */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="bt-art" src={ch?.imageUrl} alt={ch?.name ?? ""} referrerPolicy="no-referrer" draggable={false} />
        <span className="bt-type" title={TYPE_LABELS[info.type].name}>
          <TypeIcon type={info.type} />
        </span>
        <span className="bt-rarity">{info.rarity}</span>
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
      {/* Hors de la carte (qui rogne ce qui dépasse) pour que l'infobulle puisse sortir */}
      <ul className="bt-states" aria-label="États">
        {(["exposed", "weaken", "elan"] as const)
          .filter((k) => st[k])
          .concat(st.fx as never[])
          .map((k: Status) => (
            <li key={k} data-state={k} data-bad={STATUS_INFO[k].bad || undefined} tabIndex={0} aria-label={`${STATUS_INFO[k].label} : ${STATUS_INFO[k].help}`} onClick={(e) => e.stopPropagation()}>
              {STATUS_INFO[k].glyph}
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
          <small>Poison</small>
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
