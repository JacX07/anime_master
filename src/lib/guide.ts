import type { getAdventure } from "./adventure-state";

type Adventure = Awaited<ReturnType<typeof getAdventure>>;
export type GuideFacts = { adventure: Adventure; cards: number };
/** done : true (fait), false (à faire), null (simple découverte, sans suivi). locked : raison du verrou. */
export type GuideStep = { n: number; title: string; where: string; href: string; what: string; done: boolean | null; locked: string | null };

const STEPS: { title: string; where: string; href: string; what: string; done?: (f: GuideFacts) => boolean; mode?: string }[] = [
  { title: "Invoquer tes premières cartes", where: "Accueil", href: "/", what: "Choisis une bannière et lance tes tirages de bienvenue. Un cristal = une carte ; ils se rechargent avec le temps.", done: (f) => f.cards > 0 },
  { title: "Récupérer le bonus du jour", where: "Ton avatar, en haut à droite", href: "/", what: "Survole ou touche ton avatar : le bonus quotidien de Ryō s’y trouve quand il est disponible. Tu y vois aussi tes Ryō et tes cristaux." },
  { title: "Parcourir ta collection", where: "Collection › Album", href: "/album", what: "Toutes tes cartes, triées par série et rareté. Ouvre une carte pour voir ses statistiques et ses exemplaires." },
  { title: "Former ton squad", where: "Squads", href: "/equipe", what: "Place quatre cartes dans ton équipe d’attaque. Elle sert de départ dans chaque mode ; avant un combat, tu peux la modifier ou charger une autre squad.", done: (f) => quest(f, "discovery:team") },
  { title: "Gagner ton premier combat", where: "JOUER › Mode histoire", href: "/histoire", what: "Commence par One Piece, combat 1. Une défaite ne coûte rien : rejoue autant que tu veux.", done: (f) => quest(f, "story:", true) },
  { title: "Suivre tes quêtes", where: "Quêtes", href: "/quetes", what: "Ton niveau d’Arpenteur, les objectifs conseillés et les modes qui vont s’ouvrir.", done: (f) => f.adventure.level >= 2 },
  { title: "Éveiller une carte", where: "Inventaire › Éveil", href: "/eveil", what: "Dépense les ressources gagnées en histoire pour donner des étoiles à une carte.", done: (f) => quest(f, "discovery:awaken") },
  { title: "Équiper une carte", where: "Inventaire", href: "/inventaire", what: "Équipe un artefact ou forge une arme pour renforcer une carte.", done: (f) => quest(f, "discovery:equipment") },
  { title: "Lancer une expédition", where: "JOUER › Expéditions", href: "/expeditions", what: "Envoie une à trois cartes explorer une brèche pendant quelques heures, puis reviens chercher le butin.", done: (f) => quest(f, "discovery:expedition"), mode: "expeditions" },
  { title: "Vaincre un donjon", where: "JOUER › Donjons", href: "/donjons", what: "Un boss unique et difficile qui donne des artefacts de son set.", done: (f) => quest(f, "discovery:dungeon:1"), mode: "dungeon" },
  { title: "Gravir la Tour", where: "JOUER › Tour universelle", href: "/tour", what: "Monte étage par étage pour le classement.", done: (f) => quest(f, "discovery:tower:1"), mode: "tower" },
  { title: "Battre un empereur", where: "JOUER › Raids", href: "/raid", what: "Le Défi des empereurs : un combat par empereur et par jour. Il donne les cœurs de brèche des étoiles 4 et 5 et de quoi forger des armes légendaires.", done: (f) => quest(f, "discovery:raid"), mode: "raid" },
  { title: "Vendre ou acheter à la Bourse", where: "Marché › Bourse", href: "/market", what: "Les enchères entre joueurs : mets tes doublons en vente ou enchéris sur une carte." },
  { title: "Échanger avec un joueur", where: "Marché › Échanges", href: "/trades", what: "Propose un échange de cartes ou de Ryō à un autre joueur." },
  { title: "Noter tes souhaits", where: "Collection › Souhaits", href: "/wishlist", what: "Liste les personnages que tu cherches pour les retrouver plus vite à la Bourse." },
  { title: "Débloquer des succès", where: "Succès", href: "/achievements", what: "Chaque succès rapporte de l’XP. Compare-toi aux autres dans Classement.", done: (f) => f.adventure.quests.some((q) => q.group === "Succès" && q.done) },
  { title: "Comprendre tes ressources", where: "Accueil", href: "/", what: "Un cristal = une carte (50 au maximum, recharge avec le temps, achat en Ryō). Les Ryō viennent des combats, des quêtes et de la vente de doublons." },
  { title: "Gagner des étoiles en histoire", where: "JOUER › Mode histoire", href: "/histoire", what: "1 étoile pour la victoire, 2 sans K.O., 3 sans K.O. en 10 tours ou moins. Une victoire en duo donne une 4ᵉ étoile bonus. Les paliers 12, 24, 36 et 45 étoiles donnent des récompenses ; les 15 étoiles duo donnent un bonus distinct." },
  { title: "Utiliser les éléments et leurs combos", where: "Squads › fiche d’une carte › Sorts", href: "/equipe", what: "Eau : soigne un allié de 10 % et trempe. Foudre : étourdit un ennemi trempé. Feu : brûlure 5 % des PV max. Terre : vitesse −25 %. Air : esquive +20 points. Terre + feu brise (DEF −40 %), air + eau affaiblit (+25 % de dégâts subis)." },
  { title: "Distinguer dégâts physiques et magiques", where: "Squads", href: "/equipe", what: "Les cartes de type Magie et celles de Jujutsu Kaisen infligent des dégâts magiques, toutes les autres des dégâts physiques. Les bonus d’équipement et de set s’appliquent selon ce type." },
  { title: "Gérer saignement, poison et brûlure", where: "Pendant un combat", href: "/equipe", what: "Le saignement (porteurs de lame) se cumule jusqu’à 5 fois : 2 % des PV actuels par cumul et par action, effacé par un soin. Poison et brûlure retirent des PV à la fin de l’action de la cible ; purge et immunité les retirent ou les bloquent." },
  { title: "Piloter un combat", where: "Pendant un combat", href: "/histoire", what: "Barre centrale : Pause ou Lecture, Fin pour passer à la conclusion, vitesse ×1 ×2 ×4, effets et musique. En combat réel, l’interrupteur Auto ou Manuel et « Abandonner » sont dessous." },
  { title: "Discuter et voir qui est en ligne", where: "Chat, en bas à droite", href: "/", what: "Guilde, Général (niveau d’Arpenteur 3 pour écrire), Privé avec tes amis, et En ligne pour voir qui est connecté." },
];

function quest(f: GuideFacts, key: string, prefix = false) {
  return f.adventure.quests.some((q) => q.done && (prefix ? q.key.startsWith(key) : q.key === key));
}

export function lockReason(mode: Adventure["modes"][number]) {
  const story = mode.worlds === 2 ? "terminer les deux premiers univers" : mode.storyLevel === 15 ? "terminer One Piece" : `remporter le combat ${mode.storyLevel} de One Piece`;
  return `S’ouvre au niveau d’Arpenteur ${mode.level}. Il faut aussi ${story}.`;
}

export function guideSteps(f: GuideFacts): GuideStep[] {
  return STEPS.map((s, i) => {
    const mode = s.mode ? f.adventure.modes.find((m) => m.key === s.mode) : undefined;
    const done = s.done ? s.done(f) : null;
    return { n: i + 1, title: s.title, where: s.where, href: s.href, what: s.what, done, locked: mode && !mode.unlocked && !done ? lockReason(mode) : null };
  });
}
