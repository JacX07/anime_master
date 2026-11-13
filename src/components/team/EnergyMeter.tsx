"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { ENERGY_INTERVAL_MS, MAX_ENERGY } from "@/lib/energy";

type Energy = { available: number; nextAt: string | null };
const mmss = (ms: number) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

function useEnergyMeter(energy: Energy) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!energy.nextAt) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [energy.nextAt]);
  let available = energy.available, left: number | null = null;
  if (energy.nextAt && now !== null) {
    const next = new Date(energy.nextAt).getTime();
    const gained = now >= next ? 1 + Math.floor((now - next) / ENERGY_INTERVAL_MS) : 0;
    available = Math.min(MAX_ENERGY, energy.available + gained);
    left = available >= MAX_ENERGY ? null : next + gained * ENERGY_INTERVAL_MS - now;
  }
  return { available, left };
}

/** Réserve lisible sans ouvrir le profil, également utilisée par la mini-barre PC. */
export function EnergyReserve({ energy }: { energy: Energy }) {
  const { available, left } = useEnergyMeter(energy);
  return <span className="mq-energy-reserve" aria-label={`Énergie : ${available} sur ${MAX_ENERGY}`} data-empty={available < 1 || undefined}>
    <Icon name="recharge" /><span>Énergie <b>{available} / {MAX_ENERGY}</b></span>
    <small>{left !== null ? `+1 dans ${mmss(left)}` : available >= MAX_ENERGY ? "Réserve pleine" : "Recharge…"}</small>
  </span>;
}

/** Énergie avant un combat : coût, réserve et compte à rebours, recalculés chaque seconde dans le navigateur. */
export function EnergyMeter({ energy }: { energy: Energy }) {
  const { available, left } = useEnergyMeter(energy);
  return <p className="hs-energy" data-empty={available < 1 || undefined}>
    <Icon name="recharge" /> Coût : 1 énergie · <b>{available}/{MAX_ENERGY}</b>{left !== null && <small> · +1 dans {mmss(left)}</small>}
    <small className="hs-energy-note">Rendue si tu perds.</small>
  </p>;
}
