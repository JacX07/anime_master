import type { Metadata } from "next";
import { Suspense } from "react";
import { getPackState } from "@/lib/packs";
import { requireUser } from "@/lib/session";
import { ImmersiveOpener } from "./ImmersiveOpener";

export const metadata: Metadata = { title: "Paquets — Anime Masters" };

export default function PacksPage() {
  return (
    <main className="flex-1">
      <Suspense fallback={<p className="px-4 py-10 text-muted">Chargement…</p>}>
        <Packs />
      </Suspense>
    </main>
  );
}

async function Packs() {
  const user = await requireUser();
  const state = await getPackState(user.id);
  return <ImmersiveOpener initialState={state} />;
}
