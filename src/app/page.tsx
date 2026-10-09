import Link from "next/link";
import { MAX_PACKS, PACK_INTERVAL_MS, WELCOME_PACKS } from "@/lib/pack-stock";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-4 py-24 text-center">
      <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
        Collectionne les héros de <span className="text-violet-400">tes animes</span>
      </h1>
      <p className="max-w-xl text-lg text-muted">
        Ouvre des paquets, découvre près de 5 000 personnages, des cartes Normal aux Ultra Rare, et
        traque les finitions Holo et Gold.
      </p>
      <ul className="grid gap-3 text-sm text-muted sm:grid-cols-3">
        <li className="rounded-xl bg-panel p-4">🎁 {WELCOME_PACKS} paquets offerts à l&apos;inscription</li>
        <li className="rounded-xl bg-panel p-4">
          ⏱️ 1 paquet toutes les {PACK_INTERVAL_MS / 60_000} min (jusqu&apos;à {MAX_PACKS})
        </li>
        <li className="rounded-xl bg-panel p-4">⭐ SSR garanti en 15 paquets, UR en 100</li>
      </ul>
      <div className="flex gap-3">
        <Link href="/signup" className="rounded-lg bg-violet-500 px-5 py-2.5 font-semibold text-white hover:bg-violet-400">
          Commencer
        </Link>
        <Link href="/packs" className="rounded-lg border border-white/15 px-5 py-2.5 font-semibold hover:bg-white/5">
          Mes paquets
        </Link>
      </div>
    </main>
  );
}
