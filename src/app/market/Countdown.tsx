"use client";

import { useEffect, useState } from "react";

function format(ms: number) {
  if (ms <= 0) return "Terminée";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d} j ${h} h`;
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min`;
  return `${m} min ${String(s % 60).padStart(2, "0")} s`;
}

/** Compte à rebours : affiché seulement une fois monté pour éviter un écart entre serveur et navigateur. */
export function Countdown({ endsAt }: { endsAt: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  const end = new Date(endsAt).getTime();
  return (
    <time className="auction-time" dateTime={endsAt} data-urgent={now !== null && end - now < 120_000}>
      {now === null ? "…" : format(end - now)}
    </time>
  );
}
