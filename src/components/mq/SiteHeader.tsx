import Link from "next/link";
import Image from "next/image";
import { after } from "next/server";
import { Suspense } from "react";
import { devToolsEnabled } from "@/lib/dev-tools";
import { touchLastSeen } from "@/lib/friends";
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
import { Tutorial } from "../Tutorial";
import { Navigation } from "./Navigation";
import { AccountDropdown } from "./AccountDropdown";
import { Icon } from "../icons";
import { PVP_AVAILABLE } from "@/lib/feature-flags";

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
        <Suspense fallback={<PlayMenu />}>
          <PlayMenuWithLocks />
        </Suspense>
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
          <div className="mq-nav-dropdown">
            <NavItem href="/friends" match={["/guilds", "/leaderboard"]}>Social <span>⌄</span></NavItem>
            <div className="mq-dropdown-panel">
              <Link href="/friends">Amis</Link>
              <Link href="/guilds">Guildes</Link>
              <Link href="/leaderboard">Classement</Link>
            </div>
          </div>
          <NavItem href="/achievements">Succès</NavItem>
        </div>
      </nav>
      </Navigation>
      <div className="mq-header-actions">
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
  // Statut « en ligne » des amis : au plus une écriture par minute, après la réponse
  after(() => touchLastSeen(user.id));
  const [wallet, packs, adventure, title, staff] = await Promise.all([getWallet(user.id), getPackState(user.id), getAdventure(user.id), equippedTitle(user.id), isStaff(user.id)]);
  const xpPct = adventure.next === null ? 100 : Math.max(0, Math.min(100, Math.round(((adventure.xp - adventure.floor) / (adventure.next - adventure.floor)) * 100)));
  return (
    <>
      <Suspense fallback={null}>
        <NotificationBell userId={user.id} />
      </Suspense>
      <Tutorial />
      <AccountDropdown>
        <Link href={`/u/${encodeURIComponent(user.username)}`} className="mq-player" aria-label={`Profil de ${user.username}`}>
          <span className={`mq-avatar ${wallet.canClaimBonus ? "mq-active" : ""}`}>{user.username.slice(0, 2).toUpperCase()}</span>
          <span className="mq-player-text">
            <b>{user.username}</b>
            {title && <small>{title}</small>}
            <small>Puissance {num.format(packs.collectionPower)}</small>
            <span className="mq-wallet" aria-label="Ressources">
              <span className="mq-wallet-ryo"><Icon name="ryo" />{num.format(wallet.balance)}<em>Ryō</em></span>
              <span className="mq-wallet-crystal" title="Cristaux"><Icon name="cristal" />{packs.available}</span>
            </span>
            <span className="mq-xp" role="progressbar" aria-label="Expérience d'Arpenteur" aria-valuemin={0} aria-valuemax={100} aria-valuenow={xpPct}>
              <em>NIV {adventure.level}</em>
              <i><b style={{ width: `${xpPct}%` }} /></i>
              {adventure.next !== null && <small>{num.format(adventure.xp - adventure.floor)} / {num.format(adventure.next - adventure.floor)}</small>}
            </span>
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
          <Link href="/parametres">Paramètres</Link>
          {staff && <Link href="/admin">Administration</Link>}
          {devToolsEnabled() && <Link href="/outils">Outils</Link>}
          <button type="submit">Se déconnecter</button>
        </form>
      </AccountDropdown>
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

/** Raison pour laquelle un mode du menu « Jouer » est fermé, par identifiant de carte (absent : ouvert). */
async function PlayMenuWithLocks() {
  const user = await getSessionUser();
  const locks: Record<string, string> = {};
  if (!PVP_AVAILABLE) { locks.pvp = "Pas encore disponible"; locks.live = "Pas encore disponible"; }
  if (user) {
    const adventure = await getAdventure(user.id);
    const ids = { expeditions: "expeditions", dungeon: "dungeons", raid: "raids", tower: "tower" } as const;
    for (const mode of adventure.modes) {
      if (mode.unlocked) continue;
      locks[ids[mode.key]] = adventure.level < mode.level ? `Niveau ${mode.level} requis` : "Progresse dans l’histoire";
    }
  }
  return <PlayMenu locks={locks} />;
}
