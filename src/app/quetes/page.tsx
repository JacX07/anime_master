import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { getAdventure } from "@/lib/adventure-state";
import { QuestBoard } from "./QuestBoard";
import "./quetes.css";

export const metadata = { title: "Quêtes — Anime Masters", robots: { index: false } };
export default function QuestsPage() {
  return <main className="vt"><div className="vt-inner quest-page"><header className="pg-head"><h1 className="vt-title">Quêtes</h1><p className="vt-sub">Ton carnet d’Arpenteur. Traverse les histoires, renforce ton empreinte et ouvre de nouveaux passages.</p></header><Suspense fallback={<p>Ouverture du carnet…</p>}><Journal /></Suspense></div></main>;
}
async function Journal() {
  const user = await requireUser();
  const adventure = await getAdventure(user.id);
  return <QuestBoard state={adventure} />;
}
