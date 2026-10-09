import type { Metadata } from "next";
import { Suspense } from "react";
import { getPackState } from "@/lib/packs";
import { requireUser } from "@/lib/session";
import { PackOpener } from "./PackOpener";

export const metadata: Metadata = { title: "Paquets — Anime Masters" };

export default function PacksPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Paquets</h1>
      <Suspense fallback={<p className="text-muted">Chargement…</p>}>
        <Packs />
      </Suspense>
    </main>
  );
}

async function Packs() {
  const user = await requireUser();
  const state = await getPackState(user.id);
  return <PackOpener initialState={state} />;
}
