import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SceneBody } from "@/components/SceneBody";
import { eloLeaderboard } from "@/lib/duels";
import { collectionLeaderboard } from "@/lib/leaderboard";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Classement — Anime Masters" };
const num = new Intl.NumberFormat("fr-FR");

export default function LeaderboardPage() {
  return (
    <main className="vt">
      <SceneBody night scroll />
      <Suspense fallback={<p className="vt-inner vt-muted">Chargement…</p>}>
        <Leaderboard />
      </Suspense>
    </main>
  );
}

async function Leaderboard() {
  const user = await getSessionUser();
  const [{ top, me, players }, elo] = await Promise.all([collectionLeaderboard(user?.id ?? null), eloLeaderboard(user?.id ?? null)]);
  const eloRow = (r: (typeof elo.top)[number]) => (
    <li key={r.userId} data-me={r.userId === user?.id}>
      <span className="rank">{r.rank}</span>
      <b>{r.username}</b>
      <span className="vt-muted">
        {r.wins} victoire{r.wins > 1 ? "s" : ""} sur {r.played} duel{r.played > 1 ? "s" : ""}
      </span>
      <span className="score">{num.format(r.elo)}</span>
    </li>
  );
  const row = (r: (typeof top)[number]) => (
    <li key={r.userId} data-me={r.userId === user?.id}>
      <span className="rank">{r.rank}</span>
      <b>{r.username}</b>
      <span className="vt-muted">{num.format(r.unique)} personnages</span>
      <span className="score">{num.format(r.score)}</span>
    </li>
  );
  return (
    <div className="vt-inner">
      <header>
        <h1 className="vt-title">Classement</h1>
      </header>
      <section>
        <h2 className="vt-h2">Duel</h2>
        <p className="vt-sub">
          Elo : départ à 1 000, ±16 environ par duel entre joueurs de même niveau. Un forfait compte comme une défaite.{" "}
          <Link href="/duels" className="underline">Défier un joueur</Link>
        </p>
        {elo.top.length === 0 ? (
          <p className="vt-empty">Aucun duel terminé pour l&apos;instant.</p>
        ) : (
          <ol className="rank-list">
            {elo.top.map(eloRow)}
            {elo.me && elo.me.rank > elo.top.length && (
              <>
                <li className="gap" aria-hidden>…</li>
                {eloRow(elo.me)}
              </>
            )}
          </ol>
        )}
      </section>
      <section>
        <h2 className="vt-h2">Collection</h2>
        <p className="vt-sub">
          Personnages uniques, N 1 · R 3 · SR 10 · SSR 40 · UR 200 points, +50 % avec la Holo et +100 % avec la Gold.{" "}
          <Link href="/achievements" className="underline">Voir les succès</Link>
        </p>
        {top.length === 0 ? (
          <p className="vt-empty">Personne n&apos;a encore de carte.</p>
        ) : (
          <ol className="rank-list">
            {top.map(row)}
            {me && me.rank > top.length && (
              <>
                <li className="gap" aria-hidden>…</li>
                {row(me)}
              </>
            )}
          </ol>
        )}
        <p className="vt-count">{players} joueur{players > 1 ? "s" : ""} classé{players > 1 ? "s" : ""}</p>
      </section>
    </div>
  );
}
