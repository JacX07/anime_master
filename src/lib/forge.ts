import { prisma } from "./db";
import { BattleError } from "./battles";
import { CAN_EQUIP_STARS, RAID_RESOURCE, WEAPONS, WEAPON_RECIPE, WEAPON_RESOURCE_KEYS } from "./weapons";

/** Forge et équipe l'arme du type de la carte, en une transaction. */
export async function forgeWeapon(userId: string, cardId: string) {
  return prisma.$transaction(async (tx) => {
    const card = await tx.card.findUnique({ where: { id: cardId }, include: { character: true } });
    if (!card || card.ownerId !== userId) throw new BattleError("Carte introuvable.");
    if (card.stars !== CAN_EQUIP_STARS) throw new BattleError("Il faut une carte à 5 étoiles.");
    if (card.inAuction || card.inExpedition || await tx.tradeItem.count({ where: { cardId, trade: { status: "PENDING" } } }))
      throw new BattleError("Carte indisponible (enchère, expédition ou échange).");
    const def = WEAPONS.find((w) => w.type === card.character.type)!;
    const equipped = await tx.card.updateMany({ where: { id: cardId, ownerId: userId, weaponKey: null, stars: CAN_EQUIP_STARS }, data: { weaponKey: def.key } });
    if (equipped.count !== 1) throw new BattleError("Cette carte possède déjà une arme.");
    const hearts = await tx.resourceStock.updateMany({ where: { userId, key: RAID_RESOURCE, quantity: { gte: WEAPON_RECIPE.hearts } }, data: { quantity: { decrement: WEAPON_RECIPE.hearts } } });
    if (hearts.count !== 1) throw new BattleError("Cœurs de brèche insuffisants.");
    let remaining = WEAPON_RECIPE.weaponUnits;
    for (const key of WEAPON_RESOURCE_KEYS) {
      const stock = await tx.resourceStock.findUnique({ where: { userId_key: { userId, key } } });
      const quantity = Math.min(remaining, stock?.quantity ?? 0);
      if (!quantity) continue;
      const paid = await tx.resourceStock.updateMany({ where: { userId, key, quantity: { gte: quantity } }, data: { quantity: { decrement: quantity } } });
      if (paid.count !== 1) throw new BattleError("Les ressources ont changé, réessaie.");
      remaining -= quantity;
      if (!remaining) break;
    }
    if (remaining) throw new BattleError("Ressources de boss final insuffisantes.");
    return def.key;
  });
}
