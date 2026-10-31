"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { autoAttackTeamAction, startBattleAction } from "@/app/battle-actions";
import { BattlePlayer } from "@/components/battle/BattlePlayer";
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
}
interface Props {
  universes: UniverseView[];
  team: ({ name: string; imageUrl: string; rarity: Rarity } | null)[];
  stock: Record<string, number>;
}

const resName = (k: string) => RESOURCE_NAMES[k] ?? k;
const levelTitle = (n: number) => (isFinalBoss(n) ? "Boss final" : isBoss(n) ? `Boss d’acte ${n / 5}` : `Combat ${n}`);

export function StoryBoard({ universes, team, stock }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [universe, setUniverse] = useState(universes[0].key);
  const [error, setError] = useState<string | null>(null);
  const [fight, setFight] = useState<{ battle: BattleView; universe: UniverseView; level: number } | null>(null);
  const [ended, setEnded] = useState(false);
  const u = universes.find((x) => x.key === universe)!;
  const ready = team.every(Boolean);

  function run(level: number) {
    setError(null);
    start(async () => {
      const res = await startBattleAction(`story:${u.key}:${level}`, false);
      if (!res.ok) return setError(res.error);
      setEnded(false);
      setFight({ battle: res.battle, universe: u, level });
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
        <BattlePlayer
          key={battle.id}
          log={battle.log}
          characters={battle.characters}
          names={{ A: "Ton équipe", B: fu.name }}
          title={`${fu.name} — ${levelTitle(level)}`}
          onExit={() => setFight(null)}
          onEnd={() => {
            setEnded(true);
            router.refresh();
          }}
          endExtra={
            ended && (
          <div className="hs-result" role="status">
            <b>{battle.winner === "A" ? "Victoire !" : "Défaite — aucune pénalité."}</b>
            {battle.loot && (
              <ul>
                {battle.loot.ryo > 0 && <li>{battle.loot.ryo} Ryō</li>}
                {battle.loot.crystals > 0 && <li>{battle.loot.crystals} cristal{battle.loot.crystals > 1 ? "ux" : ""}</li>}
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
            {error && <p className="hs-error" role="alert">{error}</p>}
          </div>
            )
          }
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
            {x.name}
            <small>{x.unlocked ? `${x.maxLevel} / ${LEVELS}` : "Verrouillé"}</small>
          </button>
        ))}
      </nav>
      {!u.unlocked && <p className="vt-muted">Termine le tutoriel ({universes[0].name}) pour ouvrir cet univers.</p>}

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
