import { readFileSync } from "node:fs";
import { client, syncContent } from "./content-sync";

async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  if (!/^\/am_check_[a-f0-9]{32}$/.test(url.pathname) || url.pathname !== `/${process.env.CHECK_RUN_PREFIX}` || process.env.NODE_ENV !== "test") {
    throw new Error("Catalogue réservé à la base jetable de npm run check");
  }
  const db = client(url.toString());
  try {
    const catalogue = JSON.parse(readFileSync(new URL("./fixtures/catalogue.json", import.meta.url), "utf8"));
    await syncContent(db, catalogue, true);
    console.log(`${catalogue.Character.length} personnages de test chargés.`);
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error("Chargement du catalogue de test impossible"); process.exitCode = 1; });
