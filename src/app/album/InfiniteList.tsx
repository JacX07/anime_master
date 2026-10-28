"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Liste qui charge la suite quand on approche du bas : `children` est la première page, `load(n)` rend la page n. */
export function InfiniteList({ as: Tag, className, pages, load, children }: { as: "div" | "ul"; className: string; pages: number; load: (page: number) => Promise<ReactNode[]>; children: ReactNode }) {
  const [more, setMore] = useState<ReactNode[]>([]);
  const [next, setNext] = useState(2);
  const [failed, setFailed] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const loading = useRef(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || next > pages || failed) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || loading.current) return;
        loading.current = true;
        load(next).then(
          (items) => {
            setMore((m) => [...m, ...items]);
            setNext(next + 1);
            loading.current = false;
          },
          () => {
            setFailed(true);
            loading.current = false;
          },
        );
      },
      { rootMargin: "900px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [next, pages, load, failed]);

  return (
    <>
      <Tag className={className}>
        {children}
        {more}
      </Tag>
      {next <= pages && (
        <div ref={sentinel} className="vt-more">
          {failed ? "Impossible de charger la suite. Recharge la page." : "Chargement…"}
        </div>
      )}
    </>
  );
}
