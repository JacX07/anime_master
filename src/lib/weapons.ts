// Armes légendaires (docs/specs/combat.md, « Progression des cartes » §3, et docs/specs/donjons.md). Pur : définitions et recette.
// Armes génériques d'abord, une par type d'affinité ; des armes dédiées à des personnages viendront plus tard.

import type { CardType } from "../generated/prisma/enums";
import type { Weapon } from "./battle";
import { RAID_RESOURCE } from "./raid";
import { UNIVERSES } from "./story";

/** Bonus d'ATK, de DEF et de PV de toute arme légendaire (+10 %, valeur de `donjons.md`). */
export const WEAPON_STAT = 0.1;

export interface WeaponDef {
  key: string;
  name: string;
  type: CardType;
  /** Description du passif, telle qu'affichée */
  passive: string;
  weapon: Weapon;
}

const aura = (type: CardType, name: string, key: string): WeaponDef => ({
  key, name, type,
  passive: "Renfort : +10 % d'ATK à tous les alliés de ce type, porteur compris.",
  weapon: { stat: WEAPON_STAT, passive: { kind: "typeAura", type, bonus: 0.1 } },
});

export const WEAPONS: WeaponDef[] = [
  aura("COMBAT", "Lame de la Brèche", "lame-de-la-breche"),
  {
    key: "voile-d-ombre", name: "Voile d'ombre", type: "MYSTERE",
    passive: "Esquive : 15 % de chances d'esquiver chaque coup d'un sort affilié adverse.",
    weapon: { stat: WEAPON_STAT, passive: { kind: "dodge", chance: 0.15 } },
  },
  aura("MAGIE", "Grimoire des Éclats", "grimoire-des-eclats"),
  aura("COEUR", "Talisman des Signatures", "talisman-des-signatures"),
  aura("AVENTURE", "Boussole des Horizons", "boussole-des-horizons"),
];
export const weaponDef = (key: string) => WEAPONS.find((w) => w.key === key);

/**
 * Recette d'une arme générique *(valeurs proposées le 2026-11-01, à régler)* : des ressources d'arme des boss finaux de l'histoire
 * (de n'importe quel univers, en n'importe quelle proportion) et des cœurs de brèche. Les matériaux du boss mondial, des donjons
 * et des boosters de raid viendront s'y ajouter quand ces modes existeront.
 */
export const WEAPON_RECIPE = { weaponUnits: 20, hearts: 50 };

/** Clés des ressources d'arme (une par univers), dans l'ordre de l'histoire. */
export const WEAPON_RESOURCE_KEYS = UNIVERSES.map((u) => u.weaponResource);

/** Une arme ne se porte que sur une carte éveillée à 5 étoiles. */
export const CAN_EQUIP_STARS = 5;
export { RAID_RESOURCE };
