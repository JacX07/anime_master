"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

export const ALBUM_BUMP = "am:album-bump";
export const ALBUM_STORED = "am:album-stored";

/** Lien « Album » du menu : pulse quand la scène d'ouverture y range une carte, et compte les cartes rangées. */
export function AlbumLink() {
  const ref = useRef<HTMLAnchorElement>(null);
  const pathname = usePathname();
  const [stored, setStored] = useState(0);

  useEffect(() => {
    const bump = () => {
      const el = ref.current;
      if (!el) return;
      el.classList.remove("album-bump");
      void el.offsetWidth;
      el.classList.add("album-bump");
    };
    const onStored = () => {
      setStored((n) => n + 1);
      bump();
    };
    window.addEventListener(ALBUM_BUMP, bump);
    window.addEventListener(ALBUM_STORED, onStored);
    return () => {
      window.removeEventListener(ALBUM_BUMP, bump);
      window.removeEventListener(ALBUM_STORED, onStored);
    };
  }, []);

  // Le compteur repart de zéro quand on ouvre l'album
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    if (pathname === "/album") setStored(0);
  }

  return (
    <Link ref={ref} href="/album" className="site-link" aria-current={pathname.startsWith("/album") ? "page" : undefined}>
      <Icon name="nav-album" />
      Album
      {stored > 0 && <span className="album-badge">+{stored}</span>}
    </Link>
  );
}
