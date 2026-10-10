"use client";

import { useEffect, useRef, useState } from "react";
import { TYPE_LABELS } from "@/lib/labels";
import { MAX_PACKS, PACK_INTERVAL_MS } from "@/lib/pack-stock";
import type { PlayerPackState } from "@/lib/packs";
import { SSR_PITY, UR_PITY } from "@/lib/pull";
import { openPackAction } from "./actions";
import { PackOpener } from "./PackOpener";

// Scène 3D d'ouverture (public/pack-opening) : elle vit dans une iframe de même origine et ne fait confiance qu'à nous.
// Le tirage reste côté serveur : la scène demande l'ouverture par message, on appelle l'action et on lui renvoie les cartes.
const SCENE_URL = "/pack-opening/futur.html?embed=1";

type SceneMessage = { type: "ready" | "unsupported" | "album-bump" } | { type: "open-request"; id: number };

export function ImmersiveOpener({ initialState }: { initialState: PlayerPackState }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    const send = (msg: object) => frame.current?.contentWindow?.postMessage(msg, location.origin);
    // Position du lien « Album » dans le repère de l'iframe : les particules des cartes rangées filent vers lui
    const albumRect = () => {
      const link = document.querySelector<HTMLElement>('a[href="/album"]');
      const box = frame.current?.getBoundingClientRect();
      if (!link || !box) return null;
      const r = link.getBoundingClientRect();
      return { left: r.left - box.left, top: r.top - box.top, width: r.width, height: r.height };
    };

    async function onMessage(e: MessageEvent<SceneMessage>) {
      if (e.origin !== location.origin || e.source !== frame.current?.contentWindow) return;
      const msg = e.data;
      if (msg.type === "ready") {
        send({
          type: "init",
          config: { interval: PACK_INTERVAL_MS, max: MAX_PACKS, ssrPity: SSR_PITY, urPity: UR_PITY },
          state: initialState,
          albumRect: albumRect(),
        });
      } else if (msg.type === "unsupported") {
        setUnsupported(true);
      } else if (msg.type === "album-bump") {
        const link = document.querySelector<HTMLElement>('a[href="/album"]');
        link?.classList.remove("album-bump");
        void link?.offsetWidth;
        link?.classList.add("album-bump");
      } else if (msg.type === "open-request") {
        const result = await openPackAction();
        if (!result.ok) return send({ type: "pack-result", id: msg.id, ok: false, error: result.error });
        const { cards, state, pity } = result.pack;
        send({
          type: "pack-result",
          id: msg.id,
          ok: true,
          state,
          pity: pity === "NONE" ? null : pity,
          cards: cards.map((c) => ({
            name: c.name,
            series: c.series ?? "",
            img: c.imageUrl,
            rarity: c.rarity,
            type: `${TYPE_LABELS[c.type].emoji} ${TYPE_LABELS[c.type].name}`,
            atk: c.attack,
            def: c.defense,
            serial: c.serial,
            finish: c.finish,
            holo: c.finish !== "NORMAL",
            isNew: c.isNew,
          })),
        });
      }
    }

    const sendAlbumRect = () => send({ type: "album-rect", albumRect: albumRect() });
    window.addEventListener("message", onMessage);
    window.addEventListener("resize", sendAlbumRect);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("resize", sendAlbumRect);
    };
  }, [initialState]);

  // Sans WebGL (ou en cas d'échec de la scène), on retombe sur l'ouverture classique
  if (unsupported) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold">Paquets</h1>
        <PackOpener initialState={initialState} />
      </div>
    );
  }

  return (
    <iframe
      ref={frame}
      src={SCENE_URL}
      title="Ouverture de paquets"
      allow="autoplay"
      className="block w-full border-0 bg-[#e9eff6]"
      style={{ height: "calc(100dvh - 3.5rem)", minHeight: 560 }}
    />
  );
}
