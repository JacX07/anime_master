import { readFileSync } from "node:fs";
import { DUNGEONS } from "../src/lib/dungeons";
import { EMPERORS } from "../src/lib/emperors";
import { client, syncContent } from "./content-sync";

async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  if (!/^\/am_check_[a-f0-9]{32}$/.test(url.pathname) || url.pathname !== `/${process.env.CHECK_RUN_PREFIX}` || process.env.NODE_ENV !== "test") {
    throw new Error("Catalogue réservé à la base jetable de npm run check");
  }
  const db = client(url.toString());
  try {
    const catalogue = JSON.parse(readFileSync(new URL("./fixtures/catalogue.json", import.meta.url), "utf8"));
    const present = new Set(catalogue.Character.filter((c: { disabled: boolean }) => !c.disabled).map((c: { id: number }) => c.id));
    const required = new Set([...DUNGEONS.map((d) => d.bossId), ...EMPERORS.flatMap((e) => [e.characterId, ...e.crew.flat()])]);
    const missing = [...required].filter((id) => !present.has(id));
    if (missing.length) {
      console.error(`Catalogue de test incomplet : personnages ${missing.join(", ")}`);
      process.exitCode = 1;
      return;
    }
    const franchises = new Map(catalogue.Media.map((m: { id: number; franchiseId: number | null }) => [m.id, m.franchiseId]));
    for (const dungeon of DUNGEONS) {
      const count = catalogue.Character.filter((c: { disabled: boolean; mainMediaId: number | null }) => !c.disabled && franchises.get(c.mainMediaId) === dungeon.franchiseId).length;
      if (count < 4) {
        console.error(`Catalogue de test incomplet : ${dungeon.universe}, ${count}/4 personnages`);
        process.exitCode = 1;
        return;
      }
    }
    await syncContent(db, catalogue, true);
    console.log(`${catalogue.Character.length} personnages de test chargés.`);
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error("Chargement du catalogue de test impossible"); process.exitCode = 1; });
