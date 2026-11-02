// Rattrapage des succès pour les comptes existants après ajout de paliers ou recalcul de puissance.
import { prisma } from "../src/lib/db";
import { checkAchievements } from "../src/lib/achievements";

async function main() {
  const users = await prisma.user.findMany({ select: { id: true } });
  let unlocked = 0;
  for (const user of users) unlocked += (await checkAchievements(user.id)).filter((a) => a.powerRequired !== undefined).length;
  console.log(`Succès de puissance : ${unlocked} déblocages sur ${users.length} comptes.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
