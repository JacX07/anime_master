// Ouverture d'un paquet côté serveur (SPEC étape 2, §6).

import type { CardType, Rarity } from "../generated/prisma/enums";
import { getCollectionPower } from "./collection";
import { prisma } from "./db";
import { CRYSTAL_PRICE, crystalsLeft } from "./economy";
import { afterSpend, crystalStock } from "./crystal-stock";
import { rollLot, secureRandom, type Finish, type LotSize, type PityTrigger, type Random } from "./pull";

export class NoPackAvailableError extends Error {
  constructor() {
    super("Pas assez de cristaux");
  }
}

/** Une autre ouverture a modifié le stock entre la lecture et l'écriture. */
export class ConcurrentOpeningError extends Error {
  constructor() {
    super("Ouverture simultanée détectée");
  }
}

export interface OpenedCard {
  cardId: string;
  characterId: number;
  name: string;
  imageUrl: string;
  rarity: Rarity;
  type: CardType;
  attack: number;
  defense: number;
  power: number;
  series: string | null;
  finish: Finish;
  serial: number;
  /** Le joueur ne possédait pas encore ce personnage */
  isNew: boolean;
}

export interface PlayerPackState {
  /** Cristaux utilisables maintenant */
  available: number;
  nextCrystalAt: string | null;
  cardsSinceSSR: number;
  cardsSinceUR: number;
  /** Puissance totale de la collection (somme de la puissance de chaque carte) */
  collectionPower: number;
  /** Boutique : solde en Ryō, prix d'un cristal et cristaux encore achetables aujourd'hui */
  balance: number;
  crystalPrice: number;
  crystalsLeft: number;
}

export interface OpenedPack {
  cards: OpenedCard[];
  pity: PityTrigger;
  /** Taille du lot (5 ou 10) */
  lotSize: LotSize;
  state: PlayerPackState;
}

const USER_PACK_FIELDS = {
  crystals: true,
  crystalsUpdatedAt: true,
  cardsSinceSSR: true,
  cardsSinceUR: true,
  balance: true,
  crystalsBoughtToday: true,
  crystalsBoughtDate: true,
} as const;

export async function getPackState(userId: string, now = new Date()): Promise<PlayerPackState> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: USER_PACK_FIELDS });
  const stock = crystalStock(user.crystals, user.crystalsUpdatedAt, now);
  return {
    available: stock.available,
    nextCrystalAt: stock.nextCrystalAt?.toISOString() ?? null,
    cardsSinceSSR: user.cardsSinceSSR,
    cardsSinceUR: user.cardsSinceUR,
    collectionPower: await getCollectionPower(userId),
    balance: user.balance,
    crystalPrice: CRYSTAL_PRICE,
    crystalsLeft: crystalsLeft(user.crystalsBoughtToday, user.crystalsBoughtDate, now),
  };
}

/**
 * Tire un lot de 5 ou 10 cartes (1 cristal par carte) et enregistre tout dans une seule transaction.
 * Le stock est décrémenté par une mise à jour conditionnelle : si une autre ouverture
 * est passée entre-temps, aucune ligne ne correspond et la transaction est annulée.
 */
export async function openPack(userId: string, size: LotSize = 5, rng: Random = secureRandom): Promise<OpenedPack> {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: USER_PACK_FIELDS });
    if (crystalStock(user.crystals, user.crystalsUpdatedAt, now).available < size) throw new NoPackAvailableError();

    const roll = rollLot(user, size, rng);
    const nextStock = afterSpend(user.crystals, user.crystalsUpdatedAt, now, size);

    const updated = await tx.user.updateMany({
      where: { id: userId, ...user },
      data: { ...nextStock, ...roll.next },
    });
    if (updated.count !== 1) throw new ConcurrentOpeningError();

    // Un personnage au hasard, uniformément, parmi ceux de la rareté tirée
    const characterIds: number[] = [];
    for (const card of roll.cards) {
      const where = { rarity: card.rarity, disabled: false };
      const count = await tx.character.count({ where });
      if (count === 0) throw new Error(`Aucun personnage de rareté ${card.rarity}`);
      const picked = await tx.character.findFirstOrThrow({
        where,
        orderBy: { id: "asc" },
        skip: Math.min(count - 1, Math.floor(rng() * count)),
        select: { id: true },
      });
      characterIds.push(picked.id);
    }

    const alreadyOwned = new Set(
      (
        await tx.card.findMany({
          where: { ownerId: userId, characterId: { in: characterIds } },
          select: { characterId: true },
          distinct: ["characterId"],
        })
      ).map((c) => c.characterId),
    );

    const opening = await tx.packOpening.create({ data: { userId, pityTriggered: roll.pity, lotSize: size }, select: { id: true } });

    const cards: OpenedCard[] = [];
    for (const [i, card] of roll.cards.entries()) {
      // Numéro d'exemplaire : incrément atomique du compteur du personnage
      const character = await tx.character.update({
        where: { id: characterIds[i] },
        data: { pullCount: { increment: 1 } },
        select: {
          id: true,
          name: true,
          imageUrl: true,
          rarity: true,
          type: true,
          attack: true,
          defense: true,
          power: true,
          pullCount: true,
          mainMedia: { select: { titleRomaji: true, titleEnglish: true } },
        },
      });
      const created = await tx.card.create({
        data: {
          ownerId: userId,
          characterId: character.id,
          finish: card.finish,
          serial: character.pullCount,
          rarityAtPull: character.rarity,
          packOpeningId: opening.id,
        },
        select: { id: true },
      });
      cards.push({
        cardId: created.id,
        characterId: character.id,
        name: character.name,
        imageUrl: character.imageUrl,
        rarity: character.rarity,
        type: character.type,
        attack: character.attack,
        defense: character.defense,
        power: character.power,
        series: character.mainMedia?.titleEnglish ?? character.mainMedia?.titleRomaji ?? null,
        finish: card.finish,
        serial: character.pullCount,
        isNew: !alreadyOwned.has(character.id) && !cards.some((c) => c.characterId === character.id),
      });
    }

    const stock = crystalStock(nextStock.crystals, nextStock.crystalsUpdatedAt, now);
    return {
      cards,
      pity: roll.pity,
      lotSize: size,
      state: {
        available: stock.available,
        nextCrystalAt: stock.nextCrystalAt?.toISOString() ?? null,
        ...roll.next,
        collectionPower: await getCollectionPower(userId, tx),
        balance: user.balance,
        crystalPrice: CRYSTAL_PRICE,
        crystalsLeft: crystalsLeft(user.crystalsBoughtToday, user.crystalsBoughtDate, now),
      },
    };
  });
}
