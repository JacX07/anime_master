"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const TABS = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/boosters", label: "Boosters" },
  { href: "/admin/combats", label: "Combats" },
  { href: "/admin/economie", label: "Économie" },
  { href: "/admin/evenements", label: "Événements" },
  { href: "/admin/joueurs", label: "Joueurs" },
  { href: "/admin/audit", label: "Audit" },
];

function Tabs() {
  const path = usePathname();
  const p = useSearchParams().get("p");
  const suffix = p ? `?p=${encodeURIComponent(p)}` : "";
  return (
    <nav className="mq-section-tabs" aria-label="Administration">
      {TABS.map((t) => <Link key={t.href} href={t.href + suffix} aria-current={path === t.href || (t.href !== "/admin" && path.startsWith(`${t.href}/`)) ? "page" : undefined}>{t.label}</Link>)}
    </nav>
  );
}

/** Onglets d'administration ; garde la période choisie d'une page à l'autre. */
export function AdminNav() {
  return <Suspense fallback={null}><Tabs /></Suspense>;
}
