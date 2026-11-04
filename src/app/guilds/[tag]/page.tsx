import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SceneBody } from "@/components/SceneBody";
import { PageHeading } from "@/components/mq/PageHeading";
import { PlayerName } from "@/components/PlayerName";
import { Icon } from "@/components/icons";
import { getGuild } from "@/lib/guilds";
import { GUILD_MAX, GUILD_ROLES } from "@/lib/guild-rules";
import { seenLabel } from "@/lib/friends";
import { requireUser } from "@/lib/session";
import { GuildAction, GuildForm } from "../GuildControls";
import "../guilds.css";
export const metadata: Metadata = { title: "Guilde — Anima Clash", robots: { index: false } };
export default function GuildPage({ params }: { params: Promise<{ tag: string }> }) {
  return <main className="vt"><SceneBody night scroll/><Suspense fallback={<p className="vt-inner vt-muted">Chargement…</p>}><Guild params={params}/></Suspense></main>;
}
async function Guild({ params }: { params: Promise<{ tag: string }> }) {
  const user = await requireUser();
  const state = await getGuild(user.id, (await params).tag);
  if (!state) notFound();
  const { guild, me } = state;
  const member = me.guildId === guild.id;
  const owner = member && me.guildRole === "OWNER";
  const manager = member && me.guildRole !== "MEMBER";
  const cooldown = state.cooldown;
  return <div className="vt-inner guild-page"><PageHeading eyebrow={`BANNIÈRE ${guild.tag}`} title={guild.name} description={guild.description || "Une bannière, des compagnons, un même voyage."}><Link href="/guilds" className="ui-button">Toutes les guildes</Link></PageHeading>
    <div className="guild-overview"><Icon name={guild.icon}/><p>[{guild.tag}] · {guild.members.length} / {GUILD_MAX} membres · {guild.joinMode === "OPEN" ? "Entrée ouverte" : "Sur demande"}</p>{member ? <GuildAction operation="leave" guildId={guild.id} back confirm={owner && guild.members.length === 1 ? "Tu es seul : quitter dissoudra la guilde. Aucun remboursement. Continuer ?" : "Quitter la guilde ? Un délai de 24 h s’appliquera."}>Quitter la guilde</GuildAction> : state.requested ? <GuildAction operation="cancel" guildId={guild.id}>Annuler la demande</GuildAction> : <GuildAction operation="join" guildId={guild.id} disabled={!!me.guildId || cooldown || guild.members.length >= GUILD_MAX}>{guild.joinMode === "OPEN" ? "Rejoindre la guilde" : "Demander à rejoindre"}</GuildAction>}</div>
    {!member && (me.guildId || cooldown) && <p className="guild-notice">{me.guildId ? "Tu appartiens déjà à une autre guilde." : "Attends 24 h après ton départ avant une nouvelle adhésion."}</p>}
    <section className="guild-panel" aria-label="Membres de la guilde"><h2>Membres</h2><ul className="guild-members">{guild.members.map((u) => <li key={u.id}><div><PlayerName username={u.username} guildTag={guild.tag}/><small>{GUILD_ROLES[u.guildRole]} · {seenLabel(u.lastSeenAt)}</small></div>{owner && u.id !== me.id && <div className="guild-actions"><GuildAction operation={u.guildRole === "OFFICER" ? "demote" : "promote"} guildId={guild.id} targetId={u.id}>{u.guildRole === "OFFICER" ? "Retirer le rôle d’officier" : "Nommer officier"}</GuildAction><GuildAction operation="transfer" guildId={guild.id} targetId={u.id} confirm={`Transmettre définitivement le rôle de chef à ${u.username} ?`}>Transmettre le rôle de chef</GuildAction></div>}{manager && u.id !== me.id && u.guildRole !== "OWNER" && (owner || u.guildRole === "MEMBER") && <GuildAction operation="kick" guildId={guild.id} targetId={u.id} confirm={`Expulser ${u.username} de la guilde ?`}>Expulser</GuildAction>}</li>)}</ul></section>
    {manager && <section className="guild-panel" aria-label="Demandes d’adhésion"><h2>Demandes d’adhésion ({state.requests.length})</h2>{!state.requests.length ? <p className="vt-muted">Aucune demande en attente.</p> : <ul className="guild-members">{state.requests.map((r) => <li key={r.id}><PlayerName username={r.user.username}/><div className="guild-actions"><GuildAction operation="accept" guildId={guild.id} targetId={r.id}>Accepter</GuildAction><GuildAction operation="refuse" guildId={guild.id} targetId={r.id}>Refuser</GuildAction></div></li>)}</ul>}</section>}
    {owner && <section className="guild-panel" aria-label="Gestion de la guilde"><h2>Gestion de la guilde</h2><GuildForm key={guild.tag} guild={guild}/><div className="guild-danger"><p>La dissolution libère tous les membres, impose 24 h avant une nouvelle adhésion et ne rembourse pas les Ryō.</p><GuildAction operation="dissolve" guildId={guild.id} back confirm={`Dissoudre définitivement ${guild.name} et libérer tous les membres ?`}>Dissoudre la guilde</GuildAction></div></section>}
  </div>;
}
