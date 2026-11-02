import { prisma } from "../src/lib/db";
import { computePower } from "../src/lib/stats";
import { speedOf } from "../src/lib/speed";

async function main() {
  const characters = await prisma.character.findMany({ select: { id: true, attack: true, defense: true } });
  await prisma.$transaction(characters.map((c) => prisma.character.update({
    where: { id: c.id }, data: { power: computePower({ ...c, speed: speedOf(c.id) }) },
  })));
  console.log(`Puissance recalculée : ${characters.length} personnages.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
