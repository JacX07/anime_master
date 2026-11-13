import Link from "next/link";
import { Icon } from "@/components/icons";
import { getStoryProgress } from "@/lib/battles";
import { getPeriodicQuests } from "@/lib/periodic-quests";
import { pinnable } from "@/lib/profile";
import type { SessionUser } from "@/lib/session";
import { LEVELS } from "@/lib/story";
import { HomeCharacter } from "./HomeCharacter";

export async function MobileHome({ user, available = 0, expeditionsReady = 0 }: { user: SessionUser | null; available?: number; expeditionsReady?: number }) {
  const [characters, story, quests] = await Promise.all([
    user ? pinnable(user.id) : [],
    user ? getStoryProgress(user.id) : [],
    user ? getPeriodicQuests(user.id) : [],
  ]);
  const next = story.find((entry) => entry.unlocked && entry.maxLevel < LEVELS);
  const dailyRewards = quests.filter((quest) => quest.period === "daily" && quest.claimable).length;

  return <div className="mobile-home">
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
    </nav>
    <div className="mobile-home-event"><span>{available > 0 ? `${available} cristaux disponibles.` : "Découvre les bannières."}</span><Link href={user ? "/packs" : "/login"}><Icon name="paquet" />Voir les invocations</Link></div>
  </div>;
}
