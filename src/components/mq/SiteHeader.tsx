import Link from "next/link";
import { after } from "next/server";
import { Suspense } from "react";
import { devToolsEnabled } from "@/lib/dev-tools";
import { touchLastSeen } from "@/lib/friends";
import { signOut } from "@/app/auth-actions";
import { getAdventure } from "@/lib/adventure-state";
import { MAX_CRYSTALS } from "@/lib/crystal-stock";
import { getPackState } from "@/lib/packs";
import { getEnergy } from "@/lib/battles";
import { EnergyReserve } from "@/components/team/EnergyMeter";
import { MAX_ENERGY } from "@/lib/energy";
import { CountUp } from "@/components/fx/CountUp";
import { getSessionUser } from "@/lib/session";
import { getWallet } from "@/lib/wallet";
import { prisma } from "@/lib/db";
import { titleOf, unclaimedAchievementCount } from "@/lib/achievements";
import { readyCount } from "@/lib/expeditions";
import { getPeriodicQuests } from "@/lib/periodic-quests";
import { avatarsFor } from "@/lib/profile";
import { DailyBonus } from "../DailyBonus";
import { NotificationBell } from "../NotificationBell";
import { NavItem } from "./NavItem";
import { PlayMenu } from "./PlayMenu";
import { Tutorial } from "../Tutorial";
import { Navigation } from "./Navigation";
import { MenuPanel, SlimPlay } from "./SlimBarClient";
import "./slimbar.css";
import { WalletSources } from "./WalletSources";
import { AccountDropdown } from "./AccountDropdown";
import { Icon } from "../icons";
import { PVP_AVAILABLE } from "@/lib/feature-flags";
import { ReleaseAnnouncement } from "../changelog/ReleaseAnnouncement";
import { MobileChatButton } from "../chat/MobileChatButton";

const num = new Intl.NumberFormat("fr-FR");

/** Barre du haut de la maquette : marque, navigation (Jouer au centre), saison et compte. */
export function SiteHeader() {
  return (
    <>
    <SlimBar />
    <header className="mq-topbar">
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
          <NavItem href="/changelog">Changelog</NavItem>
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
          <NavItem href="/achievements">Succès<Suspense fallback={null}><AchievementBadge /></Suspense></NavItem>
        </div>
      </nav>
      </Navigation>
      <div className="mq-header-actions">
        <Suspense fallback={null}>
          <Account />
        </Suspense>
      </div>
    </header>
    </>
  );
}

/** Barre fine des pages intérieures sur grand écran (variante B validée le 2026-11-15) : accueil, raccourcis, JOUER, ressources, menu et profil.
 *  L'accueil et le mobile gardent la barre `.mq-topbar` ; le CSS choisit laquelle afficher. */
function SlimBar() {
  return (
    <header className="mq-slimbar">
      <Link href="/" className="mq-slim-home"><Icon name="logo" /><span>‹ Accueil</span></Link>
      <nav className="mq-slim-tabs" aria-label="Raccourcis">
        <NavItem href="/album" match={["/wishlist", "/character", "/packs"]}>Collection</NavItem>
        <NavItem href="/equipe" match={["/builder"]}>Squads</NavItem>
        <NavItem href="/inventaire" match={["/forge", "/eveil"]}>Inventaire</NavItem>
        <NavItem href="/quetes" match={["/guide"]}>Quêtes<Suspense fallback={null}><QuestBadge /></Suspense></NavItem>
        <NavItem href="/market" match={["/trades"]}>Marché</NavItem>
      </nav>
      <SlimPlay />
      <span className="mq-slim-space" />
      <Suspense fallback={<MenuPanel />}>
        <SlimAccount />
      </Suspense>
    </header>
  );
}

/** Quêtes périodiques dont la récompense attend. */
async function claimableQuests(userId: string) {
  return (await getPeriodicQuests(userId)).filter((quest) => quest.claimable).length;
}

/** Pastille des quêtes à récupérer sur le raccourci « Quêtes ». */
async function QuestBadge() {
  const user = await getSessionUser();
  if (!user) return null;
  const n = await claimableQuests(user.id);
  return n > 0 ? <span className="mq-slim-badge" aria-label={`${n} quête${n > 1 ? "s" : ""} à récupérer`}>{n}</span> : null;
}

/** Ressources, énergie, notifications, menu et profil de la barre fine. Lit la session : derrière un Suspense. */
async function SlimAccount() {
  const user = await getSessionUser();
  if (!user) return <><MenuPanel /><Link href="/login" className="mq-slim-login">Connexion</Link><Link href="/signup" className="mq-slim-login">Créer un compte</Link></>;
  const [wallet, packs, adventure, title, staff, energy, avatars, quests, achievements, expeditions] = await Promise.all([getWallet(user.id), getPackState(user.id), getAdventure(user.id), equippedTitle(user.id), isStaff(user.id), getEnergy(user.id), avatarsFor([user.id]), claimableQuests(user.id), unclaimedAchievementCount(user.id), readyCount(user.id)]);
  const avatarUrl = avatars.get(user.id);
  return (
    <>
      <span className="mq-slim-res" title="Ryō"><Icon name="ryo" /><CountUp value={wallet.balance} id="slim-ryo" /><WalletSources kind="ryo" /></span>
      <span className="mq-slim-res" title="Cristaux"><Icon name="cristal" /><CountUp value={packs.available} id="slim-crystals" /><WalletSources kind="crystals" /></span>
      <EnergyReserve energy={energy} />
      <Suspense fallback={null}><NotificationBell userId={user.id} /></Suspense>
      <MenuPanel quests={quests} achievements={achievements} expeditions={expeditions} />
      <AccountDropdown>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <Link href={`/u/${encodeURIComponent(user.username)}`} className={`mq-avatar mq-slim-avatar ${wallet.canClaimBonus ? "mq-active" : ""}`} aria-label={`Profil de ${user.username}`}>{avatarUrl ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" /> : user.username.slice(0, 2).toUpperCase()}</Link>
        <AccountPanel username={user.username} canClaimBonus={wallet.canClaimBonus} title={title} level={adventure.level} power={packs.collectionPower} balance={wallet.balance} crystals={packs.available} staff={staff} />
      </AccountDropdown>
    </>
  );
}

/** Menu du profil, partagé par la barre complète et la barre fine. */
function AccountPanel({ username, canClaimBonus, title, level, power, balance, crystals, staff }: { username: string; canClaimBonus: boolean; title: string | null; level: number; power: number; balance: number; crystals: number; staff: boolean }) {
  return (
    <form action={signOut} className="mq-dropdown-panel mq-account-panel">
      {canClaimBonus && <DailyBonus />}
      <p className="mq-account-name">{username}<small>{title ? `${title} · ` : ""}Arpenteur niv. {level}</small><small>Puissance {num.format(power)}</small></p>
      <dl>
        <div><dt>Ryō</dt><dd>{num.format(balance)}</dd></div>
        <div><dt>Cristaux</dt><dd>{crystals} / {MAX_CRYSTALS}</dd></div>
      </dl>
      <Link href={`/u/${encodeURIComponent(username)}`}>Profil</Link>
      <Link href="/parametres">Paramètres</Link>
      {staff && <Link href="/admin">Administration</Link>}
      {devToolsEnabled() && <Link href="/outils">Outils</Link>}
      <button type="submit">Se déconnecter</button>
    </form>
  );
}

/** Pastille rouge : succès débloqués à récupérer. Lit la session : derrière un Suspense. */
async function AchievementBadge() {
  const user = await getSessionUser();
  if (!user) return null;
  const n = await unclaimedAchievementCount(user.id);
  return n > 0 ? <span className="mq-nav-badge" aria-label={`${n} succès à récupérer`}>{n}</span> : null;
}

/** Compte : bonus du jour, notifications, avatar dont le menu rappelle ressources et niveau. Lit la session : derrière un Suspense. */
async function Account() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <>
        <Link href="/" className="mobile-guest-brand">Anima Clash</Link>
        <Link href="/login" className="mq-header-link">Connexion</Link>
        <Link href="/signup" className="mq-header-cta">Créer un compte</Link>
      </>
    );
  }
  // Statut « en ligne » des amis : au plus une écriture par minute, après la réponse
  after(() => touchLastSeen(user.id));
  const [wallet, packs, adventure, title, staff, energy, avatars] = await Promise.all([getWallet(user.id), getPackState(user.id), getAdventure(user.id), equippedTitle(user.id), isStaff(user.id), getEnergy(user.id), avatarsFor([user.id])]);
  const avatarUrl = avatars.get(user.id);
  const xpPct = adventure.next === null ? 100 : Math.max(0, Math.min(100, Math.round(((adventure.xp - adventure.floor) / (adventure.next - adventure.floor)) * 100)));
  return (
    <>
      <EnergyReserve energy={energy} />
      <Suspense fallback={null}>
        <NotificationBell userId={user.id} />
      </Suspense>
      <MobileChatButton />
      <Tutorial />
      <Suspense fallback={null}><ReleaseAnnouncement userId={user.id} /></Suspense>
      <AccountDropdown>
        {/* Seuls l'avatar et le pseudo mènent au profil (et ouvrent son menu) : les ressources gardent leurs propres boutons. */}
        <div className="mq-player">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <Link href={`/u/${encodeURIComponent(user.username)}`} className={`mq-avatar ${wallet.canClaimBonus ? "mq-active" : ""}`} aria-label={`Profil de ${user.username}`}>{avatarUrl ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" /> : user.username.slice(0, 2).toUpperCase()}</Link>
          <span className="mq-player-text">
            <b><Link href={`/u/${encodeURIComponent(user.username)}`} className="mq-player-name">{user.username}</Link></b>
            {title && <small>{title}</small>}
            <small>Puissance {num.format(packs.collectionPower)}</small>
            <span className="mq-wallet" aria-label="Ressources">
              <span className="mq-wallet-free" title="Cartes offertes"><Icon name="paquet" />{packs.freeCards}</span>
              <span className="mq-wallet-ryo"><Icon name="ryo" /><CountUp value={wallet.balance} id="ryo" /><em>Ryō</em><WalletSources kind="ryo" /></span>
              <span className="mq-wallet-crystal" title="Cristaux"><Icon name="cristal" /><CountUp value={packs.available} id="crystals" /><WalletSources kind="crystals" /></span>
              <span className="mq-wallet-energy" title="Énergie"><Icon name="recharge" />{energy.available}/{MAX_ENERGY}</span>
            </span>
            <span className="mq-xp" role="progressbar" aria-label="Expérience d'Arpenteur" aria-valuemin={0} aria-valuemax={100} aria-valuenow={xpPct}>
              <em>NIV {adventure.level}</em>
              <i><b style={{ width: `${xpPct}%` }} /></i>
              {adventure.next !== null && <small>{num.format(adventure.xp - adventure.floor)} / {num.format(adventure.next - adventure.floor)}</small>}
            </span>
          </span>
        </div>
        <AccountPanel username={user.username} canClaimBonus={wallet.canClaimBonus} title={title} level={adventure.level} power={packs.collectionPower} balance={wallet.balance} crystals={packs.available} staff={staff} />
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
  const info: Record<string, string> = {};
  if (!PVP_AVAILABLE) { locks.pvp = "Pas encore disponible"; }
  if (user) {
    const [adventure, ready] = await Promise.all([getAdventure(user.id), readyCount(user.id)]);
    const next = adventure.quests.find((quest) => quest.group === "Histoire" && quest.available && !quest.done);
    info.story = next ? next.title : "Tous les univers explorés";
    if (ready) info.expeditions = `${ready} expédition${ready > 1 ? "s" : ""} prête${ready > 1 ? "s" : ""}`;
    const ids = { expeditions: "expeditions", dungeon: "dungeons", raid: "raids", tower: "tower" } as const;
    for (const mode of adventure.modes) {
      if (mode.unlocked) continue;
      locks[ids[mode.key]] = adventure.level < mode.level ? `Niveau ${mode.level} requis` : "Progresse dans l’histoire";
    }
  }
  return <PlayMenu locks={locks} info={info} />;
}
