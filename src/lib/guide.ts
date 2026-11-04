import type { getAdventure } from "./adventure-state";

type Adventure = Awaited<ReturnType<typeof getAdventure>>;
export type GuideFacts = { adventure: Adventure; cards: number };
/** done : true (fait), false (à faire), null (simple découverte, sans suivi). locked : raison du verrou. */
export type GuideStep = { n: number; title: string; where: string; href: string; what: string; done: boolean | null; locked: string | null };

const STEPS: { title: string; where: string; href: string; what: string; done?: (f: GuideFacts) => boolean; mode?: string }[] = [
  { title: "Invoquer tes premières cartes", where: "Accueil", href: "/", what: "Choisis une bannière et lance tes tirages de bienvenue. Un cristal = une carte ; ils se rechargent avec le temps.", done: (f) => f.cards > 0 },
  { title: "Récupérer le bonus du jour", where: "Ton avatar, en haut à droite", href: "/", what: "Survole ou touche ton avatar : le bonus quotidien de Ryō s’y trouve quand il est disponible. Tu y vois aussi tes Ryō et tes cristaux." },
  { title: "Parcourir ta collection", where: "Collection › Album", href: "/album", what: "Toutes tes cartes, triées par série et rareté. Ouvre une carte pour voir ses statistiques et ses exemplaires." },
  { title: "Former ton squad", where: "Squads", href: "/equipe", what: "Place quatre cartes dans ton équipe d’attaque. C’est elle qui combat dans tous les modes.", done: (f) => quest(f, "discovery:team") },
  { title: "Gagner ton premier combat", where: "JOUER › Mode histoire", href: "/histoire", what: "Commence par One Piece, combat 1. Une défaite ne coûte rien : rejoue autant que tu veux.", done: (f) => quest(f, "story:", true) },
  { title: "Suivre tes quêtes", where: "Quêtes", href: "/quetes", what: "Ton niveau d’Arpenteur, les objectifs conseillés et les modes qui vont s’ouvrir.", done: (f) => f.adventure.level >= 2 },
  { title: "Éveiller une carte", where: "Inventaire › Éveil", href: "/eveil", what: "Dépense les ressources gagnées en histoire pour donner des étoiles à une carte.", done: (f) => quest(f, "discovery:awaken") },
  { title: "Équiper une carte", where: "Inventaire", href: "/inventaire", what: "Équipe un artefact ou forge une arme pour renforcer une carte.", done: (f) => quest(f, "discovery:equipment") },
  { title: "Lancer une expédition", where: "JOUER › Expéditions", href: "/expeditions", what: "Envoie une à trois cartes explorer une brèche pendant quelques heures, puis reviens chercher le butin.", done: (f) => quest(f, "discovery:expedition"), mode: "expeditions" },
  { title: "Vaincre un donjon", where: "JOUER › Donjons", href: "/donjons", what: "Un boss unique et difficile qui donne des artefacts de son set.", done: (f) => quest(f, "discovery:dungeon:1"), mode: "dungeon" },
  { title: "Gravir la Tour", where: "JOUER › Tour universelle", href: "/tour", what: "Monte étage par étage pour le classement.", done: (f) => quest(f, "discovery:tower:1"), mode: "tower" },
  { title: "Battre un boss de raid", where: "JOUER › Raids", href: "/raid", what: "Un boss par semaine. Il donne les cœurs de brèche des étoiles 4 et 5.", done: (f) => quest(f, "discovery:raid"), mode: "raid" },
  { title: "Vendre ou acheter à la Bourse", where: "Marché › Bourse", href: "/market", what: "Les enchères entre joueurs : mets tes doublons en vente ou enchéris sur une carte." },
  { title: "Échanger avec un joueur", where: "Marché › Échanges", href: "/trades", what: "Propose un échange de cartes ou de Ryō à un autre joueur." },
  { title: "Noter tes souhaits", where: "Collection › Souhaits", href: "/wishlist", what: "Liste les personnages que tu cherches pour les retrouver plus vite à la Bourse." },
  { title: "Débloquer des succès", where: "Succès", href: "/achievements", what: "Chaque succès rapporte de l’XP. Compare-toi aux autres dans Classement.", done: (f) => f.adventure.quests.some((q) => q.group === "Succès" && q.done) },
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
