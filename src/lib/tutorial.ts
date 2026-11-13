import { mobileSection } from "./mobile-navigation";

/** Tutoriel en infobulles (docs/specs/guide.md). Étapes numérotées à partir de 1 ; 0 = terminé ou passé. */
export type TutorialPhase = "action" | "home" | "modes" | "tabs" | "shortcuts" | "combat" | "end";
export type TutorialStep = {
  key: string;
  phase: TutorialPhase;
  title: string;
  text: string;
  /** Courte liste « à quoi ça sert » sous la phrase. */
  points?: string[];
  /** Page où l'action se fait (phase « action ») ; ailleurs, la bulle cible `away`. */
  page?: string;
  /** Sélecteurs CSS de l'élément ciblé, le premier visible gagne. */
  targets: string[];
  /** Phase « action » hors de `page` : élément qui ramène au bon endroit. */
  away?: string[];
  /** Mode d'aventure dont on affiche la condition d'accès (phase « modes »). */
  mode?: string;
};

const nav = (href: string) => `.mobile-collection-tabs a[href="${href}"], .mobile-menu-link[href="${href}"], .mobile-bottom-nav a[data-section="${mobileSection(href)}"], .mq-game-nav a[href="${href}"]`;

export const TUTORIAL_STEPS: TutorialStep[] = [
  { key: "invoke", phase: "action", title: "Invoque tes cartes", text: "Ici tu invoques tes premières cartes : un cristal = une carte. Lance un tirage pour continuer.",
    page: "/packs", targets: [".pk-welcome", ".pk-open"], away: [nav("/packs")] },
  { key: "squad", phase: "action", title: "Forme ta squad", text: "Ici tu formes ta squad : modifie-la, place quatre cartes puis enregistre. Elle sert de départ dans chaque mode ; avant un combat, tu peux la modifier ou charger une autre squad.",
    page: "/equipe", targets: [".squad-stage", ".eq-slots"], away: [nav("/equipe")] },
  { key: "story", phase: "action", title: "Lance le mode histoire", text: "Ici tu lances le mode histoire. Gagne le premier combat de One Piece pour continuer.",
    points: ["1 étoile pour la victoire, 2 sans K.O., 3 sans K.O. en 10 tours ou moins. Une victoire en duo donne une 4ᵉ étoile bonus", "Les étoiles débloquent des récompenses aux paliers 12, 24, 36 et 45"],
    page: "/histoire", targets: [".hs-map-node.is-current", ".hs-map-hint button"], away: [".mobile-mode-story", ".mq-mode-card.mq-mode-story", nav("/jouer"), ".mq-play-button"] },
  { key: "dungeons", phase: "modes", title: "Donjons", text: "Un boss unique et difficile qui donne des artefacts pour équiper tes cartes.", targets: ['[data-mobile-mode="dungeon"]', ".mq-mode-card.mq-mode-dungeons"], mode: "dungeon" },
  { key: "raids", phase: "modes", title: "Raids", text: "Le Défi des empereurs : Shanks, Big Mom, Kaido et Barbe Blanche, chacun gardé par deux vagues d’équipage. Ils donnent les cœurs de brèche des étoiles 4 et 5 et les ressources des armes légendaires.", targets: ['[data-mobile-mode="raid"]', ".mq-mode-card.mq-mode-raids"], mode: "raid" },
  { key: "expeditions", phase: "modes", title: "Expéditions", text: "Envoie une à trois cartes explorer une brèche pendant quelques heures, puis reviens chercher le butin.", targets: ['[data-mobile-mode="expeditions"]', ".mq-mode-card.mq-mode-expeditions"], mode: "expeditions" },
  { key: "pvp", phase: "modes", title: "Arène", text: "Affronte les squads des autres joueurs.", targets: ['[data-mobile-mode="pvp"]', ".mq-mode-card.mq-mode-pvp"] },
  { key: "tower", phase: "modes", title: "Tour", text: "Monte étage par étage et compare-toi aux autres au classement.", targets: ['[data-mobile-mode="tower"]', ".mq-mode-card.mq-mode-tower"], mode: "tower" },
  { key: "crystals", phase: "home", title: "Cristaux", text: "Un cristal = une carte tirée.",
    points: ["Le stock est de 50 au maximum et se recharge avec le temps", "Tu peux en acheter avec des Ryō (+5, +25)"], page: "/packs", targets: [".pk-wallet > div:first-child"], away: [nav("/packs")] },
  { key: "ryo", phase: "home", title: "Ryō", text: "La monnaie du jeu.",
    points: ["Tu en gagnes en combat, aux quêtes et en vendant des doublons", "Elle sert à acheter des cristaux et à la Bourse"], page: "/packs", targets: [".pk-wallet > div:last-child"], away: [nav("/packs")] },
  { key: "banners", phase: "home", title: "Bannières et taux", text: "Choisis ce que tu invoques.",
    points: ["Permanent : tout le catalogue", "Les bannières d’événement mettent des cartes en avant", "« Taux et garanties » donne les probabilités et la pitié SSR / UR"], page: "/packs", targets: [".pk-banner-panel"], away: [nav("/packs")] },
  { key: "lots", phase: "home", title: "Lot ×5 ou ×10", text: "Choisis combien de cartes ouvrir d’un coup.",
    points: ["×5 coûte 5 cristaux, ×10 en coûte 10", "Découpe le haut du booster ou clique dessus pour l’ouvrir"], page: "/packs", targets: [".pk-lots"], away: [nav("/packs")] },
  { key: "collection", phase: "tabs", title: "Collection", text: "Ton album de cartes, et tes souhaits pour retrouver les personnages que tu cherches.",
    points: ["Album : filtres par rareté et type, doublons à vendre", "Souhaits : les personnages que tu cherches"], targets: [nav("/album")] },
  { key: "inventory", phase: "tabs", title: "Inventaire", text: "Tes ressources, artefacts et armes. C’est aussi là que tu éveilles et forges.",
    points: ["Éveil : donne des étoiles à une carte", "Forge : crée des armes pour renforcer tes cartes"], targets: [nav("/inventaire")] },
  { key: "quests", phase: "tabs", title: "Quêtes", text: "Ton niveau d’Arpenteur, tes objectifs et le Guide du jeu, pour revoir chaque étape.",
    points: ["Quêtes quotidiennes et hebdomadaires, avec « Tout récupérer »", "Le niveau d’Arpenteur ouvre les modes de jeu"], targets: [nav("/quetes")] },
  { key: "market", phase: "tabs", title: "Marché", text: "La Bourse des enchères et les échanges entre joueurs.", targets: [nav("/market")] },
  { key: "social", phase: "tabs", title: "Social", text: "Joue avec les autres.",
    points: ["Amis : demandes, blocage, statut en ligne", "Guildes : jusqu’à 20 membres, chat et classement de guilde", "Classement : Puissance, Histoire et Tour"], targets: [nav("/friends")] },
  { key: "achievements", phase: "tabs", title: "Succès", text: "Chaque succès rapporte de l’expérience et parfois un titre.", targets: [nav("/achievements")] },
  { key: "settings", phase: "tabs", title: "Paramètres", text: "Son, affichage et compte.", targets: [".mq-gear", nav("/parametres")] },
  { key: "play", phase: "shortcuts", title: "Bouton JOUER", text: "Il ouvre la liste des modes de combat.",
    points: ["Un mode grisé indique ce qu’il faut pour l’ouvrir"], targets: [nav("/jouer"), ".mq-play-button"] },
  { key: "bell", phase: "shortcuts", title: "Notifications", text: "La cloche te prévient de ce qui se passe.",
    points: ["Enchères gagnées, échanges, demandes d’amis", "Le nombre de notifications non lues s’affiche dessus"], targets: ['a[href="/notifications"]'] },
  { key: "chat", phase: "shortcuts", title: "Chat et joueurs en ligne", text: "Parle aux autres joueurs.",
    points: ["Guilde : ta guilde seulement", "Général : tout le monde (niveau d’Arpenteur 3 requis pour écrire)", "Privé : tes amis", "En ligne : qui est connecté"], targets: [".chat-fab", ".chat-panel"] },
  { key: "account", phase: "shortcuts", title: "Ton compte", text: "Survole ou touche ton avatar : bonus du jour, Ryō, cristaux et profil.", targets: [".mq-player"] },
  { key: "elements", phase: "combat", title: "Les éléments", text: "Le sort secondaire (★) de certaines cartes SSR et UR porte un élément qui ajoute un effet.",
    points: ["Eau : soigne un allié de 10 % de ses PV max et trempe les ennemis touchés", "Foudre : étourdit un ennemi trempé", "Feu : brûlure de 5 % des PV max par action", "Terre : vitesse −25 % pendant 2 actions", "Air : esquive +20 points pour le lanceur"], targets: [] },
  { key: "combos", phase: "combat", title: "Les combos", text: "Deux éléments sur la même cible déclenchent un bonus, quel que soit l’ordre.",
    points: ["Terre + feu : la cible est brisée, DEF −40 % pendant 2 actions", "Air + eau : la cible est affaiblie, +25 % de dégâts subis pendant 2 actions", "Eau + foudre : l’ennemi trempé est étourdi"], targets: [] },
  { key: "damage", phase: "combat", title: "Physique et magique", text: "Chaque carte inflige l’un des deux types de dégâts.",
    points: ["Magique : les cartes de type Magie et celles de Jujutsu Kaisen", "Physique : toutes les autres", "Les bonus d’équipement et de set s’appliquent selon ce type"], targets: [] },
  { key: "statuses", phase: "combat", title: "Saignement et altérations", text: "Des effets continuent de blesser ou de gêner la cible après le coup.",
    points: ["Saignement : les porteurs de lame le cumulent (5 max), 2 % des PV actuels par cumul à chaque action ; seul un soin l’efface", "Poison et brûlure : des PV perdus à la fin de l’action de la cible", "Les purges retirent ces malus, l’immunité les bloque"], targets: [] },
  { key: "end", phase: "end", title: "Tutoriel terminé", text: "Tu connais l’essentiel. Tu peux revoir chaque étape dans Menu › Guide du jeu.", targets: [] },
];

export const TUTORIAL_LENGTH = TUTORIAL_STEPS.length;
export const tutorialStep = (n: number) => (n >= 1 && n <= TUTORIAL_LENGTH ? TUTORIAL_STEPS[n - 1] : null);

/** Nombre d'étapes et rang dans la phase, pour l'affichage « 2 / 5 ». */
export function phaseProgress(n: number) {
  const step = tutorialStep(n);
  if (!step) return { index: 0, total: 0 };
  const same = TUTORIAL_STEPS.filter((s) => s.phase === step.phase);
  return { index: same.indexOf(step) + 1, total: same.length };
}

/** Faits du joueur qui terminent les étapes d'action. */
export type TutorialFacts = { cards: boolean; team: boolean; storyWin: boolean };
const ACTION_DONE: Record<string, (f: TutorialFacts) => boolean> = { invoke: (f) => f.cards, squad: (f) => f.team, story: (f) => f.storyWin };

/** Avance au-delà des étapes d'action déjà accomplies. */
export function settleStep(n: number, facts: TutorialFacts) {
  let step = n;
  while (step >= 1 && step <= TUTORIAL_LENGTH && ACTION_DONE[TUTORIAL_STEPS[step - 1].key]?.(facts)) step++;
  return step;
}
