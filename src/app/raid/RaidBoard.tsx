"use client";

import { ResourceArt } from "@/components/ResourceArt";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getBattlePreviewAction, startBattleAction } from "@/app/battle-actions";
import { TeamPreparation, type PrepEnemy } from "@/components/team/TeamPreparation";
import { useModeTeam } from "@/components/team/useModeTeam";
import type { TeamContext } from "@/lib/team-context";
import { LiveBattle } from "@/components/battle/LiveBattle";
import type { BattleView } from "@/lib/battles";
import { RARITY_NAMES, TYPE_LABELS } from "@/lib/labels";
import { RAID_RESOURCE, raidKey } from "@/lib/raid";
import type { CardType, Rarity } from "@/generated/prisma/enums";
import "../histoire/histoire.css";
import "./raid.css";

interface Props {
  boss: { key: string; name: string; blurb: string; type: CardType; imageUrl: string | null; leaderName: string | null };
  changesAt: string;
  tutorial: boolean;
  difficulties: { key: string; name: string; mult: number; unlocked: boolean; bestShare: number; won: boolean }[];
  fullHeartsLeft: number;
  hearts: number;
  context: TeamContext;
  storageKey: string;
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

export function RaidBoard({ boss, changesAt, tutorial, difficulties, fullHeartsLeft, hearts, context, storageKey }: Props) {
  const router = useRouter();
  const squad = useModeTeam(storageKey, context, false, false);
  const { pending, start, error, setError } = squad;
  const [fight, setFight] = useState<{ battle: BattleView; difficulty: string; auto: boolean } | null>(null);
  const [prep, setPrep] = useState<{ difficulty: string; enemies: PrepEnemy[] } | null>(null);
  const ready = squad.ready;
  const team = squad.slots.map((id) => context.ownedCards.find((c) => c.id === id)).map((c) => c ? { name: c.name, imageUrl: c.imageUrl, rarity: c.combat.rarity as Rarity } : null);

  function prepare(difficulty: string) {
    setError(null);
    start(async () => {
      const res = await getBattlePreviewAction(raidKey(boss.key, difficulty));
      if (!res.ok) return setError(res.error);
      setPrep({ difficulty, enemies: res.cards });
    });
  }

  function run(difficulty: string) {
    setError(null);
    start(async () => {
      const res = await startBattleAction(raidKey(boss.key, difficulty), true, squad.selectedIds);
      if (!res.ok) return setError(res.error);
      setPrep(null);
      setFight({ battle: res.battle, difficulty, auto: localStorage.getItem("bt-auto") !== "off" });
    });
  }

  if (fight) {
    const d = difficulties.find((x) => x.key === fight.difficulty)!;
    return (
      <section className="hs-fight">
        <LiveBattle
          key={fight.battle.id}
          initial={fight.battle}
          initialAuto={fight.auto}
          names={{ A: "Ton équipe", B: boss.name }}
          title={`Raid — ${boss.name} (${d.name})`}
          onExit={() => setFight(null)}
          abandonOnExit
          onEnd={() => router.refresh()}
          renderEnd={(battle) => {
            const gain = battle.loot?.resources[RAID_RESOURCE] ?? 0;
            const share = Math.round((battle.loot?.share ?? 0) * 100);
            return (
              <div className="hs-result" role="status">
                <b>{battle.winner === "A" ? "Boss vaincu !" : "Le boss tient bon — mais tu l'as entamé."}</b>
                <ul>
                  <li>{share} % de ses PV retirés</li>
                  <li><ResourceArt resource="coeur-de-breche" />{gain > 0 ? `+${gain} cœur${gain > 1 ? "s" : ""} de brèche` : "Aucun cœur cette fois : il faut retirer au moins 25 % de ses PV."}</li>
                </ul>
                <div className="hs-actions">
                  <button type="button" className="bt-btn" onClick={() => setFight(null)}>Retour au raid</button>
                  <button type="button" className="bt-btn" disabled={pending} onClick={() => run(fight.difficulty)}>Rejouer</button>
                </div>
                {error && <p className="hs-error" role="alert">{error}</p>}
              </div>
            );
          }}
        />
      </section>
    );
  }

  if (prep) {
    const d = difficulties.find((x) => x.key === prep.difficulty)!;
    return <TeamPreparation title={`Raid — ${boss.name}`} subtitle={`Difficulté ${d.name} · cœurs ×${d.mult}`} team={squad} context={context} enemies={prep.enemies} enemyLabel={(c) => c.combat.boss ? "Boss" : "Garde"} onBack={() => { setPrep(null); setError(null); }}
      footer={<><p className="hs-team-note">Paliers : 25 % des PV → 1 cœur, 50 % → 2, 75 % → 3, victoire → 5 (×{d.mult}).</p><button type="button" className="ui-button hs-fight-button" disabled={pending || !ready} onClick={() => run(prep.difficulty)}>{pending ? "Chargement…" : "Combattre"}</button></>} />;
  }

  return (
    <>
      <section className="rd-boss" aria-label="Boss de la semaine">
        {boss.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={boss.imageUrl} alt={boss.leaderName ?? boss.name} referrerPolicy="no-referrer" />
        )}
        <div>
          <h2 className="hs-h">{boss.name}</h2>
          <p className="vt-muted">{boss.blurb}</p>
          <p>Type dominant : <b>{TYPE_LABELS[boss.type].name}</b> · il change {dateFmt.format(new Date(changesAt))}.</p>
          <p>
            <b>{hearts}</b> cœur{hearts > 1 ? "s" : ""} de brèche · <b>{fullHeartsLeft}</b> au taux plein encore aujourd&apos;hui
            {fullHeartsLeft === 0 && " (ensuite 25 %, la porte reste ouverte)"}
          </p>
        </div>
      </section>

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
        <button type="button" className="bt-btn" disabled={pending || !difficulties.some((d) => d.unlocked)} onClick={() => prepare((difficulties.find((d) => d.unlocked) ?? difficulties[0]).key)}>{ready ? "Modifier mon équipe" : "Composer mon équipe"}</button>
      </section>

      <section aria-label="Difficultés" className="rd-diffs">
        {!tutorial && <p className="vt-muted">Le raid s&apos;ouvre quand tu as fini le tutoriel de l&apos;<Link href="/histoire">histoire</Link>.</p>}
        {difficulties.map((d) => (
          <div key={d.key} className="rd-diff" data-locked={!d.unlocked || undefined}>
            <h3 className="hs-h">{d.name} <small>cœurs ×{d.mult}</small></h3>
            <div className="rd-bar" role="img" aria-label={`Meilleur : ${Math.round(d.bestShare * 100)} % des PV du boss`}>
              <i style={{ width: `${Math.round(d.bestShare * 100)}%` }} />
            </div>
            <small className="vt-muted">
              {d.won ? "Vaincu" : d.bestShare > 0 ? `Meilleur : ${Math.round(d.bestShare * 100)} % des PV` : "Pas encore tenté"}
              {" · "}paliers : 25 % → 1, 50 % → 2, 75 % → 3, victoire → 5 (×{d.mult})
            </small>
            <button type="button" className="bt-btn" disabled={!d.unlocked || pending} onClick={() => prepare(d.key)}>
              {d.unlocked ? "Préparer" : "Verrouillé"}
            </button>
          </div>
        ))}
        {error && <p className="hs-error" role="alert">{error}</p>}
      </section>
    </>
  );
}
