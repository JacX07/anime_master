import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { signOut } from "@/app/auth-actions";
import { getAdventure } from "@/lib/adventure-state";
import { MAX_CRYSTALS } from "@/lib/crystal-stock";
import { getPackState } from "@/lib/packs";
import { getSessionUser } from "@/lib/session";
import { getWallet } from "@/lib/wallet";
import { prisma } from "@/lib/db";
import { titleOf } from "@/lib/achievements";
import { DailyBonus } from "../DailyBonus";
import { NotificationBell } from "../NotificationBell";
import { NavItem } from "./NavItem";
import { PlayMenu } from "./PlayMenu";
import { Navigation } from "./Navigation";

const num = new Intl.NumberFormat("fr-FR");

/** Barre du haut de la maquette : marque, navigation (Jouer au centre), saison et compte. */
export function SiteHeader() {
  return (
    <header className="mq-topbar">
      <Link href="/" className="mq-brand" aria-label="Anima Clash, accueil">
        <Image className="mq-brand-logo" src="/images/brand/anima-clash-logo.png" alt="Anima Clash" width={480} height={344} unoptimized />
      </Link>
      <Navigation>
      <nav className="mq-game-nav" aria-label="Navigation principale">
        <div className="mq-nav-side mq-nav-left">
          <NavItem href="/" exact>Accueil</NavItem>
          <div className="mq-nav-dropdown">
            <NavItem href="/album" match={["/wishlist", "/character"]}>Collection <span>⌄</span></NavItem>
            <div className="mq-dropdown-panel">
              <Link href="/album">Album</Link>
              <Link href="/wishlist">Souhaits</Link>
            </div>
          </div>
          <NavItem href="/inventaire" match={["/forge", "/eveil"]}>Inventaire</NavItem>
          <NavItem href="/equipe">Squads</NavItem>
        </div>
        <PlayMenu />
        <div className="mq-nav-side mq-nav-right">
          <div className="mq-nav-dropdown">
            <NavItem href="/quetes" match={["/guide"]}>Quêtes <span>⌄</span></NavItem>
            <div className="mq-dropdown-panel">
              <Link href="/quetes">Carnet de quêtes</Link>
              <Link href="/guide">Guide du jeu</Link>
            </div>
          </div>
          <div className="mq-nav-dropdown">
            <NavItem href="/market" match={["/trades"]}>Marché <span>⌄</span></NavItem>
            <div className="mq-dropdown-panel">
              <Link href="/market">Bourse</Link>
              <Link href="/trades">Échanges</Link>
            </div>
          </div>
          <NavItem href="/leaderboard">Classement</NavItem>
          <NavItem href="/achievements">Succès</NavItem>
          <NavItem href="/parametres">Paramètres</NavItem>
        </div>
      </nav>
      </Navigation>
      <div className="mq-header-actions">
        <div className="mq-season-mark">
          <small>SAISON I</small>
          <span>LA FAILLE</span>
        </div>
        <Suspense fallback={null}>
          <Account />
        </Suspense>
      </div>
    </header>
  );
}

/** Compte : bonus du jour, notifications, avatar dont le menu rappelle ressources et niveau. Lit la session : derrière un Suspense. */
async function Account() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <>
        <Link href="/login" className="mq-header-link">Connexion</Link>
        <Link href="/signup" className="mq-header-cta">Créer un compte</Link>
      </>
    );
  }
  const [wallet, packs, adventure, title, staff] = await Promise.all([getWallet(user.id), getPackState(user.id), getAdventure(user.id), equippedTitle(user.id), isStaff(user.id)]);
  return (
    <>
      <Suspense fallback={null}>
        <NotificationBell userId={user.id} />
      </Suspense>
      <div className="mq-nav-dropdown mq-account">
        <Link href={`/u/${encodeURIComponent(user.username)}`} className="mq-player" aria-label={`Profil de ${user.username}`}>
          <span className={`mq-avatar ${wallet.canClaimBonus ? "mq-active" : ""}`}>{user.username.slice(0, 2).toUpperCase()}</span>
          <span className="mq-player-text">
            <b>{user.username}</b>
            {title && <small>{title}</small>}
            <small>Arpenteur niv. {adventure.level}</small>
            <small>Puissance {num.format(packs.collectionPower)}</small>
          </span>
        </Link>
        <form action={signOut} className="mq-dropdown-panel mq-account-panel">
          {wallet.canClaimBonus && <DailyBonus />}
          <p className="mq-account-name">{user.username}<small>{title ? `${title} · ` : ""}Arpenteur niv. {adventure.level}</small><small>Puissance {num.format(packs.collectionPower)}</small></p>
          <dl>
            <div><dt>Ryō</dt><dd>{num.format(wallet.balance)}</dd></div>
            <div><dt>Cristaux</dt><dd>{packs.available} / {MAX_CRYSTALS}</dd></div>
          </dl>
          <Link href={`/u/${encodeURIComponent(user.username)}`}>Profil</Link>
          {staff && <Link href="/admin">Administration</Link>}
          <button type="submit">Se déconnecter</button>
        </form>
      </div>
    </>
  );
}

/** Titre équipé (choisi sur le profil) s'il est bien débloqué. */
async function equippedTitle(userId: string): Promise<string | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { title: true } });
  if (!u?.title) return null;
  const unlocked = await prisma.userAchievement.findUnique({ where: { userId_key: { userId, key: u.title } }, select: { key: true } });
  return unlocked ? titleOf(u.title) : null;
}

/** Modérateur ou admin : seul cas où le lien « Administration » apparaît (la page revérifie le rôle). */
async function isStaff(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return !!u && u.role !== "player";
}
