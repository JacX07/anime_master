// Pentest borné : serveur et base jetables locaux uniquement. Aucun secret réel.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db";
import { sellCard, setLocked } from "../src/lib/wallet";
import { setForTrade } from "../src/lib/trades";
import { setTeam } from "../src/lib/battles";

async function main() {
  const db = new URL(process.env.DATABASE_URL!);
  assert.equal(db.hostname, "127.0.0.1"); assert.ok(db.pathname.startsWith("/am_pentest"));
  const base = "http://localhost:3000", tag = randomUUID().slice(0, 8);
  const request = (path: string, init: RequestInit = {}) => fetch(base + path, { ...init, redirect: "manual", signal: AbortSignal.timeout(15000) });
  const players: { id: string; cookie: string }[] = [];
  for (const suffix of ["a", "b"]) {
    const username = `audit${tag}${suffix}`;
    const response = await request("/api/auth/sign-up/email", { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify({ email: `${username}@example.invalid`, password: "Disposable-pentest-2026!", name: username, username }) });
    assert.equal(response.status, 200, "signup local");
    const payload = await response.json();
    assert.ok(await prisma.user.findUnique({ where: { id: payload.user.id } }), "Serveur relié à la même base jetable");
    const cookie = response.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    assert.ok(cookie); players.push({ id: payload.user.id, cookie });
  }
  const [a, b] = players;
  const headers = { Cookie: a.cookie };
  try {
    assert.equal((await request("/api/album/more")).status, 401);
    assert.equal((await request("/api/builder/jobs")).status, 404);
    assert.equal((await request("/api/auctions/close", { method: "POST" })).status, 403);
    const badOrigin = await request("/api/auth/sign-up/email", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://attacker.invalid" }, body: JSON.stringify({ email: `csrf${tag}@example.invalid`, password: "Disposable-pentest-2026!", name: "csrf", username: `csrf${tag}` }) });
    assert.equal(badOrigin.status, 403);
    assert.equal(await prisma.user.count({ where: { email: `csrf${tag}@example.invalid` } }), 0);
    for (const query of ["' OR 1=1 --", "'; DROP TABLE User; --", '<img src=x onerror=alert(1)>']) {
      const response = await request(`/api/album/more?q=${encodeURIComponent(query)}`, { headers });
      assert.equal(response.status, 200); assert.ok(!(await response.text()).includes("syntax error"));
    }
    const character = await prisma.character.findFirstOrThrow();
    const opening = await prisma.packOpening.create({ data: { userId: b.id, pityTriggered: "NONE" } });
    const cards: { id: string }[] = [];
    for (let i = 0; i < 4; i++) {
      const c = await prisma.character.update({ where: { id: character.id }, data: { pullCount: { increment: 1 } } });
      cards.push(await prisma.card.create({ data: { ownerId: b.id, characterId: c.id, serial: c.pullCount, finish: "NORMAL", rarityAtPull: c.rarity, packOpeningId: opening.id } }));
    }
    await assert.rejects(setLocked(a.id, cards[0].id, true));
    await assert.rejects(sellCard(a.id, cards[0].id));
    await assert.rejects(setForTrade(a.id, cards[0].id, true));
    await assert.rejects(setTeam(a.id, "ATTACK", cards.map((c) => c.id)));
    assert.equal((await prisma.card.findUniqueOrThrow({ where: { id: cards[0].id } })).ownerId, b.id);
    await setLocked(b.id, cards[0].id, true);
    assert.equal((await prisma.card.findUniqueOrThrow({ where: { id: cards[0].id } })).locked, true);
    await (await request(`/character/${character.id}`, { headers: { Cookie: b.cookie } })).text();
    const manifest = JSON.parse(readFileSync(".next/dev/server/server-reference-manifest.json", "utf8"));
    const action = Object.entries(manifest.node).find(([, v]) => (v as { exportedName: string }).exportedName === "toggleLockAction")?.[0];
    assert.ok(action, "Action compilée");
    const call = (cookie: string, origin: string) => request(`/character/${character.id}`, { method: "POST", headers: { Cookie: cookie, Origin: origin, "Next-Action": action, "Content-Type": "text/plain;charset=UTF-8", Accept: "text/x-component" }, body: JSON.stringify([cards[0].id, false]) });
    const foreign = await call(a.cookie, base); const foreignText = await foreign.text(); assert.ok(foreignText.includes('"ok":false'), "foreign action denied");
    const csrf = await call(b.cookie, "https://attacker.invalid"); assert.equal(csrf.status, 500);
    assert.equal((await prisma.card.findUniqueOrThrow({ where: { id: cards[0].id } })).locked, true);
    const own = await call(b.cookie, base); assert.ok((await own.text()).includes('"ok":true'));
    assert.equal((await prisma.card.findUniqueOrThrow({ where: { id: cards[0].id } })).locked, false);
    const key = `/api/illustrations/resource-audit-${tag}`;
    assert.equal((await request(key, { method: "DELETE", headers: { ...headers, Origin: "https://attacker.invalid" } })).status, 403);
    const form = new FormData();form.set("image", new Blob(['<svg onload="alert(1)"></svg>'], { type: "image/png" }), "fake.png");
    assert.equal((await request(key, { method: "POST", headers: { ...headers, Origin: base }, body: form })).status, 400);
    assert.equal((await request(key, { method: "POST", headers: { ...headers, Origin: base }, body: new Uint8Array(7 * 1024 * 1024) })).status, 413);
    assert.equal((await request("/api/illustrations/invalid..key")).status, 404);
    await request("/api/auth/sign-out", { method: "POST", headers: { ...headers, Origin: base, "Content-Type": "application/json" }, body: "{}" });
    assert.equal(await (await request("/api/auth/get-session", { headers })).json(), null);
    console.log("PASS : deux joueurs, auth/permissions, SQLi, CSRF HTTP/Server Action, IDOR DAL/Server Action, uploads et révocation session.");
  } finally { await prisma.user.deleteMany({ where: { id: { in: players.map((p) => p.id) } } }); await prisma.$disconnect(); }
}
main().catch((error) => { console.error(error instanceof assert.AssertionError ? error.message : `Audit local échoué : ${error.name}`); process.exitCode = 1; });
