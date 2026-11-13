"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Release } from "@/lib/changelog";
import { readReleaseAction } from "@/app/changelog/actions";
import { ReleaseNotes } from "./ReleaseNotes";

export function UpdateNotice({ release, tutorialActive }: { release: Release; tutorialActive: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const deferred = useRef(tutorialActive);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const modal = dialog.current;
    if (!modal || dismissed) return;
    const check = () => {
      const blockers = document.querySelectorAll('.bt-layout, .hs-fight, .pk-stage[data-revealing], .tuto-layer, dialog[open], [role="dialog"]');
      const blocked = deferred.current || pathname.startsWith("/combat") || pathname === "/changelog" || Array.from(blockers).some((el) =>
        el !== modal && !modal.contains(el) && el.getClientRects().length > 0);
      if (blocked && modal.open) modal.close();
      else if (!blocked && !modal.open) modal.showModal();
    };
    const tutorial = (event: Event) => { deferred.current = (event as CustomEvent<{ active: boolean }>).detail.active; check(); };
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "open", "inert"] });
    addEventListener("tutorial:state", tutorial);
    dispatchEvent(new Event("tutorial:request"));
    check();
    return () => { observer.disconnect(); removeEventListener("tutorial:state", tutorial); if (modal.open) modal.close(); };
  }, [dismissed, pathname]);

  const dismiss = (history = false) => {
    if (pending) return;
    start(async () => {
      setError("");
      try {
        const result = await readReleaseAction(release.version);
        if (!result.ok) { setError(result.error); return; }
        setDismissed(true);
        dialog.current?.close();
        if (history) router.push("/changelog");
      } catch { setError("Impossible d'enregistrer la lecture. Réessaie."); }
    });
  };

  return <dialog ref={dialog} className="release-modal" aria-labelledby="update-title" aria-describedby="update-description"
    onCancel={(event) => { event.preventDefault(); dismiss(); }}
    onClick={(event) => { if (event.target === event.currentTarget) dismiss(); }}>
    <div className="release-modal-top"><p className="mq-eyebrow">Nouvelle mise à jour</p><button type="button" className="text-action" disabled={pending} onClick={() => dismiss()}>Fermer ×</button></div>
    <h2 id="update-title">Anima Clash {release.version}</h2>
    <p className="release-intro" id="update-description">{release.title}</p>
    <div className="release-scroll" tabIndex={0} aria-label={`Nouveautés ${release.version}`}><ReleaseNotes release={release} /></div>
    {error && <p className="release-error" role="alert">{error}</p>}
    <div className="release-modal-actions">
      <button type="button" className="ui-button text-action" disabled={pending} onClick={() => dismiss(true)}>Toutes les mises à jour</button>
      <button type="button" className="ui-button text-action" disabled={pending} onClick={() => dismiss()}>{pending ? "Enregistrement…" : "C'est lu, jouer"}</button>
    </div>
    <p className="release-hint">Une fois fermée, cette annonce ne revient qu’à la prochaine version.</p>
  </dialog>;
}
