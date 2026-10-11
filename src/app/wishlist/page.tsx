import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RarityGem } from "@/components/icons";
import { SceneBody } from "@/components/SceneBody";
import { FINISH_NAMES } from "@/lib/labels";
import { requireUser } from "@/lib/session";
import { listWishes } from "@/lib/wishlist";
import { RemoveWish } from "./RemoveWish";

export const metadata: Metadata = { title: "Souhaits — Anime Masters" };

export default function WishlistPage() {
  return (
    <main className="vt">
      <SceneBody night scroll />
      <Suspense fallback={<p className="vt-inner vt-muted">Chargement…</p>}>
        <Wishlist />
      </Suspense>
    </main>
  );
}

async function Wishlist() {
  const user = await requireUser();
  const wishes = await listWishes(user.id);
  return (
    <div className="vt-inner">
      <header>
        <h1 className="vt-title">Souhaits</h1>
        <p className="vt-sub">Tu es prévenu quand un de ces personnages est mis aux enchères ou proposé à l&apos;échange. Ajoute-les depuis leur fiche.</p>
      </header>
      {wishes.length === 0 ? (
        <p className="vt-empty">Ta liste est vide.</p>
      ) : (
        <ul className="notif-list">
          {wishes.map((w) => (
            <li key={w.id}>
              <span className="flex items-center gap-2">
                <RarityGem rarity={w.character.rarity} />
                <Link href={`/character/${w.character.id}`}>{w.character.name}</Link>
                <span className="vt-muted">{w.finish ? FINISH_NAMES[w.finish] : "toute finition"}</span>
                {w.owned && <span className="trade-tag">Déjà possédé</span>}
              </span>
              <RemoveWish id={w.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
