// Fusionne les lots validés (output-1..8.json) en src/lib/skill-data.json. Usage : npx tsx scripts/spell-design/merge.ts
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { validate } from "./validate";

const rows: { id: number; orientation: string; secondary: unknown; tertiary: unknown; ultimate: unknown }[] = [];
const ids: number[] = [];
for (let i = 1; i <= 8; i++) {
  const f = `scripts/spell-design/output-${i}.json`;
  rows.push(...JSON.parse(readFileSync(f, "utf8")));
  ids.push(...(JSON.parse(readFileSync(`scripts/spell-design/input-${i}.json`, "utf8")) as { id: number }[]).map((row) => row.id));
}
const res = validate(rows as never, ids);
if (res.errors.length || rows.length !== ids.length || rows.length !== 236) {
  throw new Error(`Fusion refusée (${rows.length}/236 fiches) : ${res.errors.join("\n")}`);
}
const out: Record<string, unknown> = {};
for (const r of rows) out[r.id] = { orientation: r.orientation, secondary: r.secondary, tertiary: r.tertiary, ultimate: r.ultimate };
writeFileSync("src/lib/skill-data.json.tmp", `${JSON.stringify(out, null, 2)}\n`);
renameSync("src/lib/skill-data.json.tmp", "src/lib/skill-data.json");
console.log(`${rows.length} personnages fusionnés ; orientations`, res.count, `; 3 sorts de dégâts : ${res.allDmg}`);
