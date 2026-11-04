"use client";

import { ResourceArt } from "@/components/ResourceArt";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { autoAttackTeamAction, getStoryPreviewAction, setAttackTeamAction, startBattleAction } from "@/app/battle-actions";
import { claimStarTierAction } from "@/app/story-star-actions";
import { LiveBattle } from "@/components/battle/LiveBattle";
import type { BattleView } from "@/lib/battles";
import { isBoss, isFinalBoss, LEVELS, RESOURCE_NAMES } from "@/lib/story";
import { StoryMap } from "./StoryMap";
import { StoryPreparation, type StoryCard, type StoryEnemy } from "./StoryPreparation";
import { STORY_ART } from "./story-art";
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
interface Props {
  universes: UniverseView[];
  attackIds: (string | null)[];
  ownedCards: StoryCard[];
  stock: Record<string, number>;
  storageKey: string;
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

export function StoryBoard({ universes, attackIds, ownedCards, stock, storageKey }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fight, setFight] = useState<{ battle: BattleView; universe: UniverseView; level: number; auto: boolean } | null>(null);
  // « Enchaîner » : après une victoire, le combat suivant démarre tout seul (réglage gardé d'une visite à l'autre)
  const [chain, setChain] = useState(false);
  const [duo, setDuo] = useState(false);
  const [slots, setSlots] = useState(attackIds);
  const [preparation, setPreparation] = useState<{ universe: UniverseView; level: number; enemies: StoryEnemy[] } | null>(null);
  const [departing, setDeparting] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChain(localStorage.getItem("bt-chain") === "on");
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (saved && Array.isArray(saved.slots) && saved.slots.length === 4) {
        const seen = new Set<number>();
        setSlots(saved.slots.map((id: unknown) => {
          const card = ownedCards.find((c) => c.id === id);
          if (!card || seen.has(card.combat.characterId)) return null;
          seen.add(card.combat.characterId);
          return card.id;
        }));
        setDuo(saved.duo === true);
      }
    } catch { /* Un stockage indisponible ne bloque pas l'équipe enregistrée côté serveur. */ }
  }, [storageKey, ownedCards]);
  const selectedIds = slots.slice(0, duo ? 2 : 4).filter((id): id is string => !!id);

  function remember(nextSlots: (string | null)[], nextDuo: boolean) {
    try { localStorage.setItem(storageKey, JSON.stringify({ slots: nextSlots, duo: nextDuo })); } catch { /* Équipe complète sauvegardée côté serveur. */ }
  }
  function changeDuo(value: boolean) {
    setDuo(value);
    remember(slots, value);
  }
  function choose(index: number, id: string) {
    const next = slots.map((old, i) => i === index ? id : old);
    setError(null);
    start(async () => {
      const ids = next.filter((value): value is string => !!value);
      if (!duo && ids.length === 4) {
        const res = await setAttackTeamAction(ids);
        if (!res.ok) return setError(res.error);
      }
      setSlots(next);
      remember(next, duo);
    });
  }
  function prepare(level: number, universe: UniverseView) {
    setError(null);
    start(async () => {
      const res = await getStoryPreviewAction(universe.key, level);
      if (!res.ok) return setError(res.error);
      setPreparation({ universe, level, enemies: res.cards });
    });
  }

  // `fight.universe` est une copie prise au premier combat : sa progression (maxLevel) reste figée.
  // On relit donc toujours l'univers courant dans `universes`, que router.refresh() met à jour.
  const freshUniverse = (u: UniverseView) => universes.find((x) => x.key === u.key) ?? u;

  function run(level: number, u: UniverseView = freshUniverse(fight?.universe ?? universes[0])) {
    setError(null);
    setDeparting(true);
    start(async () => {
      // Combat suivi par le serveur : Auto ou Manuel comme au dernier combat, modifiable en route
      const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 550;
      const [res] = await Promise.all([
        startBattleAction(`story:${u.key}:${level}`, true, selectedIds),
        new Promise((resolve) => setTimeout(resolve, delay)),
      ]);
      setDeparting(false);
      if (!res.ok) return setError(res.error);
      setFight({ battle: res.battle, universe: u, level, auto: localStorage.getItem("bt-auto") !== "off" });
    });
  }
  function autoTeam() {
    setError(null);
    start(async () => {
      const res = await autoAttackTeamAction();
      if (!res.ok) return setError(res.error);
      setSlots(res.cardIds);
      remember(res.cardIds, duo);
      router.refresh();
    });
  }

  if (departing) {
    const u = preparation?.universe ?? fight?.universe ?? universes[0];
    return <section className="hs-depart" role="status" aria-live="polite" style={{ backgroundImage: `url("${STORY_ART[u.key]?.background ?? `/story-map/${u.key}.svg`}")` }}><div><h2>{u.name}</h2><p>Combat {preparation?.level ?? fight?.level}</p><span className="hs-vs-label">VS</span><p>Entrée dans le combat…</p></div></section>;
  }

  if (fight) {
    const { battle, level } = fight;
    const fu = freshUniverse(fight.universe);
    return (
      <section className="hs-fight">
        <LiveBattle
          key={battle.id}
          initial={battle}
          initialAuto={fight.auto}
          names={{ A: "Ton équipe", B: fu.name }}
          title={`${fu.name} — ${levelTitle(level)}`}
          // La croix abandonne un combat en cours (sans pénalité en histoire) et revient à la liste
          onExit={() => { setFight(null); setPreparation(null); }}
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
              <button type="button" className="ui-button" onClick={() => { setFight(null); setPreparation(null); }}>Retour à la carte</button>
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
      {error && !preparation && <p className="hs-error" role="alert">{error}</p>}
      <div hidden={!!preparation}>
        <StoryMap
          universes={universes}
          stock={stock}
          pending={pending}
          onPrepare={prepare}
          onClaim={async (universe, tier) => { const res = await claimStarTierAction(universe, tier); if (res.ok) router.refresh(); return res; }}
        />
      </div>
      {preparation && <StoryPreparation universe={freshUniverse(preparation.universe)} level={preparation.level} enemies={preparation.enemies} ownedCards={ownedCards} slots={slots} duo={duo} pending={pending} error={error} onDuo={changeDuo} onChoose={choose} onAuto={autoTeam} onBack={() => { setPreparation(null); setError(null); }} onFight={() => run(preparation.level, freshUniverse(preparation.universe))}/>}
    </>
  );
}
