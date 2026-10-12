import type { Metadata } from "next";
import Link from "next/link";
import { SceneBody } from "@/components/SceneBody";

export const metadata: Metadata = { title: "La Tour — Anime Masters" };

/** Page d'attente : la Tour (univers 0, SPEC étape 7) arrive en v2. Rien n'est jouable ici. */
export default function TourPage() {
  return (
    <main className="vt">
      <SceneBody night scroll />
      <div className="vt-inner">
        <header>
          <Link href="/expeditions" className="vt-muted">
            ← Expéditions
          </Link>
          <h1 className="vt-title">La Tour</h1>
          <p className="vt-sub">Univers 0 · 500 étages · accès scellé</p>
        </header>
        <section className="tour-seal" aria-label="Accès scellé">
          <div className="tour-door" aria-hidden="true" />
          <div>
            <p>
              La Tour est le méta-univers qui relie tous les autres : chaque étage est un univers, et les brèches y mènent. Un signal puissant y a été détecté, chargé de signatures qui n&apos;appartiennent pas à cet univers.
            </p>
            <p>
              Hakase et Akari ne peuvent pas encore stabiliser l&apos;accès. Le dernier étage, le 500<sup>e</sup>, reste enseveli derrière les autres.
            </p>
            <p className="vt-muted">Ouverture prévue dans une prochaine version.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
