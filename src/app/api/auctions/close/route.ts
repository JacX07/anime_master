import { closeDueAuctions } from "@/lib/auctions";

// Tâche planifiée (toutes les minutes en production) : clôture les enchères échues.
// CRON_SECRET est obligatoire. La clôture est idempotente.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Forbidden", { status: 403 });
  return Response.json({ closed: await closeDueAuctions() });
}
