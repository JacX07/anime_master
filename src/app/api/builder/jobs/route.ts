import { builderAllowed } from "@/lib/builder";
import { prisma } from "@/lib/db";

/** Demandes de mécaniques récentes, pour le suivi en direct du builder. */
export async function GET() {
  if (!(await builderAllowed())) return new Response("Not found", { status: 404 });
  const jobs = await prisma.mechanicJob.findMany({
    where: { status: { not: "discarded" } },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, characterId: true, wish: true, status: true, branch: true, attempts: true, report: true, log: true },
  });
  return Response.json({ jobs }, { headers: { "Cache-Control": "no-store" } });
}
