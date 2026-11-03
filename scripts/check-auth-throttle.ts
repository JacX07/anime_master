import assert from "node:assert/strict";
import { betterAuth } from "better-auth";
import { authThrottle } from "../src/lib/auth-throttle";
import { prisma } from "../src/lib/db";

async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname.startsWith("/am_"), "Base locale jetable requise");
  const options = { baseURL: "http://localhost:3999", secret: "disposable-auth-throttle-test-secret", emailAndPassword: { enabled: true }, rateLimit: { enabled: false }, hooks: { before: authThrottle(prisma) }, logger: { disabled: true } } as const;
  const a = betterAuth(options), b = betterAuth(options);
  const attempt = async (auth: typeof a, email: string) => {
    try { await auth.api.signInEmail({ body: { email, password: "invalid-test-password" } }); return 200; }
    catch (error) { return (error as { statusCode: number }).statusCode; }
  };
  try {
    await prisma.authThrottle.deleteMany();
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => attempt(i % 2 ? a : b, "CONCURRENT@example.invalid")));
    assert.equal(results.filter((code) => code === 401).length, 10);
    assert.equal(results.filter((code) => code === 429).length, 10);
    assert.equal(await attempt(b, "concurrent@example.invalid"), 429, "casse");
    const http = await a.handler(new Request("http://localhost:3999/api/auth/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost:3999" }, body: JSON.stringify({ email: "concurrent@example.invalid", password: "invalid-test-password" }) }));
    assert.equal(http.status, 429, "HTTP");
    await prisma.authThrottle.updateMany({ data: { expiresAt: new Date(0) } });
    assert.equal(await attempt(b, "concurrent@example.invalid"), 401);
    await prisma.$executeRaw`INSERT INTO "AuthThrottle" ("key", "count", "expiresAt")
      VALUES ('global', 300, clock_timestamp() + interval '1 minute')
      ON CONFLICT ("key") DO UPDATE SET "count" = 300, "expiresAt" = clock_timestamp() + interval '1 minute'`;
    assert.equal(await attempt(a, "another@example.invalid"), 429, "global");
    const offline = betterAuth({ ...options, hooks: { before: authThrottle({
      $queryRaw: async () => { throw new Error("simulated unavailable database"); },
    } as unknown as typeof prisma) } });
    assert.equal(await attempt(offline, "offline@example.invalid"), 503);
    console.log("Limiteur : deux instances, 20 requêtes concurrentes, casse, HTTP/direct, expiration, plafond global et échec fermé conformes.");
  } finally { await prisma.authThrottle.deleteMany(); await prisma.$disconnect(); }
}
main().catch((error) => { console.error(error instanceof assert.AssertionError ? error.message : `Échec du contrôle du limiteur : ${error.name} (${error.code ?? "sans code"}).`); process.exitCode = 1; });
