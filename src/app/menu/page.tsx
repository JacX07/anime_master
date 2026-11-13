import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/auth-actions";
import { Icon } from "@/components/icons";
import { PageHeading } from "@/components/mq/PageHeading";
import { prisma } from "@/lib/db";
import { devToolsEnabled } from "@/lib/dev-tools";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Menu — Anima Clash", robots: { index: false } };

export default function MenuPage() {
  return <main className="vt"><Suspense fallback={<p className="vt-inner vt-muted" role="status">Chargement du menu…</p>}><MenuHub /></Suspense></main>;
}

async function MenuHub() {
  const user = await requireUser();
  const account = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { role: true } });
  const groups = [
    { title: "Progression", links: [
      { href: `/u/${encodeURIComponent(user.username)}`, label: "Mon profil", icon: "coeur" },
      { href: "/quetes", label: "Quêtes", icon: "quetes" },
      { href: "/achievements", label: "Succès", icon: "etoile" },
      { href: "/leaderboard", label: "Classements", icon: "classement" },
      { href: "/wishlist", label: "Souhaits", icon: "souhait" },
    ] },
    { title: "Communauté", links: [
      { href: "/friends", label: "Amis", icon: "coeur" },
      { href: "/guilds", label: "Guildes", icon: "squads" },
      { href: "/notifications", label: "Notifications", icon: "cloche" },
    ] },
    { title: "Économie et amélioration", links: [
      { href: "/market", label: "Marché", icon: "nav-marche" },
      { href: "/trades", label: "Échanges", icon: "echange" },
      { href: "/forge", label: "Forge", icon: "forge" },
      { href: "/eveil", label: "Éveil", icon: "eveil" },
    ] },
    { title: "Système", links: [
      { href: "/guide", label: "Guide du jeu", icon: "quetes" },
      { href: "/parametres", label: "Paramètres", icon: "parametres" },
      { href: "/changelog", label: "Mises à jour", icon: "lecture" },
      ...(account.role !== "player" ? [{ href: "/admin", label: "Administration", icon: "parametres" }] : []),
      ...(devToolsEnabled() ? [{ href: "/outils", label: "Outils de développement", icon: "modifier" }] : []),
    ] },
  ];
  return <div className="vt-inner mobile-hub">
    <PageHeading eyebrow={user.username} title="Menu" description="Ta progression, la communauté et les réglages du jeu." />
    <div className="mobile-menu-groups">{groups.map((group) => <section key={group.title} className="mobile-menu-group">
      <h2>{group.title}</h2>
      <nav aria-label={group.title}>{group.links.map((link) => <Link key={link.href} href={link.href} className="mobile-menu-link"><Icon name={link.icon} /><span>{link.label}</span><span aria-hidden="true">›</span></Link>)}</nav>
    </section>)}</div>
    <form action={signOut}><button type="submit" className="ui-button">Se déconnecter</button></form>
  </div>;
}
