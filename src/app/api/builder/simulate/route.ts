import { builderAllowed } from "@/lib/builder";
import { simulateSpell } from "@/lib/spell-sim";
import { parseSpell } from "@/lib/spell-schema";

export const maxDuration = 300;

/** Simule un sort du Spell Builder ; réponse en lignes JSON : { progress, total } puis { result } (ou { error }). */
export async function POST(req: Request) {
  if (!(await builderAllowed())) return new Response("Not found", { status: 404 });
  const body = (await req.json().catch(() => null)) as { characterId?: unknown; spell?: unknown; games?: unknown } | null;
  const spell = parseSpell(body?.spell);
  const id = Number(body?.characterId);
  const games = Math.min(8000, Math.max(100, Math.round(Number(body?.games) || 4000)));
  if (!spell || !Number.isInteger(id)) return Response.json({ error: "Sort invalide" }, { status: 400 });

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (o: unknown) => ctrl.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      try {
        send({ result: await simulateSpell(id, spell, games, (progress, total) => send({ progress, total })) });
      } catch (e) {
        send({ error: e instanceof Error ? e.message : String(e) });
      }
      ctrl.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}
