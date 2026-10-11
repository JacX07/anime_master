import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SceneBody } from "@/components/SceneBody";
import { duelQuota, listDuels, type DuelRow } from "@/lib/duels";
import { DUELS_PER_DAY } from "@/lib/duel-rules";
import { requireUser } from "@/lib/session";
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

export default function DuelsPage() {
  return (
    <main className="vt">
      <SceneBody night scroll />
      <Suspense fallback={<p className="vt-inner vt-muted">Chargement…</p>}>
        <Duels />
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
          <li key={d.id} data-status={d.status}>
            <Link href={`/duels/${d.id}`}>
              <b>{d.mine ? `Contre ${d.other}` : `Défi de ${d.other}`}</b>
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

async function Duels() {
  const user = await requireUser();
  const [duels, quota] = await Promise.all([listDuels(user.id), duelQuota(user.id)]);
  const open = duels.filter((d) => d.status === "PENDING" || d.status === "ACCEPTED");
  return (
    <div className="vt-inner">
      <header>
        <h1 className="vt-title">Duels</h1>
        <p className="vt-sub">
          Choisis 3 cartes et défie un joueur. Chacun répond de son côté à un quiz sur les cartes adverses ; chaque erreur laisse passer des dégâts. Elo {quota.elo} ·{" "}
          {quota.left} duel{quota.left > 1 ? "s" : ""} à lancer aujourd&apos;hui sur {DUELS_PER_DAY}. <Link href="/leaderboard" className="underline">Classement</Link>
        </p>
      </header>
      <NewDuelForm disabled={quota.left === 0} />
      <section>
        <h2 className="vt-h2">À faire</h2>
        <DuelList duels={open.filter((d) => todo(d))} empty="Rien à jouer pour l'instant." />
      </section>
      <section>
        <h2 className="vt-h2">En attente de l&apos;adversaire</h2>
        <DuelList duels={open.filter((d) => !todo(d))} empty="Aucun duel en attente." />
      </section>
      <section>
        <h2 className="vt-h2">Historique</h2>
        <DuelList duels={duels.filter((d) => d.status !== "PENDING" && d.status !== "ACCEPTED")} empty="Aucun duel terminé." />
      </section>
    </div>
  );
}
