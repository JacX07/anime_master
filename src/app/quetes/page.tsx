import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { getAdventure } from "@/lib/adventure-state";
import { getPeriodicQuests } from "@/lib/periodic-quests";
import { PVP_AVAILABLE } from "@/lib/feature-flags";
import { QuestBoard, type PeriodicQuestView } from "./QuestBoard";
import "./quetes.css";
import { PageHeading } from "@/components/mq/PageHeading";

export const metadata = { title: "Quêtes — Anime Masters", robots: { index: false } };
export default function QuestsPage() {
  return <main className="vt"><div className="vt-inner quest-page"><PageHeading eyebrow="CARNET D’ARPENTEUR" title="Quêtes" description="Suis les quêtes principales pour gagner de l’XP et récupère les cristaux des quêtes quotidiennes et hebdomadaires." /><Suspense fallback={<p>Ouverture du carnet…</p>}><Journal /></Suspense></div></main>;
}
async function Journal() {
  const user = await requireUser();
  const adventure = await getAdventure(user.id);
  // Pas de quête impossible à accomplir : expéditions tant qu'elles sont verrouillées, duels tant que l'arène est fermée
  const expeditions = adventure.modes.find((m) => m.key === "expeditions")?.unlocked ?? false;
  const quests: PeriodicQuestView[] = (await getPeriodicQuests(user.id))
    .filter((q) => (expeditions || !q.metric.startsWith("expeditions")) && (PVP_AVAILABLE || q.metric !== "duelWins"))
    .map(({ key, period, title, description, target, progress, crystals, claimed, claimable }) => ({ key, period, title, description, target, progress, crystals, claimed, claimable }));
  return <QuestBoard state={adventure} quests={quests} />;
}
