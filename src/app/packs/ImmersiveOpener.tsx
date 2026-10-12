"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TYPE_LABELS } from "@/lib/labels";
import { CRYSTAL_INTERVAL_MS, MAX_CRYSTALS } from "@/lib/crystal-stock";
import type { BannerInfo } from "@/lib/banners";
import type { PlayerPackState } from "@/lib/packs";
import { SSR_PITY, UR_PITY } from "@/lib/pull";
import { ALBUM_BUMP, ALBUM_STORED } from "@/components/AlbumLink";
import type { OpenedPack } from "@/lib/packs";
import { buyCrystalsAction, devGrantCrystalsAction, openPackAction } from "./actions";
import { BulkSummary } from "./BulkSummary";
import { PackOpener } from "./PackOpener";

const ORDER = ["UR", "SSR", "SR", "R", "N"] as const;

// Une carte tirée, au format que la scène sait dessiner
const toSceneCards = (cards: OpenedPack["cards"]) =>
  cards.map((c) => ({
    name: c.name,
    series: c.series ?? "",
    img: c.imageUrl,
    rarity: c.rarity,
    type: TYPE_LABELS[c.type].name,
    typeId: c.type,
    atk: c.attack,
    def: c.defense,
    power: c.power,
    serial: c.serial,
    finish: c.finish,
    holo: c.finish !== "NORMAL",
    isNew: c.isNew,
  }));

// Scène 3D d'ouverture (public/pack-opening) : elle vit dans une iframe de même origine et ne fait confiance qu'à nous.
// Le tirage reste côté serveur : la scène demande l'ouverture par message, on appelle l'action et on lui renvoie les cartes.
const SCENE_URL = "/pack-opening/futur.html?embed=1";

type SceneMessage = { type: "ready" | "unsupported" | "album-bump" | "album-stored" } | { type: "open-request"; id: number; bannerId?: string | null } | { type: "buy-request"; id: number; count?: number } | { type: "bulk-request"; count: number; bannerId?: string | null } | { type: "bulk-reveal" } | { type: "dev-grant" } | { type: "open-expeditions" };

export function ImmersiveOpener({ initialState, banners, expeditionsReady }: { initialState: PlayerPackState; banners: BannerInfo[]; expeditionsReady: number }) {
  const router = useRouter();
  const frame = useRef<HTMLIFrameElement>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [bulk, setBulk] = useState<OpenedPack | null>(null);
  const pendingBulk = useRef<OpenedPack | null>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const showBulk = () => {
    clearTimeout(revealTimer.current);
    if (pendingBulk.current) setBulk(pendingBulk.current);
    pendingBulk.current = null;
  };

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
        setLoaded(true); // la scène a compilé ses shaders : l'écran de chargement s'efface
        send({
          type: "init",
          config: { interval: CRYSTAL_INTERVAL_MS, max: MAX_CRYSTALS, ssrPity: SSR_PITY, urPity: UR_PITY },
          state: initialState,
          banners,
          expeditionsReady,
          dev: process.env.NODE_ENV !== "production",
          albumRect: albumRect(),
        });
      } else if (msg.type === "unsupported") {
        setUnsupported(true);
      } else if (msg.type === "album-bump" || msg.type === "album-stored") {
        // Le lien « Album » du menu (AlbumLink) réagit : impulsion, et compteur à chaque carte rangée
        window.dispatchEvent(new Event(msg.type === "album-stored" ? ALBUM_STORED : ALBUM_BUMP));
      } else if (msg.type === "buy-request") {
        const r = await buyCrystalsAction(msg.count === 25 ? 25 : 5);
        send(r.ok ? { type: "buy-result", id: msg.id, ok: true, state: r.state } : { type: "buy-result", id: msg.id, ok: false, error: r.error });
      } else if (msg.type === "bulk-request") {
        const r = await openPackAction(msg.count, msg.bannerId ?? null);
        // La scène joue l'ouverture de la capsule, puis demande le résumé ("bulk-reveal") ; sans réponse, il s'affiche quand même
        if (!r.ok) return send({ type: "bulk-done", ok: false, error: r.error });
        const best = ORDER.find((x) => r.pack.cards.some((c) => c.rarity === x)) ?? "N";
        send({ type: "bulk-done", ok: true, state: r.pack.state, best, cards: toSceneCards(r.pack.cards) });
        pendingBulk.current = r.pack;
        clearTimeout(revealTimer.current);
        revealTimer.current = setTimeout(showBulk, 120000); // filet de sécurité si la scène ne répond plus
      } else if (msg.type === "open-expeditions") {
        router.push("/expeditions");
      } else if (msg.type === "dev-grant") {
        const r = await devGrantCrystalsAction();
        if (r.ok) send({ type: "buy-result", id: -1, ok: true, state: r.state });
      } else if (msg.type === "bulk-reveal") {
        showBulk();
      } else if (msg.type === "open-request") {
        const result = await openPackAction(5, msg.bannerId ?? null);
        if (!result.ok) return send({ type: "pack-result", id: msg.id, ok: false, error: result.error });
        const { cards, state, pity } = result.pack;
        send({
          type: "pack-result",
          id: msg.id,
          ok: true,
          state,
          pity: pity === "NONE" ? null : pity,
          cards: toSceneCards(cards),
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
  }, [initialState, banners, expeditionsReady, router]);

  // Menu flottant et plein écran uniquement tant que la scène est affichée (l'effet est coupé quand on quitte la page)
  useEffect(() => {
    if (unsupported) return;
    document.body.classList.add("scene-active", "scene-packs");
    return () => document.body.classList.remove("scene-active", "scene-packs");
  }, [unsupported]);

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
    <div className="relative" style={{ height: "100dvh", minHeight: 560 }}>
      <iframe ref={frame} src={SCENE_URL} title="Ouverture de paquets" allow="autoplay" className="scene-page block h-full w-full border-0 bg-[#e9eff6]" />
      {bulk && <BulkSummary bulk={bulk} onClose={() => setBulk(null)} />}
      <div className="scene-loader" data-ready={loaded} aria-hidden="true">
        <span className="scene-loader-name">Anime Masters</span>
        <span className="scene-loader-bar" />
      </div>
    </div>
  );
}
