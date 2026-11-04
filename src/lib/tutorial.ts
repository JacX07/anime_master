/** Tutoriel en infobulles (docs/specs/guide.md). Étapes numérotées à partir de 1 ; 0 = terminé ou passé. */
export type TutorialPhase = "action" | "modes" | "tabs" | "end";
export type TutorialStep = {
  key: string;
  phase: TutorialPhase;
  title: string;
  text: string;
  /** Page où l'action se fait (phase « action ») ; ailleurs, la bulle cible `away`. */
  page?: string;
  /** Sélecteurs CSS de l'élément ciblé, le premier visible gagne. */
  targets: string[];
  /** Phase « action » hors de `page` : élément qui ramène au bon endroit. */
  away?: string[];
  /** Mode d'aventure dont on affiche la condition d'accès (phase « modes »). */
  mode?: string;
};

const nav = (href: string) => `.mq-game-nav a[href="${href}"]`;

export const TUTORIAL_STEPS: TutorialStep[] = [
  { key: "invoke", phase: "action", title: "Invoque tes cartes", text: "Ici tu invoques tes premières cartes. Lance un tirage pour continuer.",
    page: "/", targets: [".pk-welcome", ".pk-open"], away: [nav("/")] },
  { key: "squad", phase: "action", title: "Forme ta squad", text: "Ici tu formes ta squad : modifie-la, place quatre cartes puis enregistre. C’est elle qui combat dans tous les modes.",
    page: "/equipe", targets: [".squad-stage", ".eq-slots"], away: [nav("/equipe")] },
  { key: "story", phase: "action", title: "Lance le mode histoire", text: "Ici tu lances le mode histoire. Gagne le premier combat de One Piece pour continuer.",
    page: "/histoire", targets: [".hs-map-node.is-current", ".hs-map-hint button"], away: [".mq-mode-card.mq-mode-story", ".mq-play-button"] },
  { key: "dungeons", phase: "modes", title: "Donjons", text: "Un boss unique et difficile qui donne des artefacts pour équiper tes cartes.", targets: [".mq-mode-card.mq-mode-dungeons"], mode: "dungeon" },
  { key: "raids", phase: "modes", title: "Raids", text: "Un boss par semaine, à frapper avec tout le monde. Il donne les cœurs de brèche des étoiles 4 et 5.", targets: [".mq-mode-card.mq-mode-raids"], mode: "raid" },
  { key: "expeditions", phase: "modes", title: "Expéditions", text: "Envoie une à trois cartes explorer une brèche pendant quelques heures, puis reviens chercher le butin.", targets: [".mq-mode-card.mq-mode-expeditions"], mode: "expeditions" },
  { key: "pvp", phase: "modes", title: "Arène", text: "Affronte les squads des autres joueurs.", targets: [".mq-mode-card.mq-mode-pvp"] },
  { key: "tower", phase: "modes", title: "Tour", text: "Monte étage par étage et compare-toi aux autres au classement.", targets: [".mq-mode-card.mq-mode-tower"], mode: "tower" },
  { key: "collection", phase: "tabs", title: "Collection", text: "Ton album de cartes, et tes souhaits pour retrouver les personnages que tu cherches.", targets: [nav("/album")] },
  { key: "inventory", phase: "tabs", title: "Inventaire", text: "Tes ressources, artefacts et armes. C’est aussi là que tu éveilles et forges.", targets: [nav("/inventaire")] },
  { key: "quests", phase: "tabs", title: "Quêtes", text: "Ton niveau d’Arpenteur, tes objectifs et le Guide du jeu, pour revoir chaque étape.", targets: [nav("/quetes")] },
  { key: "market", phase: "tabs", title: "Marché", text: "La Bourse des enchères et les échanges entre joueurs.", targets: [nav("/market")] },
  { key: "ranking", phase: "tabs", title: "Classement", text: "Les meilleurs joueurs, à toi de monter.", targets: [nav("/leaderboard")] },
  { key: "achievements", phase: "tabs", title: "Succès", text: "Chaque succès rapporte de l’expérience et parfois un titre.", targets: [nav("/achievements")] },
  { key: "settings", phase: "tabs", title: "Paramètres", text: "Son, affichage et compte.", targets: [".mq-gear", nav("/parametres")] },
  { key: "account", phase: "tabs", title: "Ton compte", text: "Survole ou touche ton avatar : bonus du jour, Ryō, cristaux et profil.", targets: [".mq-player"] },
  { key: "end", phase: "end", title: "Tutoriel terminé", text: "Tu connais l’essentiel. Tu peux revoir chaque étape dans Quêtes › Guide du jeu.", targets: [] },
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
