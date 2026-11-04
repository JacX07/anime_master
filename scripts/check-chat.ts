import assert from "node:assert/strict";
import { prisma } from "../src/lib/db";
import { ChatError, deleteMessage, getChatState, getMessages, reportMessage, sendMessage } from "../src/lib/chat";
import { cleanMessage, CHAT_MAX_LENGTH, dmChannel, GENERAL, guildChannel, parseChannel } from "../src/lib/chat-rules";
import { acceptFriendRequest, blockUser, getFriendsState, sendFriendRequest } from "../src/lib/friends";

const check = (label: string, ok: boolean) => { assert.ok(ok, label); console.log(`✓ ${label}`); };
const fails = async (p: Promise<unknown>, text = /./) => { try { await p; return false; } catch (e) { return e instanceof ChatError && text.test(e.message); } };

async function main() {
  // Règles pures
  check("Canaux reconnus", parseChannel(GENERAL)?.kind === "general" && parseChannel("guild:abc")?.kind === "guild" && parseChannel("dm:a:b")?.kind === "dm" && parseChannel("dm:b:a") === null && parseChannel("n'importe quoi") === null);
  check("Identifiant de MP symétrique", dmChannel("x", "y") === dmChannel("y", "x"));
  check("Message vide refusé", cleanMessage("   \n ") === null);
  check("Espaces compactés", cleanMessage("  salut   tout\nle monde ") === "salut tout le monde");
  check("Mot interdit masqué (accents compris)", cleanMessage("espèce de Connard !") === "espèce de ******* !" && cleanMessage("un enculé") === "un ******");
  check("Mot proche non masqué", cleanMessage("la putréfaction") === "la putréfaction");
  check("Longueur limitée", (() => { try { cleanMessage("a".repeat(CHAT_MAX_LENGTH + 1)); return false; } catch { return true; } })() && cleanMessage("a".repeat(CHAT_MAX_LENGTH)) !== null);

  const tag = `ch${Date.now()}`;
  const ids = ["a", "b", "c", "m"].map((s) => `${tag}-${s}`);
  for (const id of ids) await prisma.user.create({ data: { id, name: id, username: id, email: `${id}@test.local` } });
  const [a, b, c, m] = ids;
  const now = Date.now();
  let t = now - 120_000;
  const tick = () => new Date((t += 2000));
  let guildId = "";
  try {
    // Général : niveau 3 requis
    check("Général fermé sous le niveau 3", await fails(sendMessage(a, GENERAL, "salut", tick()), /niveau/));
    for (const id of [a, b]) await prisma.adventureRecord.create({ data: { userId: id, key: "test:xp", xp: 100000 } });
    const sent = await sendMessage(a, GENERAL, "Bonjour le monde", tick());
    check("Général ouvert dès le niveau 3", sent.content === "Bonjour le monde" && sent.author === a);
    check("Cadence : un message par seconde", await fails(sendMessage(a, GENERAL, "encore", new Date(t + 100)), /seconde/));
    check("Message lu par un autre joueur", (await getMessages(b, GENERAL)).some((x) => x.id === sent.id));
    check("Lecture après un repère", (await getMessages(b, GENERAL, sent.createdAt)).length === 0);
    // Non-lus
    await sendMessage(b, GENERAL, "Salut A", tick());
    check("Pas de pastille tant que le général n'a jamais été ouvert", (await getChatState(c)).general.unread === 0);
    check("Non-lu du général après ouverture", (await getChatState(a)).general.unread === 1);
    await getMessages(a, GENERAL);
    check("Lire remet le compteur à zéro", (await getChatState(a)).general.unread === 0);

    // Messages privés : amis seulement
    const dm = dmChannel(a, b);
    check("MP refusé sans amitié", await fails(sendMessage(a, dm, "coucou", tick()), /amis/));
    check("MP d'un tiers refusé", await fails(getMessages(c, dm)));
    await sendFriendRequest(a, b);
    await acceptFriendRequest(b, (await getFriendsState(b)).received[0].friendshipId);
    await sendMessage(a, dm, "Salut B", tick());
    check("MP entre amis + compteur", (await getChatState(b)).dms.find((d) => d.userId === a)?.unread === 1 && (await getChatState(b)).unread >= 1);
    check("Le tiers ne lit pas les MP", await fails(getMessages(c, dm)));
    await blockUser(b, a);
    check("MP impossible après blocage (amitié supprimée)", await fails(sendMessage(a, dm, "toujours là ?", tick())));

    // Guilde : membres seulement ; chef supprime
    const guild = await prisma.guild.create({ data: { name: `G ${tag}`, nameKey: `g-${tag}`, tag: tag.slice(-4).toUpperCase(), ownerId: m } });
    guildId = guild.id;
    await prisma.user.update({ where: { id: m }, data: { guildId, guildRole: "OWNER" } });
    await prisma.user.update({ where: { id: c }, data: { guildId, guildRole: "MEMBER" } });
    const gc = guildChannel(guildId);
    check("Non-membre exclu du chat de guilde", await fails(sendMessage(a, gc, "intrus", tick()), /membre/) && await fails(getMessages(a, gc)));
    const gm = await sendMessage(c, gc, "Salut la guilde", tick());
    check("Membre écrit, autre membre lit", (await getMessages(m, gc)).some((x) => x.id === gm.id));
    check("Tag de guilde affiché", (await getMessages(m, gc))[0].guildTag === guild.tag);
    check("État : onglet guilde", (await getChatState(c)).guild?.channel === gc && (await getChatState(m)).guildOwner === true);
    // Signalement et suppression
    await reportMessage(m, gm.id);
    check("Signalement enregistré, sans doublon", (await prisma.chatReport.count({ where: { messageId: gm.id } })) === 1 && (await reportMessage(m, gm.id), (await prisma.chatReport.count({ where: { messageId: gm.id } })) === 1));
    check("Impossible de signaler son propre message", await fails(reportMessage(c, gm.id)));
    check("Un simple membre ne supprime pas", await fails(deleteMessage(c, gm.id)));
    await deleteMessage(m, gm.id);
    check("Le chef supprime dans sa guilde", (await getMessages(m, gc)).length === 0);
    const gen = (await getMessages(b, GENERAL))[0];
    check("Le chef ne supprime pas dans le général", await fails(deleteMessage(m, gen.id)));
    await prisma.user.update({ where: { id: m }, data: { role: "moderator" } });
    await deleteMessage(m, gen.id);
    check("L'administration supprime dans le général", !(await getMessages(b, GENERAL)).some((x) => x.id === gen.id));
    console.log("\nChat conforme.");
  } finally {
    await prisma.user.updateMany({ where: { id: { in: ids } }, data: { guildId: null } });
    if (guildId) await prisma.guild.deleteMany({ where: { id: guildId } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
