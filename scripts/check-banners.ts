// Vérification des bannières et des cristaux spéciaux sur la vraie base (SPEC étape 4 bis §5, §6, §8), avec des joueurs jetables.
// Usage : npm run check:banners   (Node 24)

import { prisma } from "../src/lib/db";
import { checkAchievements } from "../src/lib/achievements";
import { ACHIEVEMENTS } from "../src/lib/achievements";
import { BANNER_WEIGHT, CATEGORIES, ensureBanners, listBanners, weeklyCategories } from "../src/lib/banners";
import { BannerError, NoPackAvailableError, openPack } from "../src/lib/packs";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}
const rejects = async (fn: () => Promise<unknown>, kind: new (...a: never[]) => Error) => fn().then(() => false, (e) => e instanceof kind);

async function main() {
  const stamp = Date.now();
  const ids = [`ban-a-${stamp}`, `ban-b-${stamp}`, `ban-c-${stamp}`];
  const pulls = new Map<number, number>();
  const note = (cards: { characterId: number; serial: number }[]) => {
    for (const c of cards) if (!pulls.has(c.characterId)) pulls.set(c.characterId, c.serial - 1);
  };
  const make = (id: string, data: object = {}) => prisma.user.create({ data: { id, name: id, username: id, email: `${id}@test.local`, ...data } });
  try {
    const now = new Date();
    await ensureBanners(now);
    await ensureBanners(now); // idempotent
    const all = await prisma.banner.findMany({ include: { _count: { select: { characters: true } } } });
    const welcome = all.filter((b) => b.costKind === "WELCOME");
    check("5 bannières de bienvenue permanentes, avec des personnages", welcome.length === 5 && welcome.every((b) => b._count.characters > 20 && !b.startsAt), welcome.map((b) => `${b.category}:${b._count.characters}`).join(" "));
    const week = weeklyCategories(now);
    const weekly = all.filter((b) => b.costKind === "NORMAL" && b.startsAt && b.startsAt <= now && b.endsAt! > now);
    const special = all.filter((b) => b.costKind === "SPECIAL" && b.startsAt && b.startsAt <= now && b.endsAt! > now);
    check("Cette semaine : 2 bannières de catégorie et 1 spéciale, sans doublon", weekly.length === 2 && special.length === 1 && weekly.every((b) => week.featured.includes(b.category as never)), `${weekly.map((b) => b.category)} + ${special.map((b) => b.category)}`);
    const specialChars = await prisma.character.findMany({ where: { banners: { some: { bannerId: special[0].id } } }, select: { rarity: true } });
    check("Bannière spéciale : seulement des SSR et UR", specialChars.length > 0 && specialChars.every((c) => c.rarity === "SSR" || c.rarity === "UR"), `${specialChars.length} personnages`);

    // --- Cadeau de bienvenue ---
    await make(ids[0]);
    const fresh = await prisma.user.findUniqueOrThrow({ where: { id: ids[0] }, select: { crystals: true, welcomeDraws: true, welcomeBannerId: true } });
    check("Nouveau joueur : 30 cristaux + 20 tirages de bienvenue = 50 cartes", fresh.crystals === 30 && fresh.welcomeDraws === 20 && fresh.welcomeBannerId === null);
    const listed = await listBanners(fresh);
    check("Avant le choix : les 5 bannières de bienvenue sont proposées", listed.filter((b) => b.costKind === "WELCOME").length === 5);

    const shonen = welcome.find((b) => b.category === "shonen")!;
    const isekai = welcome.find((b) => b.category === "isekai")!;
    const w1 = await openPack(ids[0], 10, undefined, shonen.id);
    note(w1.cards);
    check("×10 de bienvenue : 10 tirages dépensés, cristaux intacts", w1.state.welcomeDraws === 10 && w1.state.available === 30 && w1.state.welcomeBannerId === shonen.id, JSON.stringify([w1.state.welcomeDraws, w1.state.available]));
    check("Après le choix, une seule bannière de bienvenue reste proposée", (await listBanners({ welcomeDraws: 10, welcomeBannerId: shonen.id })).filter((b) => b.costKind === "WELCOME").length === 1);
    check("Une autre bannière de bienvenue est refusée", await rejects(() => openPack(ids[0], 5, undefined, isekai.id), BannerError));
    const w2 = await openPack(ids[0], 10, undefined, shonen.id);
    note(w2.cards);
    check("Le deuxième ×10 vide les tirages", w2.state.welcomeDraws === 0);
    check("Plus de tirage de bienvenue : refusé", await rejects(() => openPack(ids[0], 5, undefined, shonen.id), BannerError));
    check("Le cadeau a donné 50 cartes au plus (20 de bannière + 30 cristaux)", (await prisma.card.count({ where: { ownerId: ids[0] } })) === 20);

    // --- Bannière de catégorie : mêmes taux de rareté, pity commun, 50 % de la bannière ---
    const cat = weekly[0];
    const pool = new Set((await prisma.bannerCharacter.findMany({ where: { bannerId: cat.id }, select: { characterId: true } })).map((r) => r.characterId));
    await make(ids[1], { crystals: 50 });
    let inPool = 0, total = 0;
    const rarities: Record<string, number> = {};
    let pityOk = true;
    for (let i = 0; i < 60; i++) {
      await prisma.user.update({ where: { id: ids[1] }, data: { crystals: 50, crystalsUpdatedAt: new Date() } });
      const before = await prisma.user.findUniqueOrThrow({ where: { id: ids[1] }, select: { cardsSinceSSR: true } });
      const r = await openPack(ids[1], 10, undefined, cat.id);
      note(r.cards);
      for (const c of r.cards) {
        total++;
        if (pool.has(c.characterId)) inPool++;
        rarities[c.rarity] = (rarities[c.rarity] ?? 0) + 1;
      }
      if (r.state.available !== 40) pityOk = false;
      if (r.state.cardsSinceSSR > before.cardsSinceSSR + 10) pityOk = false;
    }
    const share = inPool / total;
    const poolFraction = pool.size / (await prisma.character.count({ where: { disabled: false } }));
    const expected = BANNER_WEIGHT + (1 - BANNER_WEIGHT) * poolFraction;
    check("Bannière de catégorie : environ 50 % + part naturelle des cartes viennent de la bannière", Math.abs(share - expected) < 0.06, `${(share * 100).toFixed(1)} % (attendu ≈ ${(expected * 100).toFixed(1)} %)`);
    const nShare = (rarities.N ?? 0) / total;
    check("Les taux de rareté ne changent pas (N ≈ 65 % hors garanties)", nShare > 0.55 && nShare < 0.7, `N ${(nShare * 100).toFixed(1)} %`);
    check("Coût en cristaux normaux inchangé (10 par ×10) et pity avancé comme d'habitude", pityOk);
    const opening = await prisma.packOpening.findFirst({ where: { userId: ids[1] } });
    check("Le lot enregistre sa bannière", opening?.bannerId === cat.id);

    // --- Bannière spéciale : cristaux spéciaux, journal ---
    await make(ids[2], { crystals: 50, specialCrystals: 7 });
    const sp = special[0];
    check("Pas assez de cristaux spéciaux (7 < 10) : refusé, rien consommé", (await rejects(() => openPack(ids[2], 10, undefined, sp.id), BannerError)) && (await prisma.user.findUniqueOrThrow({ where: { id: ids[2] } })).specialCrystals === 7);
    await prisma.user.update({ where: { id: ids[2] }, data: { specialCrystals: 12 } });
    const s1 = await openPack(ids[2], 10, undefined, sp.id);
    note(s1.cards);
    const u2 = await prisma.user.findUniqueOrThrow({ where: { id: ids[2] } });
    check("×10 spécial : 10 cristaux spéciaux dépensés, cristaux normaux intacts", s1.state.specialCrystals === 2 && u2.specialCrystals === 2 && s1.state.available === 50);
    const ledger = await prisma.specialCrystalLedger.findMany({ where: { userId: ids[2] } });
    check("Journal spécial : −10 (BANNER_SPEND) lié au lot", ledger.length === 1 && ledger[0].amount === -10 && ledger[0].reason === "BANNER_SPEND");
    check("Bannière inconnue refusée", await rejects(() => openPack(ids[2], 5, undefined, "inexistante"), BannerError));
    check("Bannière spéciale : refus sans lot partiel", (await prisma.packOpening.count({ where: { userId: ids[2] } })) === 1);
    check("Aucun cristal normal : le ×5 standard est refusé", await (async () => {
      await prisma.user.update({ where: { id: ids[2] }, data: { crystals: 2, crystalsUpdatedAt: new Date() } });
      return rejects(() => openPack(ids[2], 5), NoPackAvailableError);
    })());

    // --- Succès : cristaux spéciaux crédités et journalisés ---
    const total100 = ACHIEVEMENTS.reduce((n, a) => n + (a.special ?? 0), 0);
    check("Les succès rapportent 100 cristaux spéciaux au total", total100 === 100, `${total100}`);
    const ssr = await prisma.character.findFirstOrThrow({ where: { rarity: "SSR", disabled: false }, select: { id: true, pullCount: true } });
    const lot = await prisma.packOpening.findFirstOrThrow({ where: { userId: ids[2] }, select: { id: true } });
    await prisma.card.create({ data: { ownerId: ids[2], characterId: ssr.id, finish: "NORMAL", serial: 900000 + (stamp % 1000), rarityAtPull: "SSR", packOpeningId: lot.id } });
    const before = (await prisma.user.findUniqueOrThrow({ where: { id: ids[2] } })).specialCrystals;
    await checkAchievements(ids[2]);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: ids[2] } });
    const sum = (await prisma.specialCrystalLedger.aggregate({ where: { userId: ids[2] }, _sum: { amount: true } }))._sum.amount ?? 0;
    check("Succès SSR : cristaux spéciaux crédités (≥ 5) et journalisés à l'identique", after.specialCrystals - before >= 5 && after.specialCrystals - before === sum + 10, `${before} → ${after.specialCrystals}, journal ${sum}`);
  } finally {
    for (const [characterId, count] of pulls) await prisma.character.update({ where: { id: characterId }, data: { pullCount: count } });
    await prisma.card.deleteMany({ where: { ownerId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
  console.log(failures === 0 ? "\nBannières conformes." : `\n${failures} vérification(s) en échec.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().finally(() => prisma.$disconnect());
