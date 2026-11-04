import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeading } from "@/components/mq/PageHeading";
import { getAdventure } from "@/lib/adventure-state";
import { prisma } from "@/lib/db";
import { devToolsEnabled, materialKeys } from "@/lib/dev-tools";
import { DUNGEONS } from "@/lib/dungeons";
import { requireUser } from "@/lib/session";
import { RESOURCE_NAMES, UNIVERSES } from "@/lib/story";
import { DevTools } from "./DevTools";
import "./dev.css";

export const metadata = { title: "Outils de test — Anima Clash" };

/** Outils de test sur son propre compte, base de dev uniquement : 404 en production. */
export default function DevPage() {
  if (!devToolsEnabled()) notFound();
  return (
    <div className="vt-inner">
      <PageHeading eyebrow="BASE DE DEV" title="Outils de test" description="Agit sur ton compte connecté. Absent en production." />
      <Suspense fallback={<p className="dev-note">Chargement…</p>}><Tools /></Suspense>
    </div>
  );
}

async function Tools() {
  const user = await requireUser();
  const [adventure, u, tower, cards] = await Promise.all([
    getAdventure(user.id),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { balance: true, crystals: true } }),
    prisma.towerProgress.findUnique({ where: { userId: user.id }, select: { maxFloor: true } }),
    prisma.card.count({ where: { ownerId: user.id } }),
  ]);
  const unlocked = adventure.modes.filter((m) => m.unlocked).map((m) => m.label);
  return (
    <DevTools
      universes={UNIVERSES.map((u) => ({ key: u.key, name: `${u.rank}. ${u.name}` }))}
      dungeons={DUNGEONS.map((d) => ({ key: d.key, name: `${d.universe} — ${d.name}` }))}
      materials={materialKeys().map((k) => ({ key: k, name: RESOURCE_NAMES[k] ?? k }))}
      summary={[
        { label: "Arpenteur", value: `Niveau ${adventure.level}` },
        { label: "Modes ouverts", value: unlocked.length ? unlocked.join(", ") : "aucun" },
        { label: "Cartes", value: String(cards) },
        { label: "Tour", value: `Étage ${tower?.maxFloor ?? 0}` },
        { label: "Ryō", value: u.balance.toLocaleString("fr-FR") },
        { label: "Cristaux", value: String(u.crystals) },
      ]}
    />
  );
}
