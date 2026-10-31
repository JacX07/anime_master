// Prompt d'agent pour une mécanique de sort absente du moteur (docs/specs/combat.md §12). Pur : utilisé par le runner et par /builder.

import { SLOT_LABELS, type BuilderSlot } from "./builder-slots";

export interface MechanicPromptInput {
  wish: string;
  characterId: number;
  name: string;
  rarity: string;
  slot: BuilderSlot;
  /** Brouillon de l'éditeur, JSON, s'il y en a un */
  draft?: unknown;
  /** « worktree » : lancé par le runner (le lanceur commite) ; « direct » : prompt à coller dans un agent, qui écrit dans le jeu */
  mode: "worktree" | "direct";
  /** Échec de la tentative précédente (runner) */
  feedback?: string;
}

export function mechanicPrompt(p: MechanicPromptInput): string {
  const where = p.mode === "worktree" ? "dans un worktree git dédié. Ne fais AUCUNE commande git d'écriture (pas de commit, checkout, merge) : le lanceur s'en charge." : "à la racine du dépôt. Ne commite pas : je relirai le diff.";
  const shape = p.slot === "base" ? '{ "name", "rider": { ... } } (voir BasicRider dans src/lib/basic-attacks.ts : un seul petit effet plafonné)' : '{ "name", "target": "foe" | "ally" | "deadAlly" | null, "effects": [...] }';
  const draftStep = p.mode === "worktree"
    ? `5. Écris le sort (JSON : ${shape}) dans mechanic-draft.json à la racine, avec des valeurs raisonnables.`
    : `5. Écris le sort (JSON : ${shape}) dans un fichier temporaire et simule-le AVANT de l'appliquer (sinon le sort d'origine devient le nouveau sort et l'écart vaut zéro) : npx tsx scripts/builder-sim.ts ${p.characterId} <fichier.json> 2000 ${p.slot} (Node 24, comme next dev). La sortie donne l'écart avec le sort d'origine (delta, marge, verdict). Si le sort est nettement plus fort ou plus faible sans que ce soit voulu, ajuste les valeurs et relance. Ensuite seulement, écris-le dans src/lib/skill-overrides.json, entrée "${p.characterId}", clé "${p.slot}" (${SLOT_LABELS[p.slot]})${p.slot === "base" ? "" : ', avec "final": true'} ; garde les autres entrées du fichier telles quelles.`;
  return `Tu travailles sur le jeu Anime Masters (Next.js, TypeScript), ${where}

Demande de sort pour ${p.name} (${p.rarity}, id AniList ${p.characterId}), emplacement ${SLOT_LABELS[p.slot]} :
« ${p.wish} »
${p.draft ? `\nBrouillon actuel de l'éditeur (peut utiliser seulement des effets existants) :\n${JSON.stringify(p.draft, null, 2)}\n` : ""}
Étapes :
1. Lis docs/specs/combat.md (§4 bis, §4 ter et §12), src/lib/spells.ts, src/lib/spell-schema.ts, src/lib/battle.ts, src/lib/battle-replay.ts et scripts/check-spells.ts. Lis aussi AGENTS.md (cette version de Next.js a des changements).
2. Si la demande se compose avec les effets existants, n'ajoute aucun code : passe à l'étape 5.
3. Sinon, implémente la mécanique manquante comme un NOUVEL effet : type dans l'union Effect et texte dans describeEffect (spells.ts), entrée dans EFFECTS (spell-schema.ts, ce qui l'ajoute au formulaire du builder), résolution dans battle.ts avec les événements de journal nécessaires, prise en charge dans battle-replay.ts et dans l'affichage du combat (src/components/battle) si de nouveaux événements ou statuts apparaissent, et un cas dans scripts/check-spells.ts qui l'exerce.
4. Contrainte absolue : aucun comportement existant ne change. Ne modifie pas les sorts existants, les valeurs d'équilibre, la base (prisma/, data/). Les combats existants doivent rester identiques à la graine près (vérifié par scripts/spell-fingerprint.ts). Reste minimal et suis le style du code voisin.
${draftStep}
6. Vérifie : npx tsc --noEmit, npx eslint sur tes fichiers, npm run check:spells, npm run check:battle, npm run check:replay, npx tsx scripts/spell-fingerprint.ts. Corrige jusqu'à ce que tout passe.
7. Réponds en français, 10 lignes maximum : l'effet ajouté (ou « composé avec l'existant »), les fichiers modifiés, le résultat de la simulation, les limites ou choix à relire.
${p.feedback ? `\nLa tentative précédente a échoué aux garde-fous. Corrige :\n${p.feedback}\n` : ""}`;
}
