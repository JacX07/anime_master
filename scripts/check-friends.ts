import assert from "node:assert/strict";
import { prisma } from "../src/lib/db";
import { acceptFriendRequest, assertNotBlocked, blockUser, FriendError, FRIEND_MAX, getFriendsState, relationWith, removeFriendship, seenLabel, sendFriendRequest, touchLastSeen, unblockUser } from "../src/lib/friends";
import { createTrade, TradeError } from "../src/lib/trades";
import { createDuel, DuelError } from "../src/lib/duels";

const check = (label: string, ok: boolean) => { assert.ok(ok, label); console.log(`✓ ${label}`); };
const fails = async (p: Promise<unknown>, type: new (...a: never[]) => Error = FriendError, text = /./) => { try { await p; return false; } catch (e) { return e instanceof type && text.test(e.message); } };

async function main() {
  const tag = `fr${Date.now()}`;
  const ids = ["a", "b", "c"].map((s) => `${tag}-${s}`);
  for (const id of ids) await prisma.user.create({ data: { id, name: id, username: id, email: `${id}@test.local` } });
  const [a, b, c] = ids;
  try {
    check("Pas d'auto-ajout", await fails(sendFriendRequest(a, a)));
    check("Joueur inconnu refusé", await fails(sendFriendRequest(a, "inconnu-xyz")));
    await sendFriendRequest(a, b);
    check("Demande en double refusée", await fails(sendFriendRequest(a, b)));
    check("Demande reçue visible", (await getFriendsState(b)).received.length === 1 && (await getFriendsState(a)).sent.length === 1);
    check("Notification de demande", (await prisma.notification.count({ where: { userId: b, type: "FRIEND_REQUEST" } })) === 1);
    check("Seul le destinataire accepte", await fails(acceptFriendRequest(a, (await getFriendsState(b)).received[0].friendshipId)));
    await acceptFriendRequest(b, (await getFriendsState(b)).received[0].friendshipId);
    check("Amitié des deux côtés", (await getFriendsState(a)).friends.length === 1 && (await getFriendsState(b)).friends.length === 1);
    check("Déjà amis refusé", await fails(sendFriendRequest(b, a)));
    // demande croisée : acceptée directement
    await sendFriendRequest(c, a);
    await sendFriendRequest(a, c);
    check("Demande croisée = amitié", (await relationWith(a, c)).kind === "friends");
    // statut en ligne
    await touchLastSeen(b);
    check("En ligne juste après activité", (await getFriendsState(a)).friends.find((f) => f.id === b)?.online === true);
    check("Libellé « vu il y a »", seenLabel(new Date(Date.now() - 3 * 3600_000)) === "vu il y a 3 h" && seenLabel(null) === "jamais vu");
    // blocage
    await blockUser(b, `${tag}-a`);
    check("Bloquer supprime l'amitié", (await getFriendsState(b)).friends.length === 0);
    check("Le bloqué ne peut plus envoyer de demande", await fails(sendFriendRequest(a, b)));
    check("Le bloqueur ne peut pas non plus", await fails(sendFriendRequest(b, a)));
    check("Échange refusé", await fails(createTrade(a, { toUsername: b, giveCardIds: [], askCardIds: [], giveRyo: 1, askRyo: 0 }), TradeError, /bloqué|contacté/));
    check("Défi refusé", await fails(createDuel(a, b, []), DuelError, /bloqué|contacté/));
    check("assertNotBlocked lève", await fails(assertNotBlocked(a, b)));
    check("Liste des bloqués", (await getFriendsState(b)).blocked.length === 1);
    await unblockUser(b, a);
    await assertNotBlocked(a, b);
    check("Débloqué : plus d'obstacle", true);
    // retrait
    const rel = await relationWith(a, c);
    if (rel.kind === "friends") await removeFriendship(a, rel.friendshipId);
    check("Retrait des deux côtés", (await relationWith(c, a)).kind === "none");
    check("Limite de 100 amis définie", FRIEND_MAX === 100);
    console.log("\nAmis et blocage conformes.");
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
