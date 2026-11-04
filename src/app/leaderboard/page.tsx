import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SceneBody } from "@/components/SceneBody";
import { Leaderboard } from "@/components/board/Leaderboard";
import { eloLeaderboard } from "@/lib/duels";
import { buildBoard, collectionBoard, powerBoard, storyBoard, towerBoard, type Board } from "@/lib/rankings";
import { guildLeaderboard } from "@/lib/guilds";
import { getSessionUser } from "@/lib/session";
import "./leaderboard.css";
import { PageHeading } from "@/components/mq/PageHeading";

export const metadata: Metadata = { title: "Classement — Anime Masters" };
const num = new Intl.NumberFormat("fr-FR");

const TABS = [
  ["collection", "Collection"],
  ["power", "Puissance"],
  ["story", "Histoire"],
  ["tower", "Tour"],
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
        <Boards searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Boards({
  searchParams,
}: {
  searchParams: PageProps<"/leaderboard">["searchParams"];
}) {
  const raw = (await searchParams).tab;
  const asked = Array.isArray(raw) ? raw[0] : raw;
  const tab = TABS.some(([k]) => k === asked) ? (asked as (typeof TABS)[number][0]) : "collection";
  const guildTab = tab === "guild-collection" || tab === "guild-duels";
  const user = await getSessionUser();
  const me = user?.id ?? null;
  const guilds = guildTab ? await guildLeaderboard(tab === "guild-duels" ? "duels" : "collection") : [];
  let board: Board | null = null;
  if (tab === "collection") board = await collectionBoard(me);
  else if (tab === "power") board = await powerBoard(me);
  else if (tab === "story") board = await storyBoard(me);
  else if (tab === "tower") board = await towerBoard(me);
  else if (tab === "duel") {
    const elo = await eloLeaderboard(me, 1000);
    board = await buildBoard(
      [...elo.top, ...(elo.me && !elo.top.some((r) => r.userId === elo.me!.userId) ? [elo.me] : [])].map((r) => ({ userId: r.userId, score: r.elo, tie: r.rank, detail: `${r.wins} victoire${r.wins > 1 ? "s" : ""} sur ${r.played} duel${r.played > 1 ? "s" : ""}` })),
      me,
    );
  }
  const INTRO: Record<string, React.ReactNode> = {
    collection: <>Personnages uniques, N 1 · R 3 · SR 10 · SSR 40 · UR 200 points, +50 % avec la Holo et +100 % avec la Gold. <Link href="/achievements" className="underline">Voir les succès</Link></>,
    power: <>Somme des puissances de base de toutes tes cartes, doublons compris. L’équipement ne compte pas. <Link href="/inventaire" className="underline">Voir l’inventaire</Link></>,
    story: <>Étoiles obtenues dans le mode histoire : 1 pour la victoire, 2 sans K.O., 3 en duo. À égalité, le plus de combats gagnés. <Link href="/histoire" className="underline">Jouer l’histoire</Link></>,
    tower: <>Étage le plus haut atteint dans la Tour universelle. À égalité, le premier arrivé. <Link href="/tour" className="underline">Monter la Tour</Link></>,
    duel: <>Elo : départ à 1 000, ±16 environ par duel entre joueurs de même niveau. Un forfait compte comme une défaite. <Link href="/duels" className="underline">Défier un joueur</Link></>,
  };
  const UNIT: Record<string, [string, string]> = { collection: ["points", "personne n’a encore de carte."], power: ["points de puissance", "personne n’a encore de carte."], story: ["étoiles", "personne n’a encore gagné de combat."], tower: ["étages", "personne n’a encore gravi la Tour."], duel: ["points Elo", "aucun duel terminé pour l’instant."] };
  return (
    <div className="vt-inner mq-leaderboard">
      <PageHeading eyebrow="PANTHÉON DES INVOCATEURS" title="Classement" />
      <div className="pg-tabs">
        <nav aria-label="Classement">
          {TABS.map(([k, label]) => (
            <Link key={k} href={`/leaderboard?tab=${k}`} aria-current={tab === k ? "page" : undefined} replace>
              {label}
            </Link>
          ))}
        </nav>
      </div>
{guildTab ? <section><p className="vt-sub">{tab === "guild-duels" ? "Victoires en duel des membres actuels depuis lundi 0 h, heure de Paris." : "Somme des scores Collection des membres actuels, selon la même formule que le classement individuel."} <Link href="/guilds" className="underline">Trouver une guilde</Link></p>{guilds.length ? <ol className="rank-list">{guilds.map((g) => <li key={g.id}><span className="rank">{g.rank}</span><Link href={`/guilds/${g.tag}`}>[{g.tag}] {g.name}</Link><span className="vt-muted">{g.members} / 20 membres</span><span className="score">{num.format(g.score)}</span></li>)}</ol> : <p className="vt-empty">Aucune guilde pour l’instant.</p>}</section> : board && (
        <section>
          <p className="vt-sub">{INTRO[tab]}</p>
          <Leaderboard board={board} meId={me} unit={UNIT[tab][0]} empty={`Classement vide : ${UNIT[tab][1]}`} />
          {board.players > 0 && (
            <p className="vt-count">
              {board.players} joueur{board.players > 1 ? "s" : ""} classé{board.players > 1 ? "s" : ""}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
