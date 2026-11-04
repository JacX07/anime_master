// Ouverture d'un paquet côté serveur (SPEC étape 2, §6).

import type { CardType, Rarity } from "../generated/prisma/enums";
import type { Prisma } from "../generated/prisma/client";
import { getCollectionPower } from "./collection";
import { prisma } from "./db";
import { CRYSTAL_PRICE, crystalsLeft } from "./economy";
import { afterSpend, crystalStock } from "./crystal-stock";
import { isBannerOpen, WELCOME_KEYS } from "./banners";
import { track } from "./events";
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

/** Le booster de bienvenue a déjà été récupéré (une seule fois par compte, SPEC collection §8 ter). */
export class WelcomeBoosterClaimedError extends Error {
  constructor() {
    super("Ton booster de bienvenue a déjà été récupéré.");
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

/** Bannière refusée : inconnue, fermée, ou pas de quoi la payer. */
export class BannerError extends Error {}

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
  /** Tirages de bienvenue restants et bannière choisie (null tant que le joueur n'a pas choisi) */
  welcomeDraws: number;
  welcomeBannerId: string | null;
  /** Booster de bienvenue ×10 encore à récupérer */
  welcomeBoosterAvailable: boolean;
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
  welcomeDraws: true,
  welcomeBannerId: true,
  welcomeBoosterClaimedAt: true,
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
    welcomeDraws: user.welcomeDraws,
    welcomeBannerId: user.welcomeBannerId,
    welcomeBoosterAvailable: user.welcomeBoosterClaimedAt === null,
  };
}

/**
 * Tire un lot de 5 ou 10 cartes (1 cristal par carte) et enregistre tout dans une seule transaction.
 * Le stock est décrémenté par une mise à jour conditionnelle : si une autre ouverture
 * est passée entre-temps, aucune ligne ne correspond et la transaction est annulée.
 */
export async function openPack(userId: string, size: LotSize = 5, rng: Random = secureRandom, bannerId: string | null = null): Promise<OpenedPack> {
  return openLot(userId, size, rng, bannerId, false);
}

/** Booster de bienvenue ×10 : gratuit, une seule fois par compte, tout le catalogue, une SSR ou une UR garantie (SPEC collection §8 ter). */
export async function openWelcomeBooster(userId: string, rng: Random = secureRandom): Promise<OpenedPack> {
  return openLot(userId, 10, rng, null, true);
}

async function openLot(userId: string, size: LotSize, rng: Random, bannerId: string | null, welcomeBooster: boolean): Promise<OpenedPack> {
  const opened = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: USER_PACK_FIELDS });
    if (welcomeBooster && user.welcomeBoosterClaimedAt) throw new WelcomeBoosterClaimedError();
    const banner = bannerId ? await tx.banner.findUnique({ where: { id: bannerId }, select: { id: true, key: true, costKind: true, weight: true, startsAt: true, endsAt: true } }) : null;
    if (bannerId && (!banner || !isBannerOpen(banner, now))) throw new BannerError("Cette bannière n'est plus disponible.");

    // Ce que le lot coûte : cristaux normaux ou tirages de bienvenue. Le pity, lui, est commun à tout.
    let payment: Prisma.UserUpdateManyMutationInput = {};
    if (welcomeBooster) {
      payment = { welcomeBoosterClaimedAt: now };
    } else if (banner?.costKind === "WELCOME") {
      if (user.welcomeBannerId && user.welcomeBannerId !== banner.id) throw new BannerError("Tu as déjà choisi ta bannière de bienvenue.");
      if (!user.welcomeBannerId && !WELCOME_KEYS.includes(banner.key)) throw new BannerError("Cette bannière de bienvenue n'est plus proposée.");
      if (user.welcomeDraws < size) throw new BannerError(`Il te reste ${user.welcomeDraws} tirage${user.welcomeDraws > 1 ? "s" : ""} de bienvenue.`);
      payment = { welcomeDraws: user.welcomeDraws - size, welcomeBannerId: banner.id };
    } else {
      if (crystalStock(user.crystals, user.crystalsUpdatedAt, now).available < size) throw new NoPackAvailableError();
      payment = afterSpend(user.crystals, user.crystalsUpdatedAt, now, size);
    }

    const roll = rollLot(user, size, rng, welcomeBooster);
    // `...user` inclut `welcomeBoosterClaimedAt` : si le booster vient d'être récupéré par une autre requête, rien ne correspond
    const updated = await tx.user.updateMany({
      where: { id: userId, ...user },
      data: { ...payment, ...roll.next },
    });
    if (updated.count !== 1) throw new ConcurrentOpeningError();

    // Un personnage au hasard, uniformément, parmi ceux de la rareté tirée. Avec une bannière, `weight` des cartes
    // viennent de ses personnages (de cette rareté) ; le reste, ou une bannière sans personnage de cette rareté, du pool complet.
    const characterIds: number[] = [];
    for (const card of roll.cards) {
      let where: Prisma.CharacterWhereInput = { rarity: card.rarity, disabled: false };
      let count = 0;
      if (banner && rng() < banner.weight) {
        where = { ...where, banners: { some: { bannerId: banner.id } } };
        count = await tx.character.count({ where });
      }
      if (count === 0) {
        where = { rarity: card.rarity, disabled: false };
        count = await tx.character.count({ where });
      }
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

    const opening = await tx.packOpening.create({ data: { userId, pityTriggered: roll.pity, lotSize: size, bannerId: banner?.id ?? null }, select: { id: true } });

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

    const stock = crystalStock(payment.crystals !== undefined ? (payment.crystals as number) : user.crystals, (payment.crystalsUpdatedAt as Date | undefined) ?? user.crystalsUpdatedAt, now);
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
        welcomeDraws: (payment.welcomeDraws as number | undefined) ?? user.welcomeDraws,
        welcomeBannerId: (payment.welcomeBannerId as string | undefined) ?? user.welcomeBannerId,
        welcomeBoosterAvailable: user.welcomeBoosterClaimedAt === null && !welcomeBooster,
      },
    };
  });
  const rarities: Record<string, number> = {};
  for (const c of opened.cards) rarities[c.rarity] = (rarities[c.rarity] ?? 0) + 1;
  await track("pack_open", userId, {
    lotSize: opened.lotSize, bannerId, welcomeBooster, pity: opened.pity, rarities,
    newCards: opened.cards.filter((c) => c.isNew).length, finishes: opened.cards.filter((c) => c.finish !== "NORMAL").length,
  });
  return opened;
}
