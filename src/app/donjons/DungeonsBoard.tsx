"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { startBattleAction } from "@/app/battle-actions";
import { LiveBattle } from "@/components/battle/LiveBattle";
import type { BattleView } from "@/lib/battles";
import type { Rarity } from "@/generated/prisma/enums";
import { RARITY_NAMES } from "@/lib/labels";
import { SLOT_NAMES, type ArtifactSlot } from "@/lib/dungeons";
import "./donjons.css";
import "../histoire/histoire.css";
import { artifactStatLabel, artifactStatValue } from "@/lib/artifact-display";

type Level = { level: number; rarity: Rarity; resource: number; mechanic: string; open: boolean };
type Artifact = { id: string; slot: ArtifactSlot; rarity: Rarity; mainStat: string; mainValue: number; subStats: { stat: string; value: number }[]; equipped: string | null };
export function DungeonsBoard({ name, boss, maxLevel, team, levels, artifacts }: {
  name: string; boss: { name: string; imageUrl: string } | null; maxLevel: number;
  team: ({ id: string; name: string; imageUrl: string; rarity: Rarity } | null)[]; levels: Level[]; artifacts: Artifact[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fight, setFight] = useState<{ battle: BattleView; level: number; auto: boolean } | null>(null);
  const ready = team.length === 4 && team.every(Boolean);
  const run = (level: number, manual: boolean) => {
    setError(null);
    start(async () => {
      const result = await startBattleAction(`dungeon:one-piece:${level}`, manual);
      if (!result.ok) return setError(result.error);
      setFight({ battle: result.battle, level, auto: !manual || localStorage.getItem("bt-auto") !== "off" });
    });
  };
  if (fight) return <section className="hs-fight"><LiveBattle key={fight.battle.id} initial={fight.battle} initialAuto={fight.auto} names={{ A: "Ton équipe", B: boss?.name ?? name }} title={`${name} — difficulté ${fight.level}`} onExit={() => setFight(null)} abandonOnExit onEnd={() => router.refresh()} renderEnd={(battle) => <div className="hs-result" role="status">
    <b>{battle.winner === "A" ? "Victoire !" : "Défaite — aucun coût ni butin."}</b>
    {battle.loot?.artifact && <p>{RARITY_NAMES[battle.loot.artifact.rarity]} · {SLOT_NAMES[battle.loot.artifact.slot as ArtifactSlot]} · {artifactStatLabel(battle.loot.artifact.mainStat)} {artifactStatValue(battle.loot.artifact.mainStat, battle.loot.artifact.mainValue)}{battle.loot.resources && Object.values(battle.loot.resources).some(Boolean) ? ` · matériaux : ${Object.values(battle.loot.resources).reduce((a, b) => a + b, 0)}` : ""}</p>}
    <div className="hs-actions"><button type="button" className="bt-btn" onClick={() => setFight(null)}>Retour au donjon</button><button type="button" className="bt-btn" disabled={pending} onClick={() => run(fight.level, true)}>Rejouer en manuel</button><button type="button" className="bt-btn" disabled={pending} onClick={() => run(fight.level, false)}>Rejouer en auto</button>{battle.winner === "A" && fight.level < 10 && <button type="button" className="bt-btn" disabled={pending} onClick={() => run(fight.level + 1, true)}>Difficulté suivante</button>}</div>
    {error && <p className="hs-error" role="alert">{error}</p>}
  </div>} /></section>;
  return <>
    <section className="dg-hero"><div className="dg-visual"><span className="dg-sigil" aria-hidden="true">◈</span><div><p className="dg-kicker">Set One Piece</p><h2>{name}</h2><p>Une sentinelle des fonds garde les quatre reliques du Nouveau Monde.</p></div>{boss?.imageUrl && <><span className="sr-only">{boss.name}</span><img src={boss.imageUrl} alt="" aria-hidden="true" referrerPolicy="no-referrer" /></>}</div><div className="dg-summary"><strong>{maxLevel}/10</strong><span>difficultés vaincues</span><p>Une pièce par victoire. Chaque emplacement a 25 % de chances de tomber.</p><Link className="bt-btn" href="/equipe">Préparer mon équipe</Link></div></section>
    <section className="hs-team" aria-label="Équipe d’attaque"><h2 className="hs-h">Équipe d’attaque</h2>{ready ? <ul className="hs-cards">{team.map((card, i) => <li key={i} className={`hs-card hs-r-${card!.rarity}`}>
      <img src={card!.imageUrl} alt="" referrerPolicy="no-referrer" /><span>{card!.name}</span><small>{RARITY_NAMES[card!.rarity]}</small></li>)}</ul> : <p className="vt-muted">Compose une équipe de quatre personnages pour entrer dans le donjon.</p>}<Link className="bt-btn" href="/equipe">{ready ? "Modifier l’équipe" : "Composer l’équipe"}</Link></section>
    <section className="dg-levels" aria-label="Difficultés du donjon"><h2>Difficultés</h2>{levels.map((d) => <article className="dg-level" data-locked={!d.open || undefined} key={d.level}><div className="dg-level-no">{String(d.level).padStart(2, "0")}</div><div className="dg-level-info"><h3>Difficulté {d.level}<small data-rarity={d.rarity}>{RARITY_NAMES[d.rarity]}</small></h3><p>{d.mechanic}</p>{!d.open && <span className="dg-lock">Termine la difficulté {d.level - 1} pour débloquer</span>}<small>1 artefact · 25 % par emplacement{d.resource ? ` · ${d.resource} matériau${d.resource > 1 ? "x" : ""}` : ""}</small></div><div className="dg-level-actions"><button type="button" className="bt-btn" disabled={!d.open || !ready || pending} onClick={() => run(d.level, true)}>Manuel</button><button type="button" className="bt-btn" disabled={!d.open || !ready || pending} onClick={() => run(d.level, false)}>Auto</button></div></article>)}</section>
    <details className="dg-rules"><summary>Butin, probabilités et bonus de set</summary><p>Chaque victoire donne exactement un artefact. Casque, plastron, gants et bottes ont chacun 25 % de chances. Les difficultés 1–2 donnent N, 3–4 R, 5–6 SR, 7–8 SSR et 9–10 UR.</p><p>Casque et plastron : PV, DEF ou ATK, en valeur fixe ou en %. Gants : ATK fixe, ATK %, taux critique, compétence magique ou dégâts critiques. Bottes : vitesse, ATK/DEF/PV fixes ou en %. Chaque stat principale possible a la même probabilité. Sous-stats : commun 0, rare 1, épique 2, légendaire 3 (SSR et UR). Elles sont distinctes et différentes de la stat principale : vitesse, ATK/DEF/PV fixes ou en %, taux critique, dégâts critiques ou compétence magique. Leur qualité est tirée à 80, 90 ou 100 % de la valeur de base. Amélioration jusqu’à +16 ; aux niveaux 4, 8, 12 et 16, une sous-stat est révélée ; si les quatre sont déjà présentes, une sous-stat aléatoire est doublée.</p><p>Set 2 pièces : +5 % ATK ; 4 pièces : +10 % ATK et +15 % dégâts critiques. À partir du niveau 7, chaque victoire ajoute aussi des matériaux de donjon. Pas de coût d’entrée, pas de plafond quotidien.</p><Link href="/inventaire">Voir les artefacts et les équiper</Link></details>
    <section className="dg-owned"><h2>Ton butin récent</h2>{artifacts.length ? <ul>{artifacts.slice(0, 4).map((a) => <li key={a.id}><b>{RARITY_NAMES[a.rarity]} {SLOT_NAMES[a.slot]}</b><span>{artifactStatLabel(a.mainStat)} : {artifactStatValue(a.mainStat, a.mainValue)}</span>{a.subStats.map((s, i) => <small key={i}>{artifactStatLabel(s.stat)} : {artifactStatValue(s.stat, s.value)}</small>)}{a.equipped && <small>Équipé sur {a.equipped}</small>}</li>)}</ul> : <p>Les artefacts gagnés apparaîtront ici et dans ton inventaire.</p>}<Link href="/inventaire">Ouvrir l’inventaire</Link></section>
    {error && <p className="hs-error" role="alert">{error}</p>}
  </>;
}
