// Régénère le snapshot explicite des attaques SSR/UR à partir du roster et des sorts actuels.
import { writeFileSync } from "node:fs";
import { prisma } from "../src/lib/db";
import { createBasicAttack } from "../src/lib/basic-attacks";

async function main() {
  const rows = await prisma.character.findMany({
    where: { disabled: false, rarity: { in: ["SSR", "UR"] } },
    select: { id: true, name: true, rarity: true, type: true },
    orderBy: { id: "asc" },
  });
  const attacks = rows.map((row) => {
    const attack = createBasicAttack(row.id, row.rarity, row.type);
    if (!attack?.name || !attack.rider) throw new Error(`Attaque manquante : ${row.name} (${row.id})`);
    return [row.id, { character: row.name, attack }] as const;
  });
  if (attacks.length < 236) throw new Error(`Roster incomplet : 236 SSR/UR attendus, trouvé : ${attacks.length}`);
  const source = [
    "// Roster SSR/UR versionné : la fiche de chaque personnage contient son nom et son effet de base.",
    'import type { BasicAttack } from "./basic-attacks";',
    "",
    "export const BASIC_ATTACK_ROSTER: Record<number, { character: string; attack: BasicAttack }> = {",
    ...attacks.map(([id, value]) => `  ${id}: ${JSON.stringify(value)},`),
    "};",
    "",
  ].join("\n");
  writeFileSync("src/lib/basic-attack-roster.ts", source);
  console.log(`Snapshot généré : ${attacks.length} attaques SSR/UR.`);
}

main().finally(() => prisma.$disconnect());
