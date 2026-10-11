// Ouverture d'un paquet côté serveur (SPEC étape 2, §6).

import type { CardType, Rarity } from "../generated/prisma/enums";
import { getCollectionPower } from "./collection";
import { prisma } from "./db";
import { PACK_PRICE, purchasesLeft } from "./economy";
import { afterOpening, packStock } from "./pack-stock";
import { rollPack, secureRandom, type Finish, type PityTrigger, type Random } from "./pull";

export class NoPackAvailableError extends Error {
  constructor() {
    super("Aucun paquet disponible");
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
  available: number;
  nextPackAt: string | null;
  packsSinceSSR: number;
  packsSinceUR: number;
  /** Puissance totale de la collection (somme de la puissance de chaque carte) */
  collectionPower: number;
  /** Boutique : solde en Ryō, prix d'un paquet et achats restants aujourd'hui */
  balance: number;
  packPrice: number;
  purchasesLeft: number;
}

export interface OpenedPack {
  cards: OpenedCard[];
  pity: PityTrigger;
  state: PlayerPackState;
}

const USER_PACK_FIELDS = {
  packsStored: true,
  lastPackAt: true,
  packsSinceSSR: true,
  packsSinceUR: true,
  balance: true,
  packsBoughtToday: true,
  packsBoughtDate: true,
} as const;

export async function getPackState(userId: string, now = new Date()): Promise<PlayerPackState> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: USER_PACK_FIELDS });
  const stock = packStock(user.packsStored, user.lastPackAt, now);
  return {
    available: stock.available,
    nextPackAt: stock.nextPackAt?.toISOString() ?? null,
    packsSinceSSR: user.packsSinceSSR,
    packsSinceUR: user.packsSinceUR,
    collectionPower: await getCollectionPower(userId),
    balance: user.balance,
    packPrice: PACK_PRICE,
    purchasesLeft: purchasesLeft(user.packsBoughtToday, user.packsBoughtDate, now),
  };
}

/**
 * Tire 5 cartes et enregistre tout dans une seule transaction.
 * Le stock est décrémenté par une mise à jour conditionnelle : si une autre ouverture
 * est passée entre-temps, aucune ligne ne correspond et la transaction est annulée.
 */
export async function openPack(userId: string, rng: Random = secureRandom): Promise<OpenedPack> {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: USER_PACK_FIELDS });
    if (packStock(user.packsStored, user.lastPackAt, now).available < 1) throw new NoPackAvailableError();

    const roll = rollPack(user, rng);
    const nextStock = afterOpening(user.packsStored, user.lastPackAt, now);

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

    const opening = await tx.packOpening.create({ data: { userId, pityTriggered: roll.pity }, select: { id: true } });

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

    const stock = packStock(nextStock.packsStored, nextStock.lastPackAt, now);
    return {
      cards,
      pity: roll.pity,
      state: {
        available: stock.available,
        nextPackAt: stock.nextPackAt?.toISOString() ?? null,
        ...roll.next,
        collectionPower: await getCollectionPower(userId, tx),
        balance: user.balance,
        packPrice: PACK_PRICE,
        purchasesLeft: purchasesLeft(user.packsBoughtToday, user.packsBoughtDate, now),
      },
    };
  });
}

export const BULK_SIZES = [5, 10] as const;

export interface OpenedBulk {
  /** Toutes les cartes tirées, paquet après paquet */
  cards: OpenedCard[];
  /** Nombre de paquets réellement ouverts (moins que demandé si le stock ou un conflit l'a arrêté) */
  opened: number;
  /** Pity déclenchés pendant la série */
  pities: PityTrigger[];
  state: PlayerPackState;
}

/**
 * Ouvre `count` paquets d'affilée, chacun dans sa propre transaction (stock, pity et numéros d'exemplaire
 * se comportent exactement comme pour des ouvertures successives). Refuse tout si le stock est insuffisant.
 */
export async function openPacks(userId: string, count: number, rng: Random = secureRandom): Promise<OpenedBulk> {
  const before = await getPackState(userId);
  if (before.available < count) throw new NoPackAvailableError();
  const cards: OpenedCard[] = [];
  const pities: PityTrigger[] = [];
  let state = before;
  let opened = 0;
  try {
    for (; opened < count; opened++) {
      const pack = await openPack(userId, rng);
      cards.push(...pack.cards);
      if (pack.pity !== "NONE") pities.push(pack.pity);
      state = pack.state;
    }
  } catch (err) {
    // Les paquets déjà ouverts sont acquis : on les renvoie plutôt que de les perdre de vue
    if (opened === 0) throw err;
  }
  return { cards, opened, pities, state };
}
