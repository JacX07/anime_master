"use client";

import { useEffect, useState } from "react";

/** Barre fixée en bas de l'écran : ton rang, tant que ta ligne n'est pas visible. */
export function MyRankDock({ rank, value, unit, missing }: { rank: number; value: string; unit: string; missing: number | null }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const row = document.getElementById("my-rank-row");
    if (!row) return;
    const io = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), { threshold: 0.6 });
    io.observe(row);
    return () => io.disconnect();
  }, []);
  const show = visible;
  return (
    <aside className="lb-dock" data-show={show || undefined} aria-label="Ton rang" aria-hidden={!show}>
      <span className="lb-dock-rank">#{rank}</span>
      <span><b>Ton rang</b>{missing !== null && missing > 0 && <small>Il te manque {new Intl.NumberFormat("fr-FR").format(missing)} {unit} pour entrer dans le top 100</small>}</span>
      <span className="lb-dock-value">{value}</span>
      <a href="#my-rank-row" onClick={(e) => { const el = document.getElementById("my-rank-row"); if (el) { e.preventDefault(); el.scrollIntoView({ block: "center", behavior: "smooth" }); } }}>Voir ma place</a>
    </aside>
  );
}
