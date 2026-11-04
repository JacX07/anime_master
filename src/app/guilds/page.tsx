import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SceneBody } from "@/components/SceneBody";
import { PageHeading } from "@/components/mq/PageHeading";
import { Icon } from "@/components/icons";
import { requireUser } from "@/lib/session";
import { listGuilds } from "@/lib/guilds";
import { GUILD_COOLDOWN_MS, GUILD_COST, GUILD_MAX } from "@/lib/guild-rules";
import { GuildAction, GuildForm } from "./GuildControls";
import "./guilds.css";
export const metadata: Metadata = { title: "Guildes — Anima Clash", robots: { index: false } };

export default function GuildsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return <main className="vt"><SceneBody night scroll/><Suspense fallback={<p className="vt-inner vt-muted">Chargement…</p>}><Guilds searchParams={searchParams}/></Suspense></main>;
}
async function Guilds({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const query = (await searchParams).q;
  const state = await listGuilds(user.id, typeof query === "string" ? query : "");
  const cooldown = state.cooldown;
  return <div className="vt-inner guild-page"><PageHeading eyebrow="ALLIANCES DES UNIVERS" title="Guildes" description="Rassemble jusqu’à 20 joueurs sous une même bannière."/>
    {state.me.guild && <p className="guild-membership">Ta guilde : <Link className="ui-button" href={`/guilds/${state.me.guild.tag}`}>[{state.me.guild.tag}] {state.me.guild.name}</Link></p>}
    {cooldown && <p className="guild-notice" role="status">Tu pourras créer ou rejoindre une guilde le {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(state.me.guildLeftAt!.getTime() + GUILD_COOLDOWN_MS))}.</p>}
    <div className="guild-layout"><section className="guild-panel" aria-label="Annuaire des guildes"><h2>Trouver une guilde</h2><form className="guild-search" action="/guilds"><label className="sr-only" htmlFor="guild-query">Nom ou tag</label><input id="guild-query" name="q" placeholder="Nom ou tag…" defaultValue={typeof query === "string" ? query : ""} maxLength={40}/><button className="ui-button" type="submit">Rechercher</button></form>
      <p className="vt-muted">{state.guilds.length} guilde{state.guilds.length === 1 ? "" : "s"} affichée{state.guilds.length === 1 ? "" : "s"} · 50 résultats maximum</p>
      {!state.guilds.length ? <p className="guild-empty">Aucune guilde ne correspond. Crée la première bannière de ton groupe.</p> : <ul className="guild-directory">{state.guilds.map((g) => <li key={g.id}><Icon name={g.icon}/><div><h3><Link href={`/guilds/${g.tag}`}>[{g.tag}] {g.name}</Link></h3><p>{g.description || "Une nouvelle bannière attend ses compagnons."}</p><small>{g._count.members} / {GUILD_MAX} membres · {g.joinMode === "OPEN" ? "Ouverte" : "Sur demande"}</small></div>{state.requested.includes(g.id) ? <GuildAction operation="cancel" guildId={g.id}>Annuler la demande</GuildAction> : !state.me.guildId && <GuildAction operation="join" guildId={g.id} disabled={cooldown || g._count.members >= GUILD_MAX}>{g._count.members >= GUILD_MAX ? "Complète" : g.joinMode === "OPEN" ? "Rejoindre" : "Demander à rejoindre"}</GuildAction>}</li>)}</ul>}
    </section><section className="guild-panel" aria-label="Créer une guilde"><h2>Créer une guilde</h2><p>Coût unique : {GUILD_COST.toLocaleString("fr-FR")} Ryō. Une seule guilde par joueur.</p><p className="vt-muted">Ton solde : {state.me.balance.toLocaleString("fr-FR")} Ryō.</p>{state.me.guildId ? <p>Quitte ta guilde pour en créer une autre. Un délai de 24 h s’appliquera.</p> : <><GuildForm disabled={cooldown || state.me.balance < GUILD_COST}/>{state.me.balance < GUILD_COST && <p className="guild-notice">Il te manque {(GUILD_COST - state.me.balance).toLocaleString("fr-FR")} Ryō.</p>}</>}</section></div>
  </div>;
}
