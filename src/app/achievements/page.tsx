import type { Metadata } from "next";
import { Suspense } from "react";
import { Money } from "@/components/icons";
import { SceneBody } from "@/components/SceneBody";
import { listAchievements } from "@/lib/achievements";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Succès — Anime Masters" };
const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

export default function AchievementsPage() {
  return (
    <main className="vt">
      <SceneBody night scroll />
      <Suspense fallback={<p className="vt-inner vt-muted">Chargement…</p>}>
        <Achievements />
      </Suspense>
    </main>
  );
}

async function Achievements() {
  const user = await requireUser();
  const list = await listAchievements(user.id);
  const done = list.filter((a) => a.unlockedAt).length;
  return (
    <div className="vt-inner">
      <header>
        <h1 className="vt-title">Succès</h1>
        <p className="vt-sub">{done} sur {list.length} débloqués. Chaque succès rapporte des Ryō, une seule fois.</p>
      </header>
      <ul className="ach-grid">
        {list.map((a) => (
          <li key={a.key} data-done={a.unlockedAt !== null}>
            <b>{a.label}</b>
            <span className="vt-muted">{a.description}</span>
            <span className="ach-foot">
              <Money n={a.reward} />
              {a.unlockedAt && <time className="vt-muted">{dateFmt.format(a.unlockedAt)}</time>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
