import { closeDueAuctions } from "@/lib/auctions";
import { purgeOldEvents } from "@/lib/events";

// Tâche planifiée (toutes les minutes en production) : clôture les enchères échues.
// CRON_SECRET est obligatoire. La clôture est idempotente.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Forbidden", { status: 403 });
  const closed = await closeDueAuctions();
  // Purge quotidienne des vieux événements de jeu (une seule exécution par jour, à 03:00 UTC)
  const now = new Date();
  const purged = now.getUTCHours() === 3 && now.getUTCMinutes() === 0 ? await purgeOldEvents(now) : 0;
  return Response.json({ closed, purged });
}
