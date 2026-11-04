import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PlayerName } from "@/components/PlayerName";
import { SceneBody } from "@/components/SceneBody";
import { eloLeaderboard } from "@/lib/duels";
import { collectionLeaderboard } from "@/lib/leaderboard";
import { guildLeaderboard } from "@/lib/guilds";
import { getSessionUser } from "@/lib/session";
import "./leaderboard.css";
import { PageHeading } from "@/components/mq/PageHeading";

export const metadata: Metadata = { title: "Classement — Anime Masters" };
const num = new Intl.NumberFormat("fr-FR");

const TABS = [
  ["collection", "Collection"],
  ["duel", "Duel"],
  ["guild-collection", "Guildes · Collection"],
  ["guild-duels", "Guildes · Duels"],
] as const;

export default function LeaderboardPage({
  searchParams,
}: PageProps<"/leaderboard">) {
  return (
    <main className="vt">
      <SceneBody night scroll />
      <Suspense fallback={<p className="vt-inner vt-muted">Chargement…</p>}>
        <Leaderboard searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Leaderboard({
  searchParams,
}: {
  searchParams: PageProps<"/leaderboard">["searchParams"];
}) {
  const raw = (await searchParams).tab;
  const asked = Array.isArray(raw) ? raw[0] : raw;
  const tab = asked === "duel" || asked === "guild-collection" || asked === "guild-duels" ? asked : "collection";
  const guildTab = tab === "guild-collection" || tab === "guild-duels";
  const user = await getSessionUser();
  const [{ top, me, players }, elo, guilds] = await Promise.all([
    guildTab ? Promise.resolve({ top: [], me: null, players: 0 }) : collectionLeaderboard(user?.id ?? null),
    guildTab ? Promise.resolve({ top: [], me: null, players: 0 }) : eloLeaderboard(user?.id ?? null),
    guildTab ? guildLeaderboard(tab === "guild-duels" ? "duels" : "collection") : Promise.resolve([]),
  ]);
  const eloRow = (r: (typeof elo.top)[number]) => (
    <li key={r.userId} data-me={r.userId === user?.id}>
      <span className="rank">{r.rank}</span>
      <PlayerName username={r.username} title={r.title} guildTag={r.guildTag} />
      <span className="vt-muted">
        {r.wins} victoire{r.wins > 1 ? "s" : ""} sur {r.played} duel
        {r.played > 1 ? "s" : ""}
      </span>
      <span className="score">{num.format(r.elo)}</span>
    </li>
  );
  const row = (r: (typeof top)[number]) => (
    <li key={r.userId} data-me={r.userId === user?.id}>
      <span className="rank">{r.rank}</span>
      <PlayerName username={r.username} title={r.title} guildTag={r.guildTag} />
      <span className="vt-muted">{num.format(r.unique)} personnages</span>
      <span className="score">{num.format(r.score)}</span>
    </li>
  );
  return (
    <div className="vt-inner mq-leaderboard">
      <PageHeading eyebrow="PANTHÉON DES INVOCATEURS" title="Classement" />
      <div className="pg-tabs">
        <nav aria-label="Classement">
          {TABS.map(([k, label]) => (
            <Link
              key={k}
              href={`/leaderboard?tab=${k}`}
              aria-current={tab === k ? "page" : undefined}
              replace
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
      {guildTab ? <section><p className="vt-sub">{tab === "guild-duels" ? "Victoires en duel des membres actuels depuis lundi 0 h, heure de Paris." : "Somme des scores Collection des membres actuels, selon la même formule que le classement individuel."} <Link href="/guilds" className="underline">Trouver une guilde</Link></p>{guilds.length ? <ol className="rank-list">{guilds.map((g) => <li key={g.id}><span className="rank">{g.rank}</span><Link href={`/guilds/${g.tag}`}>[{g.tag}] {g.name}</Link><span className="vt-muted">{g.members} / 20 membres</span><span className="score">{num.format(g.score)}</span></li>)}</ol> : <p className="vt-empty">Aucune guilde pour l’instant.</p>}</section> : tab === "duel" ? (
        <section>
          <p className="vt-sub">
            Elo : départ à 1 000, ±16 environ par duel entre joueurs de même
            niveau. Un forfait compte comme une défaite.{" "}
            <Link href="/duels" className="underline">
              Défier un joueur
            </Link>
          </p>
          {elo.top.length === 0 ? (
            <p className="vt-empty">Aucun duel terminé pour l&apos;instant.</p>
          ) : (
            <ol className="rank-list">
              {elo.top.map(eloRow)}
              {elo.me && elo.me.rank > elo.top.length && (
                <>
                  <li className="gap" aria-hidden>
                    …
                  </li>
                  {eloRow(elo.me)}
                </>
              )}
            </ol>
          )}
        </section>
      ) : (
        <section>
          <p className="vt-sub">
            Personnages uniques, N 1 · R 3 · SR 10 · SSR 40 · UR 200 points, +50
            % avec la Holo et +100 % avec la Gold.{" "}
            <Link href="/achievements" className="underline">
              Voir les succès
            </Link>
          </p>
          {top.length === 0 ? (
            <p className="vt-empty">Personne n&apos;a encore de carte.</p>
          ) : (
            <ol className="rank-list">
              {top.map(row)}
              {me && me.rank > top.length && (
                <>
                  <li className="gap" aria-hidden>
                    …
                  </li>
                  {row(me)}
                </>
              )}
            </ol>
          )}
          <p className="vt-count">
            {players} joueur{players > 1 ? "s" : ""} classé
            {players > 1 ? "s" : ""}
          </p>
        </section>
      )}
    </div>
  );
}
