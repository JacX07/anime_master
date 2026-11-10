"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { startBattleAction } from "@/app/battle-actions";
import { LiveBattle } from "@/components/battle/LiveBattle";
import type { BattleView } from "@/lib/battles";
import { RARITY_NAMES } from "@/lib/labels";
import { floorRarities, towerKey, towerRyo } from "@/lib/tower";
import type { Rarity } from "@/generated/prisma/enums";
import "../histoire/histoire.css";
import "./tour.css";

interface Props {
  maxFloor: number;
  maxPossible: number;
  team: ({ name: string; imageUrl: string; rarity: Rarity } | null)[];
}

/** Premier étage où les ennemis montent d'un cran de rareté (tous les 30 étages, voir lib/tower.ts) */
const nextTier = (floor: number) => Math.floor((floor - 1) / 30) * 30 + 31;

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
                {battle.loot && battle.loot.ryo > 0 ? <ul><li>{battle.loot.ryo} Ryō (premier passage)</li></ul> : battle.winner === "A" && <p>Étage déjà passé : pas de récompense en le rejouant.</p>}
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
  const top = rarities[rarities.length - 1];
  const tierMarks = [1, 2, 3, 4].map((k) => ((k * 30) / maxPossible) * 100);
  const firstMilestone = Math.max(Math.ceil((maxFloor + 1) / 10) * 10, 10);
  const milestones = [0, 10, 20].map((d) => firstMilestone + d).filter((m) => m <= maxPossible && m !== floor);
  const GUARDS = ["Gardien du seuil", "Veilleur de pierre", "Sentinelle voilée", "Champion déchu"];
  return (
    <div className="tw">
      <section className="tw-hero" aria-label="La Tour">
        {/* eslint-disable @next/next/no-img-element */}
        <img className="tw-scene" src="/tower/scene.svg" alt="" aria-hidden width={700} height={680} />
        <div className="tw-rays" aria-hidden />
        <div className="tw-rays tw-rays-b" aria-hidden />
        <img className="tw-fog tw-fog-hi" src="/tower/fog-high.svg" alt="" aria-hidden />
        <img className="tw-fog tw-fog-hi2" src="/tower/fog-high2.svg" alt="" aria-hidden />
        <img className="tw-fog tw-fog-lo" src="/tower/fog-low.svg" alt="" aria-hidden />
        <img className="tw-fog tw-fog-lo2" src="/tower/fog-low2.svg" alt="" aria-hidden />
        {/* eslint-enable @next/next/no-img-element */}
        <div className="tw-pollen" aria-hidden>
          {Array.from({ length: 8 }, (_, i) => <i key={i} style={{ "--i": i } as CSSProperties} />)}
        </div>
        <header className="tw-title">
          <p className="tw-loc">La Tour</p>
          <h1>Étage {floor}</h1>
          <div className="tw-orn" aria-hidden><i /><b /><i /></div>
          <p className="tw-sub">Palier {RARITY_NAMES[top]}</p>
        </header>
        <div className="tw-boss" role="progressbar" aria-label="Ascension" aria-valuemin={0} aria-valuemax={maxPossible} aria-valuenow={maxFloor}>
          <div className="tw-boss-lab"><span>L’ascension</span><small>{maxFloor} / {maxPossible}</small></div>
          <div className="tw-bar">
            <div className="tw-fill" style={{ width: `${(maxFloor / maxPossible) * 100}%` }} />
            {tierMarks.map((m) => <span key={m} className="tw-tick" style={{ left: `${m}%` }} />)}
          </div>
        </div>
      </section>

      <div className="tw-panel">
        <section className="tw-col" aria-label="Gardiens de l’étage">
          <h2 className="tw-h">Gardiens de l’étage</h2>
          <ul className="tw-foes">
            {rarities.map((r, i) => (
              <li key={i} className="tw-foe" style={{ "--c": `var(--rarity-${r})` } as CSSProperties}>
                <span className="tw-sq" aria-hidden />
                <span><b>{GUARDS[i]}</b><small>Inconnu jusqu’au combat</small></span>
                <span className="tw-rar">{RARITY_NAMES[r]}</span>
              </li>
            ))}
          </ul>
          <h2 className="tw-h">Récompenses</h2>
          <ul className="tw-rewards">
            <li data-done={floor <= maxFloor || undefined}><span>Étage {floor}</span><b>{floor <= maxFloor ? "Déjà obtenue" : `${towerRyo(floor)} Ryō`}</b></li>
            {milestones.map((m) => <li key={m} data-bonus><span>Étage {m} · palier</span><b>{towerRyo(m)} Ryō</b></li>)}
          </ul>
          <p className="tw-hint">Ryō versés au premier passage de chaque étage ({towerRyo(1)} à l’étage 1, +3 par étage). Tous les 10 étages, un palier ajoute 100 Ryō. Rejouer un étage ne rapporte rien.</p>
        </section>

        <section className="tw-col" aria-label="Ascension">
          <h2 className="tw-h">Ascension</h2>
          <div className="tw-menu">
            <button type="button" className="bt-btn tw-go" disabled={!ready || pending} onClick={() => run(floor)}>
              {floor <= maxFloor ? `Rejouer l’étage ${floor}` : `Affronter l’étage ${floor}`}
            </button>
            <label className="tw-pick">
              Aller à l’étage
              <input
                type="number"
                min={1}
                max={next}
                value={floor}
                onChange={(e) => setFloor(Math.max(1, Math.min(next, Math.floor(Number(e.target.value)) || 1)))}
              />
              <span>1 – {next}</span>
            </label>
            {floor !== next && <button type="button" className="bt-btn" onClick={() => setFloor(next)}>Aller à l&apos;étage {next}</button>}
            <Link href="/equipe" className="bt-btn">{ready ? "Modifier l’équipe" : "Composer mon équipe"}</Link>
            <a href="#classement" className="bt-btn">Classement</a>
          </div>
          {ready ? (
            <ul className="tw-team" aria-label="Équipe d’attaque">
              {team.map((c, i) => (
                <li key={i} className="tw-mate" style={{ "--c": `var(--rarity-${c!.rarity})` } as CSSProperties} title={`${c!.name} — ${RARITY_NAMES[c!.rarity]}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c!.imageUrl} alt={c!.name} referrerPolicy="no-referrer" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="vt-muted">Il te faut une équipe de 4 cartes pour combattre.</p>
          )}
          <p className="tw-hint">Prochain palier de rareté : <b>étage {nextTier(floor)}</b>.</p>
          {error && <p className="hs-error" role="alert">{error}</p>}
        </section>
      </div>
    </div>
  );
}
