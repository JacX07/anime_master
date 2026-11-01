"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Entrée de la barre du haut (style maquette) : soulignée en or sur la page courante. */
export function NavItem({ href, match, exact, children }: { href: string; match?: string[]; exact?: boolean; children: ReactNode }) {
  const path = usePathname();
  const on = exact ? path === href : [href, ...(match ?? [])].some((m) => path === m || path.startsWith(`${m}/`));
  return (
    <Link href={href} className={on ? "mq-active" : ""} aria-current={on ? "page" : undefined}>
      {children}
    </Link>
  );
}
