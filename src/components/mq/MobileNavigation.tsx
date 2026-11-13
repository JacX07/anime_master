"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { MOBILE_DESTINATIONS, mobileSection, type MobileSection } from "@/lib/mobile-navigation";

const COLLECTION = [["/album", "Cartes"], ["/equipe", "Squads"], ["/inventaire", "Inventaire"]] as const;
const AUTH = ["/login", "/signup", "/forgot-password", "/reset-password"];

/** Uses real routes; returning to a section restores its last URL, including album filters. */
export function MobileNavigation() {
  const pathname = usePathname();
  const section = mobileSection(pathname);
  const [locations, setLocations] = useState<Partial<Record<MobileSection, { href: string; scroll: number }>>>({});
  const pendingScroll = useRef<{ href: string; scroll: number } | null>(null);
  useEffect(() => {
    const saved = pendingScroll.current;
    if (!saved || `${window.location.pathname}${window.location.search}` !== saved.href) return;
    pendingScroll.current = null;
    // A streamed route can still show its fallback when the URL changes.
    const page = document.querySelector(".mq-page");
    const stop = () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      clearTimeout(deadline);
      for (const event of ["pointerdown", "wheel", "touchstart", "keydown"]) window.removeEventListener(event, stop);
    };
    const restore = () => {
      window.scrollTo({ top: saved.scroll, behavior: "instant" });
      if (Math.abs(window.scrollY - saved.scroll) < 2) stop();
    };
    const observer = new ResizeObserver(restore);
    if (page) observer.observe(page);
    const frame = requestAnimationFrame(restore);
    const deadline = setTimeout(stop, 15000);
    for (const event of ["pointerdown", "wheel", "touchstart", "keydown"]) window.addEventListener(event, stop, { passive: true });
    return stop;
  }, [pathname, locations]);
  if (AUTH.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return null;
  const remember = (destination: MobileSection, href: string) => {
    pendingScroll.current = destination === section ? null : { href, scroll: locations[destination]?.scroll ?? 0 };
    setLocations((previous) => ({ ...previous, [section]: { href: `${window.location.pathname}${window.location.search}`, scroll: window.scrollY } }));
  };
  return <>
    {section === "collection" && <nav className="mobile-collection-tabs" aria-label="Gestion de la collection">
      {COLLECTION.map(([href, label]) => {
        const current = href === "/inventaire" ? ["/inventaire", "/forge", "/eveil"].includes(pathname) : href === "/album" ? pathname === href || pathname.startsWith("/album/") || pathname.startsWith("/character/") : pathname === href;
        return <Link href={href} key={href} aria-current={current ? "page" : undefined}>{label}</Link>;
      })}
    </nav>}
    <nav className="mobile-bottom-nav" aria-label="Navigation mobile">
      {MOBILE_DESTINATIONS.map((item) => <Link key={item.id} href={item.id === section ? item.href : locations[item.id]?.href ?? item.href} prefetch={false}
        data-section={item.id} aria-current={section === item.id ? "page" : undefined} scroll={item.id === section} onNavigate={() => remember(item.id, item.id === section ? item.href : locations[item.id]?.href ?? item.href)}>
        <Icon name={item.icon} /><span>{item.label}</span>
      </Link>)}
    </nav>
  </>;
}
