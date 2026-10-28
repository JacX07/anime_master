import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Money } from "@/components/icons";
import { SceneBody } from "@/components/SceneBody";
import { listAchievements } from "@/lib/achievements";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Succès — Anime Masters" };
const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

const TABS = [
  ["tous", "Tous"],
  ["a-debloquer", "À débloquer"],
  ["debloques", "Débloqués"],
] as const;

export default function AchievementsPage({ searchParams }: PageProps<"/achievements">) {
  return (
    <main className="vt">
      <SceneBody night scroll />
      <Suspense fallback={<p className="vt-inner vt-muted">Chargement…</p>}>
        <Achievements searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Achievements({ searchParams }: { searchParams: PageProps<"/achievements">["searchParams"] }) {
  const user = await requireUser();
  const list = await listAchievements(user.id);
  const done = list.filter((a) => a.unlockedAt).length;
  const raw = (await searchParams).tab;
  const asked = Array.isArray(raw) ? raw[0] : raw;
  const tab = TABS.some(([k]) => k === asked) ? asked : "tous";
  const shown = list.filter((a) => (tab === "debloques" ? a.unlockedAt : tab === "a-debloquer" ? !a.unlockedAt : true));
  const count = { tous: list.length, "a-debloquer": list.length - done, debloques: done };
  return (
    <div className="vt-inner">
      <header className="pg-head">
        <h1 className="vt-title">Succès</h1>
        <p className="vt-sub">{done} sur {list.length} débloqués. Chaque succès rapporte des Ryō, et parfois des cristaux spéciaux, une seule fois.</p>
      </header>
      <div className="pg-tabs">
        <nav aria-label="Succès">
          {TABS.map(([k, label]) => (
            <Link key={k} href={`/achievements?tab=${k}`} aria-current={tab === k ? "page" : undefined} replace>
              {label}
              <small>{count[k]}</small>
            </Link>
          ))}
        </nav>
      </div>
      <ul className="ach-grid">
        {shown.map((a) => (
          <li key={a.key} data-done={a.unlockedAt !== null}>
            <b>{a.label}</b>
            <span className="vt-muted">{a.description}</span>
            <span className="ach-foot">
              <Money n={a.reward} />
              {a.special ? <span className="vt-muted">+{a.special} cristaux spéciaux</span> : null}
              {a.unlockedAt && <time className="vt-muted">{dateFmt.format(a.unlockedAt)}</time>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
