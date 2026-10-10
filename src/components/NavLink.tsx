"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon } from "./icons";

/** Entrée de la barre du haut : icône + nom, soulignée quand on est sur la page. */
export function NavLink({ href, icon, children }: { href: string; icon: string; children: ReactNode }) {
  const current = usePathname().startsWith(href);
  return (
    <Link href={href} className="site-link" aria-current={current ? "page" : undefined}>
      <Icon name={icon} />
      {children}
    </Link>
  );
}
