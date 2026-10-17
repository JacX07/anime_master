"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { AnimeProgress } from "@/lib/album";

export interface AnimeOptions {
  listed: AnimeProgress[];
  blocks: AnimeProgress[];
  value: string;
}

/** Choix de l'anime : la liste montre la progression de chacun (✓ quand la collection est complète). */
export function AnimeSelect({ listed, blocks, value }: AnimeOptions) {
  const router = useRouter();
  const params = useSearchParams();
  const label = (a: AnimeProgress) => `${a.owned === a.total ? "✓ " : ""}${a.title} — ${a.owned}/${a.total}`;
  return (
    <label className="vt-select">
      <span>Anime</span>
      <select
        value={value}
        onChange={(e) => {
          const p = new URLSearchParams(params.toString());
          if (e.target.value) p.set("anime", e.target.value);
          else p.delete("anime");
          p.delete("page");
          const s = p.toString();
          router.push(s ? `/album?${s}` : "/album");
        }}
      >
        <option value="">Tous les anime</option>
        {listed.map((a) => (
          <option key={a.key} value={a.key}>
            {label(a)}
          </option>
        ))}
        <optgroup label="Petits anime (regroupés par 5)">
          {blocks.map((b) => (
            <option key={b.key} value={b.key}>
              {label(b)}
            </option>
          ))}
        </optgroup>
      </select>
    </label>
  );
}
