"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { acceptFriendRequestAction, blockUserAction, removeFriendshipAction, sendFriendRequestAction, unblockUserAction } from "../friend-actions";
import type { getFriendsState } from "@/lib/friends";

type State = Awaited<ReturnType<typeof getFriendsState>>;

export function FriendsBoard({ state, max }: { state: State; max: number }) {
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const act = (call: () => Promise<{ ok: boolean; error?: string }>, done?: string) =>
    start(async () => {
      const r = await call();
      setMessage(r.ok ? (done ? { ok: true, text: done } : null) : { ok: false, text: r.error ?? "Échec." });
      if (r.ok && done) setName("");
    });

  return (
    <div className="fr-grid">
      <section className="fr-panel" aria-labelledby="fr-friends">
        <h2 id="fr-friends">Mes amis ({state.friends.length} / {max})</h2>
        {state.friends.length === 0 ? <p className="vt-muted">Aucun ami pour l&apos;instant : envoie une demande avec un pseudo.</p> : (
          <ul className="fr-list">
            {state.friends.map((f) => (
              <li key={f.friendshipId}>
                <span className="fr-dot" data-online={f.online || undefined} aria-hidden />
                <div className="fr-name"><Link href={`/u/${f.username}`}>{f.username}</Link><small>{f.seen}</small></div>
                <div className="fr-actions">
                  <Link className="ui-button" href={`/duels/new?to=${encodeURIComponent(f.username)}`}>Défier</Link>
                  <Link className="ui-button" href={`/trades/new?to=${encodeURIComponent(f.username)}`}>Échange</Link>
                  <button type="button" className="ui-button" disabled={pending} onClick={() => window.confirm(`Retirer ${f.username} de tes amis ?`) && act(() => removeFriendshipAction(f.friendshipId))}>Retirer</button>
                  <button type="button" className="ui-button" disabled={pending} onClick={() => window.confirm(`Bloquer ${f.username} ? Il ne pourra plus te contacter.`) && act(() => blockUserAction(f.username))}>Bloquer</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="fr-panel" aria-labelledby="fr-requests">
        <h2 id="fr-requests">Demandes reçues ({state.received.length})</h2>
        {state.received.length === 0 ? <p className="vt-muted">Aucune demande en attente.</p> : (
          <ul className="fr-list">
            {state.received.map((r) => (
              <li key={r.friendshipId}>
                <div className="fr-name"><Link href={`/u/${r.username}`}>{r.username}</Link></div>
                <div className="fr-actions">
                  <button type="button" className="ui-button" disabled={pending} onClick={() => act(() => acceptFriendRequestAction(r.friendshipId))}>Accepter</button>
                  <button type="button" className="ui-button" disabled={pending} onClick={() => act(() => removeFriendshipAction(r.friendshipId))}>Refuser</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {state.sent.length > 0 && (<>
          <h3>Demandes envoyées ({state.sent.length})</h3>
          <ul className="fr-list">
            {state.sent.map((r) => (
              <li key={r.friendshipId}>
                <div className="fr-name"><Link href={`/u/${r.username}`}>{r.username}</Link><small>en attente</small></div>
                <div className="fr-actions"><button type="button" className="ui-button" disabled={pending} onClick={() => act(() => removeFriendshipAction(r.friendshipId))}>Annuler</button></div>
              </li>
            ))}
          </ul>
        </>)}
        <h3>Ajouter un ami</h3>
        <form className="fr-add" onSubmit={(e) => { e.preventDefault(); if (name.trim()) act(() => sendFriendRequestAction(name), "Demande envoyée."); }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pseudo du joueur" aria-label="Pseudo du joueur" maxLength={40} autoComplete="off" />
          <button type="submit" className="ui-button" disabled={pending || !name.trim()}>Envoyer</button>
        </form>
        {message && <p className="fr-msg" data-ok={message.ok || undefined} role="status">{message.text}</p>}
      </section>

      <section className="fr-panel" aria-labelledby="fr-blocked">
        <h2 id="fr-blocked">Bloqués ({state.blocked.length})</h2>
        <p className="vt-muted">Un joueur bloqué ne peut plus t&apos;envoyer de demande, de message, de défi ni d&apos;échange.</p>
        {state.blocked.length > 0 && (
          <ul className="fr-list">
            {state.blocked.map((b) => (
              <li key={b.blockId}>
                <div className="fr-name">{b.username}</div>
                <div className="fr-actions"><button type="button" className="ui-button" disabled={pending} onClick={() => act(() => unblockUserAction(b.userId))}>Débloquer</button></div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
