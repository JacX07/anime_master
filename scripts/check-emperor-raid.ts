// Défi des empereurs côté serveur : accès, vagues, une victoire par jour, clés, ressources légendaires, Hardcore.
// Usage : npm run check:emperor-raid (Node 24)
import { BattleError, getBattle, setAttackTeam, startBattle } from "../src/lib/battles";
import { prisma } from "../src/lib/db";
import { ALL_KEYS, ALL_LEGENDARY_RESOURCES, EMPERORS, HARDCORE_KEY, emperorKey, legendaryAmount, hardcoreDrops } from "../src/lib/emperors";
import { seededRandom } from "../src/lib/battle";
import { LEVELS, UNIVERSES } from "../src/lib/story";

let failures = 0;
function check(label: string, ok: boolean, detail = "") { if (!ok) failures++; console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`); }
const rejects = (p: Promise<unknown>, re?: RegExp) => p.then(() => false, (e) => e instanceof BattleError && (!re || re.test(e.message)));

async function main() {
  // Règles pures
  const rand = seededRandom(7);
  const amounts = (d: string) => Array.from({ length: 400 }, () => legendaryAmount(d, rand));
  check("Quantités : Normal 1", amounts("normal").every((n) => n === 1));
  check("Quantités : Difficile 1 à 2, Cauchemar 2 à 3", amounts("difficile").every((n) => n === 1 || n === 2) && amounts("cauchemar").every((n) => n === 2 || n === 3)
    && new Set(amounts("difficile")).size === 2 && new Set(amounts("cauchemar")).size === 2);
  check("Hardcore : deux ressources différentes", Array.from({ length: 200 }, () => hardcoreDrops(rand)).every((d) => d.length === 2 && d[0] !== d[1] && d.every((x) => ALL_LEGENDARY_RESOURCES.includes(x))));

  const uid = `em-${Date.now()}`;
  await prisma.user.create({ data: { id: uid, name: uid, username: uid, email: `${uid}@test.local` } });
  try {
    await prisma.storyProgress.create({ data: { userId: uid, universe: UNIVERSES[0].key, maxLevel: LEVELS } });
    const opening = await prisma.packOpening.create({ data: { userId: uid, lotSize: 4, pityTriggered: "NONE" } });
    let serial = 950000 + Math.floor(Math.random() * 40000);
    const chars = await prisma.character.findMany({ where: { disabled: false, rarity: "UR", id: { notIn: EMPERORS.map((e) => e.characterId) } }, take: 4, orderBy: { id: "asc" }, select: { id: true } });
    const ids: string[] = [];
    for (const c of chars) ids.push((await prisma.card.create({ data: { ownerId: uid, characterId: c.id, finish: "NORMAL", serial: serial++, rarityAtPull: "UR", packOpeningId: opening.id, stars: 5 } })).id);
    await setAttackTeam(uid, ids);
    // Équipe très puissante : les combats ne servent qu'à tester le butin
    const energyBefore = (await prisma.user.findUniqueOrThrow({ where: { id: uid }, select: { energy: true } })).energy;

    check("Clé inconnue refusée", await rejects(startBattle(uid, "emperor:inconnu:normal", false)));
    check("Difficulté verrouillée avant la première victoire", await rejects(startBattle(uid, emperorKey("shanks", "difficile"), false), /verrouillée/));
    const first = await startBattle(uid, emperorKey("shanks", "normal"), false);
    check("Passage contre Shanks", first.winner === "A" && first.status === "DONE", `vainqueur ${first.winner}`);
    check("Trois phases : deux vagues d'équipage puis Shanks", first.log.filter((e) => e.kind === "wave").length === 2);
    const stock = async () => Object.fromEntries((await prisma.resourceStock.findMany({ where: { userId: uid } })).map((r) => [r.key, r.quantity]));
    let st = await stock();
    check("Victoire : clé et cheveux roux", st["cle-shanks"] === 1 && st["cheveux-roux-de-shanks"] === 1, JSON.stringify(st));
    check("Le butin est affiché", Boolean(first.loot?.resources["cle-shanks"]) && Boolean(first.loot?.resources["cheveux-roux-de-shanks"]));
    const energyAfter = (await prisma.user.findUniqueOrThrow({ where: { id: uid }, select: { energy: true } })).energy;
    check("Le passage coûte 1 énergie", energyBefore - energyAfter === 1, `${energyBefore} → ${energyAfter}`);
    check("Une seule victoire par jour contre le même empereur", await rejects(startBattle(uid, emperorKey("shanks", "normal"), false), /aujourd'hui/));
    check("Rejouable le lendemain (enregistrement du jour supprimé)", await (async () => {
      await prisma.adventureRecord.deleteMany({ where: { userId: uid, key: { startsWith: "emperor-clear:shanks:" } } });
      const again = await startBattle(uid, emperorKey("shanks", "normal"), false);
      return again.winner === "A" && (await stock())["cheveux-roux-de-shanks"] === 2;
    })());
    // Difficile débloquée par la victoire au Normal ; les autres empereurs
    const hard = await startBattle(uid, emperorKey("kaido", "difficile"), false);
    st = await stock();
    check("Difficile : 1 ou 2 ressources", hard.winner === "A" && (st["ecaille-de-kaido"] === 1 || st["ecaille-de-kaido"] === 2), `${st["ecaille-de-kaido"]}`);
    check("Hardcore sans les quatre clés refusé", await rejects(startBattle(uid, `emperor:${HARDCORE_KEY}:normal`, false), /clé/));
    for (const e of EMPERORS) if (!ALL_KEYS.every((k) => (st[k] ?? 0) >= 1)) { if ((await stock())[e.keyResource] === undefined || (await stock())[e.keyResource] < 1) { const r = await startBattle(uid, emperorKey(e.key, "normal"), false); check(`Passage : ${e.name}`, r.winner === "A"); } }
    st = await stock();
    check("Les quatre clés sont réunies", ALL_KEYS.every((k) => st[k] >= 1), JSON.stringify(ALL_KEYS.map((k) => st[k])));
    const legendaryBefore = ALL_LEGENDARY_RESOURCES.reduce((n, k) => n + (st[k] ?? 0), 0);
    const hc = await startBattle(uid, `emperor:${HARDCORE_KEY}:normal`, false);
    const after = await stock();
    check("Hardcore : combat 4 contre 4 sans vague", hc.log.filter((e) => e.kind === "wave").length === 0 && hc.log[0].kind === "start");
    if (hc.winner === "A") {
      check("Hardcore gagné : une clé de chaque consommée", ALL_KEYS.every((k) => after[k] === st[k] - 1));
      check("Hardcore gagné : deux ressources légendaires", ALL_LEGENDARY_RESOURCES.reduce((n, k) => n + (after[k] ?? 0), 0) - legendaryBefore === 2);
      check("Hardcore : une seule fois par jour", await rejects(startBattle(uid, `emperor:${HARDCORE_KEY}:normal`, false), /aujourd'hui|clé/));
    } else check("Hardcore perdu : clés conservées", ALL_KEYS.every((k) => after[k] === st[k]), "l'équipe de test n'a pas battu le Hardcore (voir l'équilibrage)");
    const replay = await getBattle(uid, first.id);
    check("Le combat est relisible", replay.status === "DONE" && replay.log.some((e) => e.kind === "wave"));
  } finally { await prisma.user.deleteMany({ where: { id: uid } }); }
  console.log(failures ? `\n${failures} vérification(s) en échec.` : "\nDéfi des empereurs conforme.");
  process.exitCode = failures ? 1 : 0;
}
main().finally(() => prisma.$disconnect());
