import Link from "next/link";
import { modeLockPanel } from "@/components/AdventureLock";
import type { Metadata } from "next";
import { Suspense } from "react";
import { SceneBody } from "@/components/SceneBody";
import { getDungeonAccess, getDungeonState } from "@/lib/battles";
import { getTeamContext } from "@/lib/team-context";
import { requireUser } from "@/lib/session";
import { DUNGEON_UNLOCK_LEVEL, DUNGEONS, dungeonOf, levelReward, type ArtifactSlot } from "@/lib/dungeons";
import { prisma } from "@/lib/db";
import { DungeonsBoard } from "./DungeonsBoard";
import "./donjons.css";

export const metadata: Metadata = { title: "Donjons — Anime Masters", robots: { index: false } };

export default function DungeonsPage({ searchParams }: { searchParams: Promise<{ set?: string }> }) {
  return <main className="vt"><SceneBody night scroll /><Suspense fallback={<p className="vt-inner vt-muted">Chargement du donjon…</p>}><Dungeon searchParams={searchParams} /></Suspense></main>;
}

async function Dungeon({ searchParams }: { searchParams: Promise<{ set?: string }> }) {
  const selected = (await searchParams).set;
  const dungeon = dungeonOf(selected ?? "one-piece") ?? DUNGEONS[0];
  const user = await requireUser();
  const locked = await modeLockPanel(user.id, "dungeon");
  if (locked) return locked;
  const access = await getDungeonAccess(user.id);
  const nav = <div className="pg-tabs"><nav className="dg-universes" aria-label="Univers du donjon">{DUNGEONS.map((d) => access[d.key].unlocked
    ? <Link key={d.key} href={`/donjons?set=${d.key}`} aria-current={d.key === dungeon.key ? "page" : undefined}>{d.universe}</Link>
    : <Link key={d.key} href={`/donjons?set=${d.key}`} className="dg-locked" aria-current={d.key === dungeon.key ? "page" : undefined} title={`Gagne le combat ${DUNGEON_UNLOCK_LEVEL} de l'histoire ${d.universe}`}>{d.universe} · verrouillé</Link>)}</nav></div>;
  if (!access[dungeon.key].unlocked) return <div className="vt-inner dungeon-page">
    <header className="pg-head"><h1 className="vt-title">Donjons</h1><p className="vt-sub">Choisis ton univers, défie son gardien et récupère les artefacts de son set.</p></header>
    {nav}
    <section className="dg-lock" role="status"><h2>{dungeon.name} · verrouillé</h2><p>Gagne le combat {DUNGEON_UNLOCK_LEVEL} de l&apos;histoire {dungeon.universe} pour ouvrir ce donjon.</p><p className="dg-lock-progress">Histoire {dungeon.universe} : {Math.min(access[dungeon.key].storyLevel, DUNGEON_UNLOCK_LEVEL)} / {DUNGEON_UNLOCK_LEVEL}</p><Link className="bt-btn" href="/histoire">Aller à l&apos;histoire</Link></section>
  </div>;
  const [state, boss, context] = await Promise.all([
    getDungeonState(user.id, dungeon.key),
    prisma.character.findFirst({ where: { id: dungeon.bossId, disabled: false }, select: { name: true, imageUrl: true } }),
    getTeamContext(user.id),
  ]);
  const artifacts = state.artifacts.map((a) => ({ id: a.id, slot: a.slot as ArtifactSlot, rarity: a.rarity, mainStat: a.mainStat, mainValue: a.mainValue, subStats: a.subStats as { stat: string; value: number }[], equipped: a.equippedCard?.character.name ?? null }));
  return <div className="vt-inner dungeon-page">
    <header className="pg-head"><h1 className="vt-title">Donjons</h1><p className="vt-sub">Choisis ton univers, défie son gardien et récupère les artefacts de son set. Les tentatives sont illimitées ; une défaite ne dépense rien.</p></header>
    {nav}
    <DungeonsBoard key={dungeon.key} dungeon={dungeon} name={dungeon.name} boss={boss} maxLevel={state.maxLevel} context={context} storageKey={`dungeon-team:${user.id}`} artifacts={artifacts} levels={Array.from({ length: 10 }, (_, i) => { const level = i + 1; const r = levelReward(level, dungeon); return { level, rarity: r.rarity, resource: r.resource, mechanic: r.mechanic, open: level <= state.maxLevel + 1 }; })} />
  </div>;
}
