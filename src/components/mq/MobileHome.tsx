import Link from "next/link";
import { Icon } from "@/components/icons";
import { getStoryProgress } from "@/lib/battles";
import { getPeriodicQuests } from "@/lib/periodic-quests";
import { pinnable } from "@/lib/profile";
import type { SessionUser } from "@/lib/session";
import { LEVELS } from "@/lib/story";
import type { PlayerSummary } from "@/lib/summary";
import { HomeCharacter } from "./HomeCharacter";

export async function MobileHome({ user, available = 0, expeditionsReady = 0, summary }: { user: SessionUser | null; available?: number; expeditionsReady?: number; summary?: PlayerSummary }) {
  const [characters, story, quests] = await Promise.all([
    user ? pinnable(user.id) : [],
    user ? getStoryProgress(user.id) : [],
    user ? getPeriodicQuests(user.id) : [],
  ]);
  const next = story.find((entry) => entry.unlocked && entry.maxLevel < LEVELS);
  const dailyRewards = quests.filter((quest) => quest.period === "daily" && quest.claimable).length;

  return <div className="mobile-home home-hub">
    <HomeCharacter key={user?.id ?? "guest"} userId={user?.id ?? "guest"} characters={characters.map(({ id, name, imageUrl, rarity }) => ({ id, name, imageUrl, rarity }))} />
    <section className="mobile-home-resume" aria-label="Reprendre l’aventure">
      <div className="line"><small>Ta progression</small><small>Histoire</small></div>
      <h2>{!user ? "Commence ton aventure" : next ? next.universe.name : "Tous les univers explorés"}</h2>
      <p>{!user ? "Crée ton compte et découvre tes premiers personnages." : next ? `Combat ${next.maxLevel + 1} sur ${LEVELS} · Prépare ta squad avant de jouer.` : "Retrouve les combats précédents et complète leurs étoiles."}</p>
      <Link href={user ? "/histoire" : "/signup"} className="ui-button">{user ? "Continuer l’histoire" : "Créer un compte"}</Link>
    </section>
    <nav className="mobile-home-quick" aria-label="Tes activités">
      <Link href={user ? "/quetes" : "/login"}><Icon name="quetes" /><span><b>Quêtes du jour</b><small>{dailyRewards ? `${dailyRewards} récompense${dailyRewards > 1 ? "s" : ""} à récupérer` : "Voir les objectifs"}</small></span></Link>
      <Link href={user ? "/expeditions" : "/login"}><Icon name="aventure" /><span><b>Expéditions</b><small>{expeditionsReady ? `${expeditionsReady} butin${expeditionsReady > 1 ? "s" : ""} disponible${expeditionsReady > 1 ? "s" : ""}` : "Préparer un départ"}</small></span></Link>
      <Link className="home-desktop-only" href={user ? "/achievements" : "/login"}><Icon name="bonus" /><span><b>Succès</b><small>Ta progression récompensée</small></span></Link>
      <Link className="home-desktop-only" href="/changelog"><Icon name="quetes" /><span><b>Actualités</b><small>Les nouveautés de la Faille</small></span></Link>
    </nav>
    <nav className="home-blades home-desktop-only" aria-label="Destinations de l’accueil">
      <span className="home-blade-dial mq-mech-part mq-mech-dial" aria-hidden="true" />
      {[
        { href: "/album", icon: "collection", title: "Collection", description: summary ? `${summary.owned.toLocaleString("fr-FR")} / ${summary.total.toLocaleString("fr-FR")} personnages` : "Découvre tes futures légendes" },
        { href: "/equipe", icon: "squads", title: "Squads", description: "Prépare tes équipes" },
        { href: "/jouer", icon: "combat", title: "Jouer", description: "Histoire, donjons, raids et arène" },
        { href: "/packs", icon: "paquet", title: "Invocation", description: !user ? "Tes premières invocations" : summary?.packs.welcomeBoosterAvailable ? "Ton booster de bienvenue t’attend" : `${available} cristaux disponibles` },
        { href: "/eveil", icon: "eveil", title: "Éveil", description: "Révèle le potentiel de tes cartes" },
      ].map((entry) => <Link key={entry.href} href={user ? entry.href : "/signup"} className={`home-blade${entry.href === "/jouer" ? " home-blade-play" : ""}`}><Icon name={entry.icon} /><span><b>{entry.title}</b><small>{entry.description}</small></span><span aria-hidden="true">›</span></Link>)}
    </nav>
    <nav className="home-footer home-desktop-only" aria-label="Autres destinations">
      {[["/friends", "Amis"], ["/guilds", "Guildes"], ["/market", "Marché"], ["/inventaire", "Inventaire"], ["/guide", "Guide"], ["/menu", "Menu"]].map(([href, label]) => <Link key={href} href={user ? href : "/login"}>{label}</Link>)}
    </nav>
    <div className="mobile-home-event"><span>{available > 0 ? `${available} cristaux disponibles.` : "Découvre les bannières."}</span><Link href={user ? "/packs" : "/login"}><Icon name="paquet" />Voir les invocations</Link></div>
  </div>;
}
