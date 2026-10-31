"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { autoAttackTeamAction, startBattleAction } from "@/app/battle-actions";
import { LiveBattle } from "@/components/battle/LiveBattle";
import type { BattleView } from "@/lib/battles";
import { RARITY_NAMES } from "@/lib/labels";
import { isBoss, isFinalBoss, LEVELS, MIX, RESOURCE_NAMES } from "@/lib/story";
import type { Rarity } from "@/generated/prisma/enums";
import "./histoire.css";

interface UniverseView {
  key: string;
  name: string;
  resource: string;
  weaponResource: string;
  maxLevel: number;
  unlocked: boolean;
  rank: number;
  kind: "anime" | "collision";
  /** Difficulté de l'univers par rapport au premier (×1,0 à ×1,5) */
  difficulty: number;
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
  const [universe, setUniverse] = useState(universes[0].key);
  const [error, setError] = useState<string | null>(null);
  const [fight, setFight] = useState<{ battle: BattleView; universe: UniverseView; level: number; auto: boolean } | null>(null);
  // « Enchaîner » : après une victoire, le combat suivant démarre tout seul (réglage gardé d'une visite à l'autre)
  const [chain, setChain] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChain(localStorage.getItem("bt-chain") === "on");
  }, []);
  const u = universes.find((x) => x.key === universe)!;
  const ready = team.every(Boolean);

  function run(level: number) {
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
                {battle.loot.ryo > 0 && <li>{battle.loot.ryo} Ryō</li>}
                {battle.loot.crystals > 0 && <li>{battle.loot.crystals} {battle.loot.crystals > 1 ? "cristaux" : "cristal"}</li>}
                {Object.entries(battle.loot.resources).map(([k, n]) => (
                  <li key={k}>{n} × {resName(k)}</li>
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

      <nav className="hs-tabs" aria-label="Univers">
        {universes.map((x) => (
          <button key={x.key} type="button" className="hs-tab" aria-pressed={x.key === universe} disabled={!x.unlocked} onClick={() => setUniverse(x.key)}>
            <span>{x.rank}. {x.name}</span>
            <small>{x.kind === "collision" ? "Collision · " : ""}{x.unlocked ? `${x.maxLevel} / ${LEVELS}` : "Verrouillé"}</small>
          </button>
        ))}
      </nav>
      {!u.unlocked && <p className="vt-muted">Termine {universes[u.rank - 2]?.name} (15 combats) pour ouvrir cet univers.</p>}
      <p className="vt-count">
        {u.kind === "collision" ? "Univers de collision : des personnages de plusieurs anime." : "Univers d'anime."} Difficulté ×{u.difficulty.toFixed(2).replace(".", ",")}{u.rank === 1 ? " (tutoriel)" : ""}.
      </p>

      <p className="vt-count">
        Ressources : {resName(u.resource)} {stock[u.resource] ?? 0} · {resName("fragment-de-signature")} {stock["fragment-de-signature"] ?? 0} · {resName(u.weaponResource)} {stock[u.weaponResource] ?? 0}
      </p>
      {error && <p className="hs-error" role="alert">{error}</p>}

      <ol className="hs-levels">
        {MIX.map((mix, i) => {
          const n = i + 1;
          const done = n <= u.maxLevel, open = u.unlocked && n <= u.maxLevel + 1;
          return (
            <li key={n} className={`hs-level${isBoss(n) ? " hs-boss" : ""}${done ? " hs-done" : ""}`}>
              <div>
                <b>{levelTitle(n)}</b>
                <small>{mix.join(" · ")}</small>
              </div>
              <button type="button" className="bt-btn" disabled={!open || !ready || pending} onClick={() => run(n)}>
                {done ? "Rejouer" : open ? "Combattre" : "Verrouillé"}
              </button>
            </li>
          );
        })}
      </ol>
    </>
  );
}
