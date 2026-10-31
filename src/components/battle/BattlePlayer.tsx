"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CardType, Rarity } from "@/generated/prisma/enums";
import type { BattleEvent, Side, UnitId } from "@/lib/battle";
import { holdFor, replayAll, replayStart, replayStep, SPELL_NAMES, type Replay } from "@/lib/battle-replay";
import { TYPE_LABELS } from "@/lib/labels";
import { TypeIcon } from "../icons";
import "./battle.css";

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

  // Chaque événement reste à l'écran le temps de sa durée (divisée par la vitesse), puis le suivant s'applique
  useEffect(() => {
    if (!playing || finished) return;
    const t = setTimeout(() => setRp((s) => replayStep(s, log)), holdFor(log, rp.idx - 1) / speed);
    return () => clearTimeout(t);
  }, [playing, finished, speed, rp.idx, log]);

  const restart = () => {
    setRp(replayStart(log));
    setPlaying(true);
  };
  const skip = () => setRp({ ...replayAll(log), pops: [] });

  const end = rp.end;
  const actor = rp.cur && !finished ? rp.info[rp.cur.actor] : null;
  const actorName = actor ? characters[actor.characterId]?.name : null;

  return (
    <div className="bt" style={{ "--spd": speed } as React.CSSProperties}>
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
              return <Unit key={id} id={id} rp={rp} characters={characters} acting={rp.cur?.actor === id && !finished} />;
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
          ⏭
        </button>
        <div className="bt-speed" role="group" aria-label="Vitesse">
          {SPEEDS.map((s) => (
            <button key={s} type="button" className="bt-btn" aria-pressed={speed === s} onClick={() => setSpeed(s)}>
              ×{s}
            </button>
          ))}
        </div>
        <div className="bt-progress" role="progressbar" aria-valuemin={0} aria-valuemax={log.length} aria-valuenow={rp.idx} aria-label="Avancement du combat">
          <i style={{ width: `${(rp.idx / log.length) * 100}%` }} />
        </div>
      </div>

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
  );
}

function Unit({ id, rp, characters, acting }: { id: UnitId; rp: Replay; characters: Record<number, PlayerCharacter>; acting: boolean }) {
  const info = rp.info[id];
  const st = rp.units[id];
  const ch = characters[info.characterId];
  const aimed = rp.cur?.target === id && !rp.end;
  return (
    <div className="bt-unit" data-unit={id} data-rarity={info.rarity} data-type={info.type} data-ko={st.ko || undefined} data-acting={acting || undefined} data-aimed={aimed || undefined}>
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
    </div>
  );
}
