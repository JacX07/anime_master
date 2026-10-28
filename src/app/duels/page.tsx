import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SceneBody } from "@/components/SceneBody";
import { duelQuota, listDuels, type DuelRow } from "@/lib/duels";
import { DUELS_PER_DAY } from "@/lib/duel-rules";
import { requireUser } from "@/lib/session";
import { tintOf } from "@/lib/tint";
import { NewDuelForm } from "./NewDuelForm";

export const metadata: Metadata = { title: "Duels — Anime Masters" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

const STATUS: Record<DuelRow["status"], string> = {
  PENDING: "En attente",
  ACCEPTED: "En cours",
  DONE: "Terminé",
  DECLINED: "Refusé",
  EXPIRED: "Expiré",
  FORFEIT: "Forfait",
};
const OUTCOME = { win: "Victoire", draw: "Nul", loss: "Défaite" } as const;

const TABS = [
  ["a-faire", "À faire"],
  ["en-attente", "En attente"],
  ["historique", "Historique"],
] as const;
type Tab = (typeof TABS)[number][0];

export default function DuelsPage({ searchParams }: PageProps<"/duels">) {
  return (
    <main className="vt">
      <SceneBody night scroll />
      <Suspense fallback={<p className="vt-inner vt-muted">Chargement…</p>}>
        <Duels searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** Ce que le joueur doit faire sur ce duel, s'il y a quelque chose à faire. */
function todo(d: DuelRow) {
  if (d.status === "PENDING" && !d.mine) return `Choisir ton équipe avant le ${dateFmt.format(d.acceptDeadline)}`;
  if (d.status === "ACCEPTED" && !d.iPlayed) return `Jouer ta défense avant le ${dateFmt.format(d.playDeadline!)}`;
  return null;
}

function DuelList({ duels, empty }: { duels: DuelRow[]; empty: string }) {
  if (duels.length === 0) return <p className="vt-muted">{empty}</p>;
  return (
    <ul className="duel-list">
      {duels.map((d) => {
        const action = todo(d);
        return (
          <li key={d.id} data-status={d.status} style={{ "--w": tintOf(d.other) } as React.CSSProperties}>
            <Link href={`/duels/${d.id}`}>
              <b>{d.other}</b>
              <span className="trade-status">{d.outcome ? OUTCOME[d.outcome] : STATUS[d.status]}</span>
              <span className="vt-muted">
                {action ??
                  (d.status === "PENDING"
                    ? `${d.other} choisit son équipe`
                    : d.status === "ACCEPTED"
                      ? `En attente de la défense de ${d.other}`
                      : d.eloChange !== null
                        ? `Elo ${d.eloChange >= 0 ? "+" : ""}${d.eloChange}`
                        : dateFmt.format(d.createdAt))}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

async function Duels({ searchParams }: { searchParams: PageProps<"/duels">["searchParams"] }) {
  const user = await requireUser();
  const [duels, quota] = await Promise.all([listDuels(user.id), duelQuota(user.id)]);
  const open = duels.filter((d) => d.status === "PENDING" || d.status === "ACCEPTED");
  const lists: Record<Tab, { duels: DuelRow[]; empty: string }> = {
    "a-faire": { duels: open.filter((d) => todo(d)), empty: "Rien à jouer pour l'instant." },
    "en-attente": { duels: open.filter((d) => !todo(d)), empty: "Aucun duel en attente de l'adversaire." },
    historique: { duels: duels.filter((d) => d.status !== "PENDING" && d.status !== "ACCEPTED"), empty: "Aucun duel terminé." },
  };
  const raw = (await searchParams).tab;
  const asked = Array.isArray(raw) ? raw[0] : raw;
  const tab: Tab = TABS.some(([k]) => k === asked) ? (asked as Tab) : "a-faire";
  return (
    <div className="vt-inner">
      <header className="pg-head">
        <h1 className="vt-title">Duels</h1>
        <p className="vt-sub">
          Choisis 3 cartes et défie un joueur. Chacun répond de son côté à un quiz sur les cartes adverses ; chaque erreur laisse passer des dégâts. Elo {quota.elo} ·{" "}
          {quota.left} duel{quota.left > 1 ? "s" : ""} à lancer aujourd&apos;hui sur {DUELS_PER_DAY}. <Link href="/leaderboard" className="underline">Classement</Link>
        </p>
      </header>
      <div className="pg-tabs">
        <nav aria-label="Duels">
          {TABS.map(([k, label]) => (
            <Link key={k} href={`/duels?tab=${k}`} aria-current={tab === k ? "page" : undefined} replace>
              {label}
              <small>{lists[k].duels.length}</small>
            </Link>
          ))}
        </nav>
        <NewDuelForm disabled={quota.left === 0} />
      </div>
      <DuelList duels={lists[tab].duels} empty={lists[tab].empty} />
    </div>
  );
}
