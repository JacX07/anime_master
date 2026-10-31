import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { COMMON_RESOURCE, RESOURCE_NAMES, UNIVERSES } from "@/lib/story";
import "./inventaire.css";

export const metadata: Metadata = { title: "Inventaire — Anime Masters" };

export default function InventoryPage() {
  return (
    <main className="vt">
      <div className="vt-inner">
        <header className="pg-head">
          <h1 className="vt-title">Inventaire</h1>
          <p className="vt-sub">
            Les objets que tu as gagnés en combattant. Les ressources d&apos;éveil servent à éveiller tes cartes ; chaque univers de l&apos;histoire en donne deux, plus le fragment de signature commun.
          </p>
        </header>
        <Suspense fallback={<p className="vt-muted">Chargement…</p>}>
          <Items />
        </Suspense>
      </div>
    </main>
  );
}

const num = new Intl.NumberFormat("fr-FR");

async function Items() {
  const user = await requireUser();
  const rows = await prisma.resourceStock.findMany({ where: { userId: user.id } });
  const qty = (key: string) => rows.find((r) => r.key === key)?.quantity ?? 0;
  const known = new Set([COMMON_RESOURCE, ...UNIVERSES.flatMap((u) => [u.resource, u.weaponResource])]);
  // Au cas où une ressource d'un futur univers serait déjà en stock
  const others = rows.filter((r) => !known.has(r.key) && r.quantity > 0);

  return (
    <div className="inv">
      <section className="inv-group" aria-label="Commun">
        <h2 className="inv-h">Commun</h2>
        <ul className="inv-list">
          <Item name={RESOURCE_NAMES[COMMON_RESOURCE] ?? COMMON_RESOURCE} n={qty(COMMON_RESOURCE)} hint="Une signature complète est nécessaire au retour d'un personnage." />
        </ul>
      </section>
      {UNIVERSES.map((u) => (
        <section key={u.key} className="inv-group" aria-label={u.name}>
          <h2 className="inv-h">{u.name}</h2>
          <ul className="inv-list">
            <Item name={RESOURCE_NAMES[u.resource] ?? u.resource} n={qty(u.resource)} hint="Éveil des cartes de cet univers." />
            <Item name={RESOURCE_NAMES[u.weaponResource] ?? u.weaponResource} n={qty(u.weaponResource)} hint="Arme légendaire." />
          </ul>
        </section>
      ))}
      {others.length > 0 && (
        <section className="inv-group" aria-label="Autres">
          <h2 className="inv-h">Autres</h2>
          <ul className="inv-list">
            {others.map((r) => (
              <Item key={r.key} name={RESOURCE_NAMES[r.key] ?? r.key} n={r.quantity} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Item({ name, n, hint }: { name: string; n: number; hint?: string }) {
  return (
    <li className="inv-item" data-empty={n === 0 || undefined}>
      <b>{name}</b>
      <span className="inv-n">{num.format(n)}</span>
      {hint && <small>{hint}</small>}
    </li>
  );
}
