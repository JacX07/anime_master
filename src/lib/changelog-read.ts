import { prisma } from "./db";

/** L'ordre vient du changelog serveur ; un ancien onglet ne peut pas faire reculer la lecture. */
export async function acknowledgeRelease(userId: string, versions: readonly string[]) {
  if (!versions.length) return;
  await prisma.user.updateMany({
    where: { id: userId, OR: [{ lastReadChangelogVersion: null }, { lastReadChangelogVersion: { in: [...versions.slice(1)] } }] },
    data: { lastReadChangelogVersion: versions[0] },
  });
}
