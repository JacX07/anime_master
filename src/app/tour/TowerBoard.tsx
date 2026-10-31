"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { startBattleAction } from "@/app/battle-actions";
import { LiveBattle } from "@/components/battle/LiveBattle";
import type { BattleView } from "@/lib/battles";
import { RARITY_NAMES } from "@/lib/labels";
import { floorRarities, towerKey } from "@/lib/tower";
import type { Rarity } from "@/generated/prisma/enums";
import "../histoire/histoire.css";
import "./tour.css";

interface Props {
  maxFloor: number;
  maxPossible: number;
  team: ({ name: string; imageUrl: string; rarity: Rarity } | null)[];
}

/** Compte à rebours avant l'étage suivant ; « Annuler » coupe l'enchaînement. */
function Countdown({ seconds, onDone, onCancel }: { seconds: number; onDone: () => void; onCancel: () => void }) {
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
      Étage suivant dans {Math.max(left, 0)} s…{" "}
      <button type="button" className="bt-btn" onClick={onCancel}>Annuler</button>
    </p>
  );
}

export function TowerBoard({ maxFloor, maxPossible, team }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = Math.min(maxFloor + 1, maxPossible);
  const [floor, setFloor] = useState(next);
  const [error, setError] = useState<string | null>(null);
  const [fight, setFight] = useState<{ battle: BattleView; floor: number; auto: boolean } | null>(null);
  const [chain, setChain] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChain(localStorage.getItem("bt-chain") === "on");
  }, []);
  const ready = team.every(Boolean);

  function run(n: number) {
    setError(null);
    start(async () => {
      const res = await startBattleAction(towerKey(n), true);
      if (!res.ok) return setError(res.error);
      setFloor(n);
      setFight({ battle: res.battle, floor: n, auto: localStorage.getItem("bt-auto") !== "off" });
    });
  }

  if (fight) {
    const f = fight.floor;
    return (
      <section className="hs-fight">
        <LiveBattle
          key={fight.battle.id}
          initial={fight.battle}
          initialAuto={fight.auto}
          names={{ A: "Ton équipe", B: `Étage ${f}` }}
          title={`La Tour — étage ${f}`}
          onExit={() => setFight(null)}
          abandonOnExit
          onEnd={() => router.refresh()}
          renderEnd={(battle) => {
            const canNext = battle.winner === "A" && f < maxPossible;
            return (
              <div className="hs-result" role="status">
                <b>{battle.winner === "A" ? "Victoire !" : "Défaite — aucune pénalité."}</b>
                {battle.loot && battle.loot.ryo > 0 && <ul><li>{battle.loot.ryo} Ryō (premier passage)</li></ul>}
                <div className="hs-actions">
                  <button type="button" className="bt-btn" onClick={() => setFight(null)}>Retour à la Tour</button>
                  <button type="button" className="bt-btn" disabled={pending} onClick={() => run(f)}>Rejouer cet étage</button>
                  {canNext && <button type="button" className="bt-btn" disabled={pending} onClick={() => run(f + 1)}>Étage suivant</button>}
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
                {chain && canNext && (
                  <Countdown
                    key={battle.id}
                    seconds={4}
                    onDone={() => run(f + 1)}
                    onCancel={() => {
                      setChain(false);
                      localStorage.setItem("bt-chain", "off");
                    }}
                  />
                )}
                {error && <p className="hs-error" role="alert">{error}</p>}
              </div>
            );
          }}
        />
      </section>
    );
  }

  const rarities = floorRarities(floor);
  return (
    <>
      <section className="hs-team" aria-label="Équipe d’attaque">
        <h2 className="hs-h">Ton équipe d’attaque</h2>
        {ready ? (
          <ul className="hs-cards">
            {team.map((c, i) => (
              <li key={i} className={`hs-card hs-r-${c!.rarity}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c!.imageUrl} alt="" referrerPolicy="no-referrer" />
                <span>{c!.name}</span>
                <small>{RARITY_NAMES[c!.rarity]}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="vt-muted">Il te faut une équipe de 4 cartes pour combattre.</p>
        )}
        <Link href="/equipe" className="bt-btn">{ready ? "Modifier mon équipe" : "Composer mon équipe"}</Link>
      </section>

      <section className="tw-floor" aria-label="Étage">
        <h2 className="hs-h">Étage {floor} <small>(record : {maxFloor || "aucun"} / {maxPossible})</small></h2>
        <p className="vt-muted">Ennemis : {rarities.map((r) => RARITY_NAMES[r]).join(" · ")}</p>
        <div className="hs-actions">
          <button type="button" className="bt-btn" disabled={!ready || pending} onClick={() => run(floor)}>
            {floor <= maxFloor ? "Rejouer cet étage" : "Combattre"}
          </button>
          <label className="tw-pick">
            Étage
            <input
              type="number"
              min={1}
              max={next}
              value={floor}
              onChange={(e) => setFloor(Math.max(1, Math.min(next, Math.floor(Number(e.target.value)) || 1)))}
            />
          </label>
          {floor !== next && <button type="button" className="bt-btn" onClick={() => setFloor(next)}>Aller à l&apos;étage {next}</button>}
        </div>
        {error && <p className="hs-error" role="alert">{error}</p>}
      </section>
    </>
  );
}
