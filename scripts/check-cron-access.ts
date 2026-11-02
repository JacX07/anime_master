// Test isolé : aucune connexion ni clôture réelle d'enchère.
import assert from "node:assert/strict";

async function main() {
  let calls = 0;
  const dependency = require.resolve("../src/lib/auctions");
  require.cache[dependency] = { id: dependency, filename: dependency, loaded: true,
    exports: { closeDueAuctions: async () => { calls++; return 0; } },
  } as NodeModule;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- cache simulé avant chargement du handler
  const { POST } = require("../src/app/api/auctions/close/route") as typeof import("../src/app/api/auctions/close/route");
  const previous = process.env.CRON_SECRET;
  try {
    delete process.env.CRON_SECRET;
    assert.equal((await POST(new Request("http://localhost/api/auctions/close", { method: "POST" }))).status, 403);
    process.env.CRON_SECRET = "disposable-test-only";
    for (const authorization of ["", "Bearer incorrect"]) {
      assert.equal((await POST(new Request("http://localhost/api/auctions/close", { method: "POST", headers: { authorization } }))).status, 403);
    }
    assert.equal(calls, 0);
    assert.equal((await POST(new Request("http://localhost/api/auctions/close", { method: "POST", headers: { authorization: "Bearer disposable-test-only" } }))).status, 200);
    assert.equal(calls, 1);
    console.log("Cron : secret absent/invalide refusé, secret valide accepté ; aucune base contactée.");
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
    delete require.cache[dependency];
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
