"use client";

import { ResourceArt } from "@/components/ResourceArt";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { autoAttackTeamAction, startBattleAction } from "@/app/battle-actions";
import { claimStarTierAction } from "@/app/story-star-actions";
import { LiveBattle } from "@/components/battle/LiveBattle";
import type { BattleView } from "@/lib/battles";
import { RARITY_NAMES } from "@/lib/labels";
import { isBoss, isFinalBoss, LEVELS, RESOURCE_NAMES } from "@/lib/story";
import type { Rarity } from "@/generated/prisma/enums";
import { StoryMap } from "./StoryMap";
import "./histoire.css";

export interface UniverseView {
  key: string;
  name: string;
  resource: string;
  weaponResource: string;
  maxLevel: number;
  unlocked: boolean;
  rank: number;
  kind: "anime" | "collision";
  /** Puissance des ennemis au premier et au dernier combat (part des stats de référence de leur rareté) */
  startScale: number;
  difficulty: number;
  /** Raretés des 4 ennemis de chacun des 15 combats */
  mixes: string[][];
  stars: Record<number, number>;
  /** Paliers d'étoiles déjà réclamés */
  claimed: number[];
}
interface StoryCard { id: string; characterId: number; name: string; imageUrl: string; rarity: Rarity }
interface Props {
  universes: UniverseView[];
  team: ({ name: string; imageUrl: string; rarity: Rarity } | null)[];
  attackIds: (string | null)[];
  ownedCards: StoryCard[];
  stock: Record<string, number>;
}

const resName = (k: string) => RESOURCE_NAMES[k] ?? k;
const levelTitle = (n: number) => (isFinalBoss(n) ? "Boss final" : isBoss(n) ? `Boss d’acte ${n / 5}` : `Combat ${n}`);

/** Compte à rebours avant le combat suivant ; « Annuler » coupe l'enchaînement. */
function Countdown({ seconds, label, onDone, onCancel }: { seconds: number; label: string; onDone: () => void; onCancel: () => void }) {
  const [left, setLeft] = useState(seconds);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    if (left <= 0) {
      done.current();
      return;
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return (
    <p className="hs-countdown" role="timer">
      {label} {Math.max(left, 0)} s…{" "}
      <button type="button" className="bt-btn" onClick={onCancel}>
        Annuler
      </button>
    </p>
  );
}

export function StoryBoard({ universes, team, attackIds, ownedCards, stock }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fight, setFight] = useState<{ battle: BattleView; universe: UniverseView; level: number; auto: boolean } | null>(null);
  // « Enchaîner » : après une victoire, le combat suivant démarre tout seul (réglage gardé d'une visite à l'autre)
  const [chain, setChain] = useState(false);
  const [duo, setDuo] = useState(false);
  const [duoIds, setDuoIds] = useState<string[]>(attackIds.filter((id): id is string => !!id).slice(0, 2));
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChain(localStorage.getItem("bt-chain") === "on");
  }, []);
  const selectedIds = duo ? duoIds : attackIds.filter((id): id is string => !!id);
  const ready = duo ? duoIds.length === 2 : team.every(Boolean);

  function run(level: number, u: UniverseView = fight?.universe ?? universes[0]) {
    setError(null);
    start(async () => {
      // Combat suivi par le serveur : Auto ou Manuel comme au dernier combat, modifiable en route
      const res = await startBattleAction(`story:${u.key}:${level}`, true, duo ? duoIds : undefined);
      if (!res.ok) return setError(res.error);
      setFight({ battle: res.battle, universe: u, level, auto: localStorage.getItem("bt-auto") !== "off" });
    });
  }
  function autoTeam() {
    setError(null);
    start(async () => {
      const res = await autoAttackTeamAction();
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  if (fight) {
    const { battle, universe: fu, level } = fight;
    return (
      <section className="hs-fight">
        <LiveBattle
          key={battle.id}
          initial={battle}
          initialAuto={fight.auto}
          names={{ A: "Ton équipe", B: fu.name }}
          title={`${fu.name} — ${levelTitle(level)}`}
          // La croix abandonne un combat en cours (sans pénalité en histoire) et revient à la liste
          onExit={() => setFight(null)}
          abandonOnExit
          onEnd={() => router.refresh()}
          renderEnd={(battle) => (
          <div className="hs-result" role="status">
            <b>{battle.winner === "A" ? "Victoire !" : "Défaite — aucune pénalité."}</b>
            {battle.storyStars !== null && <p className="hs-stars-result" aria-label={`${battle.storyStars} étoile${battle.storyStars === 1 ? " pleine" : "s pleines"}, ${3 - battle.storyStars} étoile${3 - battle.storyStars === 1 ? " vide" : "s vides"}`} title={`${battle.storyStars} étoile${battle.storyStars === 1 ? " pleine" : "s pleines"}, ${3 - battle.storyStars} étoile${3 - battle.storyStars === 1 ? " vide" : "s vides"}`}>{"★".repeat(battle.storyStars)}{"☆".repeat(3 - battle.storyStars)} <span>{battle.storyStars}/3 étoiles</span></p>}
            {battle.loot && (
              <ul>
                {battle.loot.ryo > 0 && <li><ResourceArt resource="ryo" />{battle.loot.ryo} Ryō</li>}
                {battle.loot.crystals > 0 && <li><ResourceArt resource="cristal" />{battle.loot.crystals} {battle.loot.crystals > 1 ? "cristaux" : "cristal"}</li>}
                {Object.entries(battle.loot.resources).map(([k, n]) => (
                  <li key={k}><ResourceArt resource={k} />{n} × {resName(k)}</li>
                ))}
              </ul>
            )}
            <div className="hs-actions">
              <button type="button" className="bt-btn" onClick={() => setFight(null)}>Retour aux combats</button>
              <button type="button" className="bt-btn" disabled={pending} onClick={() => run(fight.level)}>Rejouer ce combat</button>
              {battle.winner === "A" && fight.level < LEVELS && fight.level <= fu.maxLevel + 1 && (
                <button type="button" className="bt-btn" disabled={pending} onClick={() => run(fight.level + 1)}>Combat suivant</button>
              )}
            </div>
            <label className="hs-chain">
              <input
                type="checkbox"
                checked={chain}
                onChange={(e) => {
                  setChain(e.target.checked);
                  localStorage.setItem("bt-chain", e.target.checked ? "on" : "off");
                }}
              />
              Enchaîner automatiquement les combats gagnés
            </label>
            {chain && battle.winner === "A" && fight.level < LEVELS && fight.level <= fu.maxLevel + 1 && (
              <Countdown
                key={battle.id}
                seconds={4}
                label="Combat suivant dans"
                onDone={() => run(fight.level + 1)}
                onCancel={() => {
                  setChain(false);
                  localStorage.setItem("bt-chain", "off");
                }}
              />
            )}
            {error && <p className="hs-error" role="alert">{error}</p>}
          </div>
          )}
        />
      </section>
    );
  }

  return (
    <>
      <section className="hs-team" aria-label="Équipe d’attaque">
        <h2 className="hs-h">Ton équipe d’attaque</h2>
        <div className="hs-team-modes" role="group" aria-label="Taille de l’équipe histoire">
          <button type="button" className={`bt-btn${!duo ? " is-active" : ""}`} aria-pressed={!duo} onClick={() => setDuo(false)}>Équipe habituelle · 4 cartes</button>
          <button type="button" className={`bt-btn${duo ? " is-active" : ""}`} aria-pressed={duo} onClick={() => setDuo(true)}>Duo · 2 cartes</button>
        </div>
        {duo && <div className="hs-duo-picker">
          <p>Choisis exactement deux personnages. Une victoire en duo donne 3 étoiles, même si un personnage tombe au combat.</p>
          <div className="hs-duo-cards">{ownedCards.map((card) => <label key={card.id} className={`hs-duo-card${duoIds.includes(card.id) ? " is-selected" : ""}`}>
            <input type="checkbox" checked={duoIds.includes(card.id)} disabled={!duoIds.includes(card.id) && (duoIds.length >= 2 || duoIds.some((id) => ownedCards.find((x) => x.id === id)?.characterId === card.characterId))} onChange={(e) => setDuoIds((ids) => e.target.checked ? [...ids, card.id] : ids.filter((id) => id !== card.id))} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={card.imageUrl} alt="" /><span>{card.name}</span><small>{RARITY_NAMES[card.rarity]}</small>
          </label>)}</div>
          <p aria-live="polite">{duoIds.length}/2 personnages choisis</p>
        </div>}
        {ready ? (
          duo ? <ul className="hs-cards">{ownedCards.filter((c) => duoIds.includes(c.id)).map((c) => <li key={c.id} className={`hs-card hs-r-${c.rarity}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.imageUrl} alt="" /><span>{c.name}</span><small>{RARITY_NAMES[c.rarity]}</small>
          </li>)}</ul> : (
          <ul className="hs-cards">
            {team.map((c, i) => (
              <li key={i} className={`hs-card hs-r-${c!.rarity}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c!.imageUrl} alt="" />
                <span>{c!.name}</span>
                <small>{RARITY_NAMES[c!.rarity]}</small>
              </li>
            ))}
          </ul>
        )) : (
          <p className="vt-muted">Il te faut une équipe de 4 cartes pour combattre.</p>
        )}
        <button type="button" className="bt-btn" disabled={pending} onClick={autoTeam}>
          {duo ? "Composer une équipe de 4 cartes pour les autres modes" : ready ? "Reprendre mes 4 cartes les plus rares" : "Composer mon équipe automatiquement"}
        </button>
      </section>
      <p className="hs-star-rules" title="Une victoire en duo donne toujours 3 étoiles, même avec un personnage mis K.-O.">Étoiles : victoire = 1 · aucun K.-O. = 2 · victoire en duo de 2 personnages = 3. Le duo compte 3 étoiles même si un personnage tombe.</p>

      {error && <p className="hs-error" role="alert">{error}</p>}
      <StoryMap
        key={universes.map((u) => `${u.key}:${u.maxLevel}:${u.unlocked}`).join("|")}
        universes={universes}
        stock={stock}
        ready={ready}
        chosenTeamSize={selectedIds.length}
        pending={pending}
        onFight={run}
        onClaim={async (universe, tier) => { const res = await claimStarTierAction(universe, tier); if (res.ok) router.refresh(); return res; }}
      />
    </>
  );
}
