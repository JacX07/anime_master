// Libellés d'affichage des raretés, types et finitions.

import type { CardType, Rarity } from "../generated/prisma/enums";
import type { Finish } from "./pull";

export const RARITY_NAMES: Record<Rarity, string> = {
  N: "Normal",
  R: "Rare",
  SR: "Super Rare",
  SSR: "Super Super Rare",
  UR: "Ultra Rare",
};

export const TYPE_LABELS: Record<CardType, { name: string }> = {
  COMBAT: { name: "Combat" },
  MYSTERE: { name: "Mystère" },
  MAGIE: { name: "Magie" },
  COEUR: { name: "Cœur" },
  AVENTURE: { name: "Aventure" },
};

export const FINISH_NAMES: Record<Finish, string> = {
  NORMAL: "Normal",
  HOLO: "Holo",
  GOLD: "Gold",
};
