"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CardType, Rarity } from "@/generated/prisma/enums";
import type { BattleEvent, Side, UnitId } from "@/lib/battle";
import { historyOf, holdFor, replayAll, replayStart, replayStep, SPELL_NAMES, type Pop, type Replay } from "@/lib/battle-replay";
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
}

const SPEEDS = [1, 2, 4] as const;
const STATE_LABELS = { exposed: "Exposé", weaken: "Affaibli", elan: "Élan" } as const;
const STATE_GLYPHS = { exposed: "◎", weaken: "▼", elan: "▲" } as const;
const POSITIONS = [1, 2, 3, 4];
const pct = (x: number) => `${Math.round(x * 100)} %`;
const num = new Intl.NumberFormat("fr-FR");

/** Lecteur de combat 4 contre 4 : rejoue un journal d'événements (docs/specs/combat.md §9), avec lecture, pause et vitesse. */
export function BattlePlayer({ log, characters, names = { A: "Équipe A", B: "Équipe B" }, nextHref }: Props) {
  const [rp, setRp] = useState<Replay>(() => replayStart(log));
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const finished = rp.idx >= log.length;
  // Carte dont les sorts sont affichés sous le plateau : celle qu'on a touchée, sinon celle qui joue
  const [picked, setPicked] = useState<UnitId | null>(null);

  // Chaque événement reste à l'écran le temps de sa durée (divisée par la vitesse), puis le suivant s'applique
  useEffect(() => {
    if (!playing || finished) return;
    const t = setTimeout(() => setRp((s) => replayStep(s, log)), holdFor(log, rp.idx - 1) / speed);
    return () => clearTimeout(t);
  }, [playing, finished, speed, rp.idx, log]);

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
  const spellUnit = picked ?? rp.cur?.actor ?? ("A1" as UnitId);

  return (
    <div className="bt-layout">
    <div className="bt" ref={stage} onPointerDown={() => getAudio().unlock()} style={{ "--spd": speed } as React.CSSProperties}>
      <div className="bt-head" aria-live="polite">
        <span className="bt-round">{rp.round ? `Tour ${rp.round}` : "Prêts ?"}</span>
        <span className="bt-line">
          {end
            ? "Combat terminé"
            : rp.cur && actorName
              ? `${actorName} · ${rp.cur.spell === "base" ? "Attaque" : SPELL_NAMES[rp.cur.type]}`
              : ""}
        </span>
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
              return <Unit key={id} id={id} rp={rp} characters={characters} acting={rp.cur?.actor === id && !finished} picked={spellUnit === id} onPick={() => setPicked(picked === id ? null : id)} />;
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
            <button key={s} type="button" className="bt-btn" aria-pressed={speed === s} onClick={() => setSpeed(s)}>
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
        <div className="bt-progress" role="progressbar" aria-valuemin={0} aria-valuemax={log.length} aria-valuenow={rp.idx} aria-label="Avancement du combat">
          <i style={{ width: `${(rp.idx / log.length) * 100}%` }} />
        </div>
      </div>

      <SpellsPanel unit={rp.info[spellUnit]} character={characters[rp.info[spellUnit].characterId]} followsAction={picked === null} />

      {end && (
        <div className="bt-end" role="status" data-winner={end.winner ?? "draw"}>
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
            {nextHref && (
              <Link className="bt-btn" href={nextHref}>
                Nouveau combat
              </Link>
            )}
          </span>
        </div>
      )}
    </div>
    <History entries={history} rp={rp} characters={characters} names={names} />
    </div>
  );
}

function Unit({ id, rp, characters, acting, picked, onPick }: { id: UnitId; rp: Replay; characters: Record<number, PlayerCharacter>; acting: boolean; picked: boolean; onPick: () => void }) {
  const info = rp.info[id];
  const st = rp.units[id];
  const ch = characters[info.characterId];
  const aimed = rp.cur?.target === id && !rp.end;
  const cast = acting && rp.cur ? (rp.cur.spell === "base" ? "Attaque" : SPELL_NAMES[rp.cur.type]) : null;
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
      data-unit={id} data-rarity={info.rarity} data-type={info.type} data-ko={st.ko || undefined} data-acting={acting || undefined} data-aimed={aimed || undefined}>
      <div className="bt-card">
        {/* Image servie par le CDN AniList, comme sur les cartes de l'album */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="bt-art" src={ch?.imageUrl} alt={ch?.name ?? ""} referrerPolicy="no-referrer" draggable={false} />
        <span className="bt-type" title={TYPE_LABELS[info.type].name}>
          <TypeIcon type={info.type} />
        </span>
        <span className="bt-rarity">{info.rarity}</span>
        <ul className="bt-states" aria-label="États">
          {(["exposed", "weaken", "elan"] as const).map(
            (k) =>
              st[k] && (
                <li key={k} data-state={k} title={STATE_LABELS[k]}>
                  {STATE_GLYPHS[k]}
                </li>
              ),
          )}
        </ul>
        <div className="bt-name" title={ch?.name}>
          {ch?.name}
        </div>
        {st.ko && <span className="bt-ko">K.O.</span>}
      </div>
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

const STATUS_POP = { exposed: "Exposé !", weaken: "Affaibli", elan: "Élan !" } as const;

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
    case "status":
      return pop.on ? (
        <span className="bt-num" data-kind="status" data-status={pop.status} style={style}>
          {STATUS_POP[pop.status]}
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
