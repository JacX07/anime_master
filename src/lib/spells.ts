// Sorts de personnage des SSR et UR (docs/specs/combat.md §4 bis) : des listes d'effets lues par le moteur (battle.ts).
// Pur : aucune lecture en base. Un SSR ou UR sans sort écrit reçoit un sort générique déduit de son type.

import type { CardType, Rarity } from "../generated/prisma/enums";
import { SECONDARY_DATA } from "./skill-data";
import { SECONDARY_OVERRIDES } from "./skill-overrides";

/** Qui reçoit un effet : la cible choisie, le lanceur, son équipe, ou tous les ennemis. */
export type Scope = "target" | "self" | "team" | "foes";
export type ModStat = "atk" | "def" | "crit" | "dodge" | "speed";

export type Effect =
  /** Dégâts × ATK ; `zone` touche tous les ennemis ; `drain` rend au lanceur cette part des dégâts ; `pierce` traverse les boucliers (et l'esquive) */
  | { k: "damage"; mult: number; zone?: boolean; ignoreDef?: number; ignoreMissing?: number; pierce?: boolean; drain?: number; critSure?: boolean }
  /** Bonus ou malus (amount négatif) de la stat, en part (0,2 = +20 %, ou +20 points de critique) */
  | { k: "mod"; stat: ModStat; amount: number; turns: number; to: Scope; count?: number }
  | { k: "heal"; pct: number; to: Scope }
  | { k: "regen"; pct: number; turns: number; to: Scope }
  | { k: "shield"; pct: number; to: Scope }
  /** Perd `pct` de ses PV max à chaque action du porteur */
  | { k: "poison"; pct: number; turns: number; to: Scope }
  /** Ne peut lancer que le sort de base. Sans effet sur les boss. */
  | { k: "silence"; turns: number; to: Scope }
  | { k: "stun"; turns: number; count: number }
  | { k: "immune"; turns: number; to: Scope }
  | { k: "purge"; to: Scope }
  /** Réanime l'allié mort ciblé, une fois par combat */
  | { k: "revive"; pct: number }
  /** Provocation du lanceur : les attaques à cible unique des ennemis ne peuvent viser que lui pendant `turns` tours */
  | { k: "taunt"; turns: number }
  /** Dégâts subis réduits de `pct` pendant `turns` tours */
  | { k: "reduce"; pct: number; turns: number; to: Scope };

export interface CharacterSpell {
  name: string;
  /** Ce que le joueur choisit : un ennemi, un allié, un allié mort, ou rien (zone, équipe, soi) */
  target: "foe" | "ally" | "deadAlly" | null;
  effects: Effect[];
  /** Valeurs déjà définitives : aucun coefficient de modération (secondaire, tertiaire) ne s'applique */
  final?: boolean;
}

/** Actions de la carte avant le 1er lancer (1 = dès sa 1re action), puis entre deux lancers */
export const SPELL_FIRST = 1;
export const SPELL_COOLDOWN = 5;

const S = (name: string, target: CharacterSpell["target"], ...effects: Effect[]): CharacterSpell => ({ name, target, effects });
const dmg = (mult: number, o: Omit<Extract<Effect, { k: "damage" }>, "k" | "mult"> = {}): Effect => ({ k: "damage", mult, ...o });
const mod = (stat: ModStat, amount: number, turns: number, to: Scope): Effect => ({ k: "mod", stat, amount, turns, to });

/** Sorts écrits à la main, par identifiant AniList du personnage. Multiplicateurs calibrés par `npm run calibrate:spells` (≈ +4 points de victoire chacun). */
export const CHARACTER_SPELLS: Record<number, CharacterSpell> = {
  13: S("Amaterasu", "foe", dmg(1.36), { k: "poison", pct: 0.08, turns: 3, to: "target" }), // Sasuke Uchiha
  14: S("Tsukuyomi", "foe", dmg(1.71), { k: "silence", turns: 2, to: "target" }, mod("atk", -0.2, 2, "target")), // Itachi Uchiha
  17: S("Mode Kyubi", null, dmg(0.78, { zone: true }), mod("atk", 0.2, 2, "team"), { k: "regen", pct: 0.05, turns: 3, to: "self" }), // Naruto Uzumaki
  40: S("Gomu Gomu no Gatling", "foe", dmg(0.82), mod("atk", 0.2, 2, "self")), // Luffy Monkey
  61: S("Mil Fleur", "foe", dmg(1.33), { k: "silence", turns: 2, to: "target" }), // Robin Nico
  62: S("Santoryu Ogi", "foe", dmg(0.94), mod("crit", 0.3, 3, "self")), // Zoro Roronoa
  85: S("Raikiri", "foe", dmg(1.92, { ignoreDef: 0.3, pierce: true })), // Kakashi Hatake
  305: S("Diable Jambe", "foe", dmg(0.96, { ignoreDef: 0.3 })), // Sanji
  309: S("Rumble Ball", null, dmg(0.22, { zone: true }), { k: "heal", pct: 0.15, to: "team" }, { k: "purge", to: "team" }), // Chopper Tony Tony
  723: S("Thunderbolt Tempo", null, dmg(0.29, { zone: true }), mod("atk", -0.2, 2, "foes")), // Nami
  724: S("Kemuri Boshi", null, dmg(1, { zone: true }), mod("dodge", 0.3, 2, "team")), // Usopp
  1662: S("Armure de sable", null, dmg(0.44, { zone: true }), { k: "shield", pct: 0.15, to: "team" }), // Gaara
  2007: S("Possession des ombres", null, dmg(0.72, { zone: true }), mod("crit", -0.3, 2, "foes"), mod("def", -0.15, 2, "foes")), // Shikamaru Nara
  2072: S("Hiken", "foe", dmg(0.96, { drain: 0.4 })), // Ace Portgas
  2423: S("Rasengan crapaud", null, dmg(1.2, { zone: true }), mod("def", -0.15, 2, "foes")), // Jiraiya
  13767: S("Shambles", "foe", dmg(1.1, { pierce: true }), mod("def", -0.2, 2, "target")), // Law Trafalgar
  126635: S("Mahoraga", null, dmg(0.44, { zone: true }), mod("def", 0.2, 3, "team"), { k: "immune", turns: 2, to: "team" }), // Megumi Fushiguro
  127212: S("Black Flash", "foe", dmg(0.89, { critSure: true })), // Yuuji Itadori
  127691: S("Pourpre", null, dmg(0.76, { zone: true, pierce: true })), // Satoru Gojou
  129571: S("Rika", "deadAlly", { k: "revive", pct: 0.17 }), // Yuuta Okkotsu
  133699: S("Manipulation de malédiction", null, dmg(0.44, { zone: true }), { k: "poison", pct: 0.05, turns: 3, to: "foes" }), // Suguru Getou
  133700: S("Résonance", "foe", dmg(0.96), { k: "poison", pct: 0.08, turns: 3, to: "target" }, mod("atk", -0.15, 2, "target")), // Nobara Kugisaki
  133701: S("Démantèlement", null, dmg(0.59, { zone: true, drain: 0.3 })), // Sukuna
  133704: S("Ratio 7:3", "foe", dmg(0.96), mod("def", -0.25, 2, "target")), // Kento Nanami
  134167: S("Lance du rêve", "foe", dmg(0.8), mod("dodge", 0.3, 2, "self")), // Maki Zenin
  137975: S("Boogie Woogie", "foe", dmg(1.02), mod("crit", 0.25, 2, "team")), // Aoi Toudou
  157115: S("Mot-clé : « Arrêtez-vous »", null, dmg(0.59, { zone: true }), { k: "silence", turns: 1, to: "foes" }), // Toge Inumaki
  162722: S("Lance inversée", "foe", dmg(1.39, { pierce: true }), mod("crit", 0.25, 2, "self")), // Touji Fushiguro
};

/** Sort générique des SSR et UR sans sort écrit, d'après leur type. */
export const GENERIC: Record<CardType, CharacterSpell> = {
  COMBAT: S("Coup décisif", "foe", dmg(1.55, { ignoreDef: 0.3 })),
  MYSTERE: S("Entrave", "foe", dmg(1.31), { k: "silence", turns: 2, to: "target" }),
  MAGIE: S("Drain", "foe", dmg(1.13, { drain: 0.3 })),
  COEUR: S("Bénédiction", null, dmg(0.54, { zone: true }), { k: "heal", pct: 0.12, to: "team" }),
  AVENTURE: S("Charge", null, dmg(0.46, { zone: true }), mod("atk", 0.15, 2, "team")),
};

// ── Archétypes : les sorts des SSR et UR sans sort écrit à la main ──────────────────────────────────────────
// Un archétype fixe la forme du sort (cible, effets) ; son multiplicateur dépend de la rareté et vient de `npm run calibrate:archetypes`.

export type Arch =
  | "strike" | "rend" | "pierce" | "crit" | "drain" | "barrage" | "surge" | "evade"
  | "toxin" | "plague" | "hex" | "seal" | "sap" | "breach" | "blind"
  | "rally" | "focus" | "bulwark" | "veil" | "tide" | "renew" | "ward" | "aegis" | "revive";

interface ArchDef {
  target: CharacterSpell["target"];
  /** Effets du sort pour un multiplicateur donné (pourcentage de PV pour la réanimation) */
  effects: (m: number) => Effect[];
}
const zone = (m: number): Effect => dmg(m, { zone: true });
export const ARCHETYPES: Record<Arch, ArchDef> = {
  strike: { target: "foe", effects: (m) => [dmg(m)] },
  rend: { target: "foe", effects: (m) => [dmg(m, { ignoreDef: 0.3 })] },
  pierce: { target: "foe", effects: (m) => [dmg(m, { pierce: true })] },
  crit: { target: "foe", effects: (m) => [dmg(m, { critSure: true })] },
  drain: { target: "foe", effects: (m) => [dmg(m, { drain: 0.4 })] },
  barrage: { target: null, effects: (m) => [zone(m)] },
  surge: { target: "foe", effects: (m) => [dmg(m), mod("atk", 0.2, 2, "self")] },
  evade: { target: "foe", effects: (m) => [dmg(m), mod("dodge", 0.3, 2, "self")] },
  toxin: { target: "foe", effects: (m) => [dmg(m), { k: "poison", pct: 0.08, turns: 3, to: "target" }] },
  plague: { target: null, effects: (m) => [zone(m), { k: "poison", pct: 0.05, turns: 3, to: "foes" }] },
  hex: { target: "foe", effects: (m) => [dmg(m), { k: "silence", turns: 2, to: "target" }] },
  seal: { target: null, effects: (m) => [zone(m), { k: "silence", turns: 1, to: "foes" }] },
  sap: { target: "foe", effects: (m) => [dmg(m), mod("atk", -0.2, 2, "target")] },
  breach: { target: "foe", effects: (m) => [dmg(m), mod("def", -0.25, 2, "target")] },
  blind: { target: null, effects: (m) => [zone(m), mod("crit", -0.3, 2, "foes"), mod("def", -0.15, 2, "foes")] },
  rally: { target: null, effects: (m) => [zone(m), mod("atk", 0.12, 2, "team")] },
  focus: { target: "foe", effects: (m) => [dmg(m), mod("crit", 0.25, 2, "team")] },
  bulwark: { target: null, effects: (m) => [zone(m), mod("def", 0.2, 3, "team")] },
  veil: { target: null, effects: (m) => [zone(m), mod("dodge", 0.12, 2, "team")] },
  tide: { target: null, effects: (m) => [zone(m), { k: "heal", pct: 0.15, to: "team" }, { k: "purge", to: "team" }] },
  renew: { target: null, effects: (m) => [zone(m), { k: "regen", pct: 0.06, turns: 3, to: "team" }] },
  ward: { target: null, effects: (m) => [zone(m), { k: "shield", pct: 0.06, to: "team" }] },
  aegis: { target: null, effects: (m) => [zone(m), { k: "immune", turns: 2, to: "team" }, { k: "shield", pct: 0.03, to: "team" }] },
  revive: { target: "deadAlly", effects: (m) => [{ k: "revive", pct: m }] },
};

/** Multiplicateur (ou part de PV pour `revive`) de chaque archétype selon la rareté, réglé par `npm run calibrate:archetypes` (≈ +4 points de victoire). */
export const ARCH_MULT: Record<Arch, { SSR: number; UR: number }> = {
  strike: { SSR: 1.13, UR: 1.07 },
  rend: { SSR: 0.94, UR: 0.92 },
  pierce: { SSR: 1.15, UR: 1.13 },
  crit: { SSR: 0.82, UR: 0.76 },
  drain: { SSR: 1.04, UR: 1.02 },
  barrage: { SSR: 0.56, UR: 0.56 },
  surge: { SSR: 0.92, UR: 0.94 },
  evade: { SSR: 0.66, UR: 0.68 },
  toxin: { SSR: 0.96, UR: 0.92 },
  plague: { SSR: 0.22, UR: 0.2 },
  hex: { SSR: 1.1, UR: 1.23 },
  seal: { SSR: 0.52, UR: 0.54 },
  sap: { SSR: 0.98, UR: 0.98 },
  breach: { SSR: 0.85, UR: 0.72 },
  blind: { SSR: 0.29, UR: 0.26 },
  rally: { SSR: 0.4, UR: 0.44 },
  focus: { SSR: 0.56, UR: 0.56 },
  bulwark: { SSR: 0.33, UR: 0.29 },
  veil: { SSR: 0.36, UR: 0.36 },
  tide: { SSR: 0.49, UR: 0.49 },
  renew: { SSR: 0.4, UR: 0.42 },
  ward: { SSR: 0.29, UR: 0.26 },
  aegis: { SSR: 0.36, UR: 0.29 },
  revive: { SSR: 0.2, UR: 0.2 },
};

export function archSpell(arch: Arch, name: string, rarity: "SSR" | "UR"): CharacterSpell {
  const d = ARCHETYPES[arch];
  return { name, target: d.target, effects: d.effects(ARCH_MULT[arch][rarity]) };
}

/** Sorts des SSR et UR sans sort écrit à la main : archétype et nom, par identifiant AniList. Un sort écrit dans CHARACTER_SPELLS l'emporte. */
export const ARCH_SPELLS: Record<number, [Arch, string]> = {
  1: ["rend", "Jeet Kune Do"],
  2: ["veil", "Bluff"],
  719: ["hex", "Le monstre sans nom"],
  718: ["tide", "Le serment du médecin"],
  3096: ["sap", "Interrogatoire"],
  94: ["surge", "Unit-02 déchaîné"],
  86: ["ward", "Champ A.T."],
  89: ["rally", "Synchronisation"],
  1259: ["focus", "Ordre de tir"],
  422: ["pierce", "Dragonslayer"],
  424: ["seal", "Éclipse"],
  434: ["bulwark", "Leçon de vie"],
  5: ["surge", "Getsuga Tenshou"],
  210: ["breach", "Benihime"],
  6: ["hex", "Tsukishiro"],
  908: ["evade", "Shunko"],
  1086: ["blind", "Kyoka Suigetsu"],
  2219: ["hex", "Le Wired"],
  507: ["ward", "Château ambulant"],
  246: ["surge", "Kaio-ken"],
  913: ["pierce", "Final Flash"],
  702: ["rally", "Black Stones"],
  458: ["barrage", "Two Hands"],
  672: ["crit", "Lame de bois"],
  71: ["breach", "Déduction"],
  80: ["toxin", "Crise cardiaque"],
  75: ["sap", "Pomme du shinigami"],
  835: ["focus", "Yeux de shinigami"],
  417: ["hex", "Geass"],
  1111: ["renew", "Code"],
  2075: ["rally", "Qui crois-tu que je sois ?!"],
  2257: ["pierce", "Giga Drill Break"],
  7373: ["breach", "Marchandage"],
  8455: ["barrage", "Death Cannon"],
  12064: ["surge", "Tigre de poche"],
  22037: ["breach", "Agrafes"],
  23602: ["drain", "Vampire"],
  22036: ["renew", "Régénération"],
  22055: ["aegis", "Sawarineko"],
  11: ["pierce", "Alchimie sans cercle"],
  68: ["barrage", "Flame Alchemy"],
  12: ["ward", "Armure d'Al"],
  5189: ["rend", "Armure Purgatoire"],
  34470: ["sap", "Contre-argument"],
  35252: ["revive", "Time Leap"],
  38005: ["veil", "Arrêt du temps"],
  500: ["plague", "Vers de Zouken"],
  498: ["barrage", "Gemmes de Tohsaka"],
  497: ["pierce", "Excalibur"],
  2514: ["barrage", "Gate of Babylon"],
  10010: ["crit", "Origine : Time Alter"],
  27: ["evade", "Godspeed"],
  28: ["hex", "Chaîne du jugement"],
  30: ["surge", "Jajanken"],
  31: ["sap", "Bungee Gum"],
  58: ["hex", "Skill Hunter"],
  23277: ["drain", "Garde royale"],
  36828: ["strike", "Starburst Stream"],
  36765: ["surge", "Dual Blades"],
  55131: ["breach", "Déduction économe"],
  6356: ["blind", "Hermit Purple"],
  4003: ["pierce", "Star Platinum"],
  11772: ["crit", "Steel Ball"],
  4004: ["drain", "The World"],
  13085: ["tide", "Crazy Diamond"],
  12055: ["toxin", "Killer Queen"],
  11222: ["plague", "Stone Free"],
  19492: ["strike", "Tusk"],
  12659: ["sap", "Heaven's Door"],
  10529: ["renew", "Gold Experience"],
  13045: ["hex", "Sticky Fingers"],
  65865: ["veil", "Œil du tyran"],
  67065: ["breach", "Jugement du solitaire"],
  67067: ["hex", "Glace silencieuse"],
  70069: ["pierce", "Zafkiel"],
  45627: ["rend", "Tourbillon de lames"],
  40882: ["surge", "Titan Assaillant"],
  40881: ["evade", "Écharpe rouge"],
  46494: ["pierce", "Titan Colossal"],
  71121: ["barrage", "Lance-éclair"],
  46496: ["rally", "Charge suicide"],
  125659: ["strike", "Titan Mâchoire"],
  45887: ["crit", "Tir d'arc"],
  46484: ["bulwark", "Titan Cuirassé"],
  83797: ["rend", "Senketsu"],
  84677: ["surge", "Régalia"],
  64769: ["evade", "Attaque éclair"],
  64771: ["focus", "Passe parfaite"],
  67327: ["aegis", "Rolling Thunder"],
  71267: ["sap", "Lecture du jeu"],
  71611: ["crit", "Service dévastateur"],
  67329: ["breach", "Bloc impitoyable"],
  88937: ["surge", "Frappe de hibou"],
  71269: ["hex", "Mur de Nekoma"],
  87275: ["plague", "Kagune de Kakuja"],
  87277: ["evade", "Kagune d'Ukaku"],
  88412: ["toxin", "Lame de Jason"],
  63351: ["rend", "Murasame"],
  65239: ["seal", "Mahyo"],
  69411: ["renew", "Violon d'avril"],
  71933: ["crit", "Lame d'assassin"],
  65643: ["aegis", "Pieuvre jaune"],
  65645: ["pierce", "Coup de claquement"],
  77605: ["drain", "Vol de vie"],
  75216: ["renew", "Plat divin"],
  80243: ["tide", "Langue des signes"],
  80491: ["bulwark", "Rédemption"],
  73935: ["crit", "Coup sérieux"],
  81929: ["barrage", "Tempête psychique"],
  89361: ["barrage", "Explosion"],
  89364: ["strike", "Vol de talent"],
  89362: ["tide", "Purification"],
  89198: ["hex", "Pas de la déchéance"],
  89201: ["breach", "Ultra-déduction"],
  89853: ["pierce", "Corruption"],
  88572: ["seal", "Hyoga"],
  88575: ["renew", "Morning Star"],
  88573: ["sap", "Ruse de Subaru"],
  21044: ["breach", "Partie de shogi"],
  89220: ["pierce", "Fire and Ice"],
  88892: ["barrage", "Howitzer Impact"],
  89028: ["surge", "One For All"],
  89225: ["hex", "Effacement"],
  89224: ["rally", "Symbole de la paix"],
  89243: ["bulwark", "Durcissement"],
  89334: ["hex", "Hypnose"],
  89616: ["surge", "100 %"],
  121052: ["pierce", "Magie des mots"],
  90107: ["blind", "Télépathie"],
  90169: ["renew", "Poupée de souvenirs"],
  124440: ["rend", "Zankantou"],
  123285: ["strike", "Anti-magie"],
  121889: ["blind", "Pari fou"],
  123212: ["sap", "Manipulation"],
  123385: ["ward", "Éclats de lustre"],
  88889: ["evade", "Transformation de raphtalia"],
  124382: ["tide", "Triade"],
  124381: ["drain", "Piloter le Strelizia"],
  13580: ["crit", "Coup au but"],
  123962: ["plague", "Dévoreur"],
  127222: ["veil", "Charme de lapine"],
  127221: ["renew", "Syndrome de l'adolescence"],
  10138: ["rend", "Lame de Thorfinn"],
  13020: ["sap", "Roi de la guerre"],
  121724: ["sap", "Plan d'évasion"],
  121700: ["aegis", "Cerveau de la ferme"],
  120649: ["hex", "Guerre de l'amour"],
  121103: ["rally", "Chika Dance"],
  125886: ["sap", "Règlement intérieur"],
  121102: ["breach", "Cri du cœur"],
  121104: ["evade", "Ninja du conseil"],
  121101: ["focus", "Président du conseil"],
  126071: ["surge", "Respiration de l'eau"],
  127518: ["renew", "Forme de démon"],
  129130: ["surge", "Respiration de la bête"],
  129131: ["pierce", "Respiration de la foudre"],
  130050: ["strike", "Onzième forme"],
  129133: ["rally", "Flamme éternelle"],
  136070: ["toxin", "Papillon vénéneux"],
  136071: ["barrage", "Éclat sonore"],
  136072: ["tide", "Respiration de l'amour"],
  126375: ["focus", "Cinq frères et sœurs"],
  126373: ["tide", "Fleur de tendresse"],
  126372: ["breach", "Cuisine piquante"],
  130848: ["barrage", "Feu orange"],
  124142: ["renew", "Science du monde"],
  209: ["evade", "Rage du chat"],
  207: ["aegis", "Sourire de Tooru"],
  125168: ["drain", "Instinct de loup"],
  128651: ["hex", "Sceau des légendes"],
  88350: ["ward", "Barrière de Roxy"],
  88348: ["strike", "Magie sans incantation"],
  88349: ["surge", "Colère d'Eris"],
  154224: ["veil", "Petite amie en location"],
  128106: ["renew", "Sourire parfait"],
  141061: ["focus", "Reine écarlate"],
  174873: ["evade", "Pilote d'élite"],
  141060: ["rend", "Faucheur"],
  145341: ["surge", "Mikey invincible"],
  145344: ["bulwark", "Cœur loyal"],
  145345: ["rend", "Dragon de Toman"],
  284157: ["veil", "Netrunner"],
  66173: ["renew", "Vrai moi"],
  66171: ["tide", "Cœur ouvert"],
  137080: ["hex", "Contrôle total"],
  130102: ["toxin", "Démon tronçonneuse"],
  137079: ["drain", "Sang de Power"],
  137081: ["hex", "Démon du renard"],
  148740: ["barrage", "Bombe d'amour"],
  257562: ["rally", "Solo de guitare"],
  261674: ["focus", "Rythme de batterie"],
  136837: ["pierce", "Éclat d'ombre"],
  133676: ["evade", "Cosplay parfait"],
  121956: ["veil", "Communication par carnet"],
  162213: ["surge", "Dribble démoniaque"],
  138102: ["crit", "Rose épineuse"],
  138100: ["veil", "Télépathie d'Anya"],
  138101: ["breach", "Crépuscule"],
  168774: ["drain", "Morsure de nuit"],
  260329: ["evade", "Reflexes de Lycoris"],
  188783: ["sap", "Regard glacial"],
  129928: ["strike", "Armée d'ombres"],
  176754: ["revive", "Sort de résurrection"],
  183965: ["rend", "Zoltraak"],
  126824: ["breach", "Analyse de poisons"],
  172759: ["rally", "Concert d'idole"],
  218648: ["rally", "Élan de badminton"],
  222594: ["barrage", "Pouvoir de Momo"],
};

/** Sort de personnage d'une carte, ou null (N, R et SR n'en ont pas). */
export function spellOf(characterId: number, rarity: Rarity, type: CardType): CharacterSpell | null {
  if (rarity !== "SSR" && rarity !== "UR") return null;
  const arch = ARCH_SPELLS[characterId];
  return SECONDARY_OVERRIDES[characterId] ?? SECONDARY_DATA[characterId] ?? CHARACTER_SPELLS[characterId] ?? (arch ? archSpell(arch[0], arch[1], rarity) : GENERIC[type]);
}

const pct = (x: number) => `${Math.round(Math.abs(x) * 100)} %`;
const nx = (n: number) => `${n} tour${n > 1 ? "s" : ""}`;
const WHO: Record<Scope, string> = { target: "la cible", self: "le lanceur", team: "l'équipe", foes: "tous les ennemis" };
const STAT_NAMES: Record<ModStat, string> = { atk: "ATK", def: "DEF", crit: "critique", dodge: "esquive", speed: "vitesse" };
/** crit et esquive se comptent en points de pourcentage (plafond 100 %), ATK et DEF en part de la stat */
const amountText = (stat: ModStat, amount: number) => `${amount > 0 ? "+" : "−"}${Math.round(Math.abs(amount) * 100)}${stat === "crit" || stat === "dodge" ? " points" : " %"}`;

/**
 * Texte d'un effet. Par défaut les multiplicateurs de dégâts sont masqués (lisibilité) ; `detailed` les montre (au survol dans l'interface).
 */
export function describeEffect(e: Effect, detailed = false): string {
  switch (e.k) {
    case "damage":
      return [
        detailed ? `${String(e.mult).replace(".", ",")}× ATK${e.zone ? " sur tous les ennemis" : ""}` : e.zone ? "Frappe tous les ennemis en même temps" : "Frappe la cible",
        e.ignoreDef && `ignore ${pct(e.ignoreDef)} de la DEF`,
        e.ignoreMissing && `ignore ${pct(e.ignoreMissing)} de plus de la DEF × PV manquants du lanceur`,
        e.pierce && "traverse les boucliers",
        e.critSure && "coup critique assuré",
        e.drain && `rend ${pct(e.drain)} des dégâts en PV`,
      ].filter(Boolean).join(", ");
    case "mod":
      return `${STAT_NAMES[e.stat]} ${amountText(e.stat, e.amount)} pour ${e.to === "foes" && e.count ? `les ${e.count} ennemis vivants à l’ATK la plus élevée` : WHO[e.to]}, ${nx(e.turns)}`;
    case "heal": return `soigne ${WHO[e.to]} de ${pct(e.pct)} des PV max`;
    case "regen": return `soin sur la durée de ${pct(e.pct)} des PV max par tour pour ${WHO[e.to]}, ${nx(e.turns)}`;
    case "shield": return `bouclier de ${pct(e.pct)} des PV max pour ${WHO[e.to]}`;
    case "poison": return `poison : ${pct(e.pct)} des PV max par tour pour ${WHO[e.to]}, ${nx(e.turns)}`;
    case "silence": return `silence sur ${WHO[e.to]} (attaque de base seulement), ${nx(e.turns)} ; sans effet sur les boss`;
    case "stun": return `étourdit jusqu'à ${e.count} ennemi${e.count > 1 ? "s" : ""} vivant${e.count > 1 ? "s" : ""} à l'ATK la plus élevée : chacun passe ${e.turns === 1 ? "son prochain tour" : `ses ${e.turns} prochains tours`} ; sans effet sur les boss`;
    case "immune": return `immunité aux malus pour ${WHO[e.to]}, ${nx(e.turns)}`;
    case "purge": return `retire les malus de ${WHO[e.to]}`;
    case "revive": return `réanime un allié mort avec ${pct(e.pct)} de ses PV max (une fois par combat)`;
    case "taunt": return `provocation : les attaques à cible unique visent le lanceur, ${nx(e.turns)}`;
    case "reduce": return `dégâts subis −${pct(e.pct)} pour ${WHO[e.to]}, ${nx(e.turns)}`;
  }
}
const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
export const isSoloBuff = (spell: CharacterSpell): boolean => spell.target === null && spell.effects.length > 0 && spell.effects.every((effect) => {
  if (effect.k === "taunt") return true;
  if (effect.k === "mod") return effect.to === "self" && effect.amount > 0;
  return (effect.k === "heal" || effect.k === "regen" || effect.k === "shield" || effect.k === "reduce" || effect.k === "immune" || effect.k === "purge") && effect.to === "self";
});
/** Description d'un sort : multiplicateurs masqués par défaut, visibles avec `detailed` */
export const describeSpell = (sp: CharacterSpell, detailed = false) => capital(sp.effects.map((e) => describeEffect(e, detailed)).join(" ; ")) + "." + (isSoloBuff(sp) ? " Tour immédiat : le lanceur peut rejouer." : "");
export const SPELL_TARGET_LABEL = { foe: "1 ennemi", ally: "1 allié", deadAlly: "1 allié mort", none: "Aucune cible" } as const;
