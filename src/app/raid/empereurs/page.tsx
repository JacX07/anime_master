import { modeLockPanel } from "@/components/AdventureLock";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SceneBody } from "@/components/SceneBody";
import { prisma } from "@/lib/db";
import { getEmperorState } from "@/lib/battles";
import { getTeamContext } from "@/lib/team-context";
import { requireUser } from "@/lib/session";
import { EmperorBoard } from "./EmperorBoard";

export const metadata: Metadata = { title: "Raid — Défi des empereurs — Anime Masters" };

export default function EmperorsPage() {
  return <main className="vt"><SceneBody night scroll /><Suspense fallback={<p className="vt-inner vt-muted">Chargement…</p>}><Emperors /></Suspense></main>;
}

async function Emperors() {
  const user = await requireUser();
  const locked = await modeLockPanel(user.id, "raid");
  if (locked) return locked;
  const [state, context] = await Promise.all([getEmperorState(user.id), getTeamContext(user.id)]);
  const portraits = await prisma.character.findMany({ where: { id: { in: state.emperors.map((e) => e.characterId) } }, select: { id: true, imageUrl: true } });
  return <div className="vt-inner">
    <header className="pg-head">
      <h1 className="vt-title">Défi des empereurs</h1>
      <p className="vt-sub">Shanks, Big Mom, Kaido et Barbe Blanche. Chaque empereur garde deux vagues d’équipage ; le vaincre une fois par jour donne sa clé et sa ressource légendaire. Les quatre clés ouvrent le Hardcore. <Link href="/forge">Forge</Link></p>
    </header>
    <EmperorBoard state={state} portraits={Object.fromEntries(portraits.map((p) => [p.id, p.imageUrl]))} context={context} storageKey={`emperor-team:${user.id}`} />
  </div>;
}
