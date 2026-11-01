import { modeLockPanel } from "@/components/AdventureLock";
import type { Metadata } from "next";
import { Suspense } from "react";
import { SceneBody } from "@/components/SceneBody";
import { getDungeonState } from "@/lib/battles";
import { requireUser } from "@/lib/session";
import { DUNGEON_NAME, levelReward, type ArtifactSlot } from "@/lib/dungeons";
import { prisma } from "@/lib/db";
import { DungeonsBoard } from "./DungeonsBoard";
import "./donjons.css";

export const metadata: Metadata = { title: "Donjons — Anime Masters", robots: { index: false } };

export default function DungeonsPage() {
  return <main className="vt"><SceneBody night scroll /><Suspense fallback={<p className="vt-inner vt-muted">Chargement du donjon…</p>}><Dungeon /></Suspense></main>;
}

async function Dungeon() {
  const user = await requireUser();
  const locked = await modeLockPanel(user.id, "dungeon");
  if (locked) return locked;
  const [state, boss] = await Promise.all([
    getDungeonState(user.id),
    prisma.character.findFirst({ where: { disabled: false, rarity: "UR", mainMedia: { franchiseId: 21 } }, orderBy: [{ favourites: "desc" }, { id: "asc" }], select: { name: true, imageUrl: true } }),
  ]);
  const artifacts = state.artifacts.map((a) => ({ id: a.id, slot: a.slot as ArtifactSlot, rarity: a.rarity, mainStat: a.mainStat, mainValue: a.mainValue, subStats: a.subStats as { stat: string; value: number }[], equipped: a.equippedCard?.character.name ?? null }));
  return <div className="vt-inner dungeon-page">
    <header className="pg-head"><h1 className="vt-title">Donjons</h1><p className="vt-sub">Affronte le gardien du Trône des profondeurs, gagne des artefacts du set One Piece et fais progresser ton équipe. Les tentatives sont illimitées ; une défaite ne dépense rien.</p></header>
    <DungeonsBoard name={DUNGEON_NAME} boss={boss} maxLevel={state.maxLevel} team={state.team.map((c) => c ? { id: c.id, name: c.character.name, imageUrl: c.character.imageUrl, rarity: c.character.rarity } : null)} artifacts={artifacts} levels={Array.from({ length: 10 }, (_, i) => { const level = i + 1; const r = levelReward(level); return { level, rarity: r.rarity, resource: r.resource, mechanic: r.mechanic, open: level <= state.maxLevel + 1 }; })} />
  </div>;
}
