"use client";

import { ResourceArt } from "@/components/ResourceArt";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { autoAttackTeamAction, startBattleAction } from "@/app/battle-actions";
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
}
interface Props {
  universes: UniverseView[];
  team: ({ name: string; imageUrl: string; rarity: Rarity } | null)[];
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

export function StoryBoard({ universes, team, stock }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fight, setFight] = useState<{ battle: BattleView; universe: UniverseView; level: number; auto: boolean } | null>(null);
  // « Enchaîner » : après une victoire, le combat suivant démarre tout seul (réglage gardé d'une visite à l'autre)
  const [chain, setChain] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChain(localStorage.getItem("bt-chain") === "on");
  }, []);
  const ready = team.every(Boolean);

  function run(level: number, u: UniverseView = fight?.universe ?? universes[0]) {
    setError(null);
    start(async () => {
      // Combat suivi par le serveur : Auto ou Manuel comme au dernier combat, modifiable en route
      const res = await startBattleAction(`story:${u.key}:${level}`, true);
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
        {ready ? (
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
        ) : (
          <p className="vt-muted">Il te faut une équipe de 4 cartes pour combattre.</p>
        )}
        <button type="button" className="bt-btn" disabled={pending} onClick={autoTeam}>
          {ready ? "Reprendre mes 4 cartes les plus rares" : "Composer mon équipe automatiquement"}
        </button>
      </section>

      {error && <p className="hs-error" role="alert">{error}</p>}
      <StoryMap
        key={universes.map((u) => `${u.key}:${u.maxLevel}:${u.unlocked}`).join("|")}
        universes={universes}
        stock={stock}
        ready={ready}
        pending={pending}
        onFight={run}
      />
    </>
  );
}
