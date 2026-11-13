import { prisma } from "@/lib/db";
import { getReleases } from "@/lib/releases";
import { needsReleaseNotice } from "@/lib/changelog";
import { UpdateNotice } from "./UpdateNotice";

export async function ReleaseAnnouncement({ userId }: { userId: string }) {
  const [releases, user] = await Promise.all([
    getReleases(),
    prisma.user.findUnique({ where: { id: userId }, select: { lastReadChangelogVersion: true, tutorialStep: true } }),
  ]);
  if (!user || !needsReleaseNotice(releases.map((r) => r.version), user.lastReadChangelogVersion)) return null;
  return <UpdateNotice key={`${userId}:${releases[0].version}`} release={releases[0]} tutorialActive={user.tutorialStep !== 0} />;
}
