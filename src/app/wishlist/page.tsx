import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
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
      <header className="pg-head">
        <h1 className="vt-title">Souhaits</h1>
        <p className="vt-sub">Tu es prévenu quand un de ces personnages est mis aux enchères ou proposé à l&apos;échange. Ajoute-les depuis leur fiche.</p>
      </header>
      {wishes.length === 0 ? (
        <p className="vt-empty">Ta liste est vide. Ajoute des personnages depuis leur fiche.</p>
      ) : (
        <>
          <p className="vt-count">
            {wishes.length} souhait{wishes.length > 1 ? "s" : ""} · {wishes.filter((w) => w.owned).length} déjà possédé{wishes.filter((w) => w.owned).length > 1 ? "s" : ""}
          </p>
          <ul className="wish-grid">
            {wishes.map((w) => (
              <li key={w.id} data-owned={w.owned || undefined}>
                <Link href={`/character/${w.character.id}`} className="tp-card" data-r={w.character.rarity} title={w.character.name}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={w.character.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
                  <i aria-hidden />
                  <span className="tp-nm">{w.character.name}</span>
                </Link>
                <span className="tp-cap">
                  {w.finish ? FINISH_NAMES[w.finish] : "Toute finition"}
                  {w.owned && <b> · possédé</b>}
                </span>
                <RemoveWish id={w.id} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
