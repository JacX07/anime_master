"use client";

import { useState, useTransition } from "react";
import { acceptFriendRequestAction, blockUserAction, removeFriendshipAction, sendFriendRequestAction, unblockUserAction } from "@/app/friend-actions";

type Relation = { kind: "none" } | { kind: "blocked" } | { kind: "friends" | "sent" | "received"; friendshipId: string };

/** Boutons d'amitié sur le profil d'un autre joueur. */
export function FriendButtons({ username, userId, relation }: { username: string; userId: string; relation: Relation }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (call: () => Promise<{ ok: boolean; error?: string }>) => start(async () => { const r = await call(); setError(r.ok ? null : r.error ?? "Échec."); });
  return (
    <div className="pf-friend">
      {relation.kind === "none" && <button type="button" className="ui-button" disabled={pending} onClick={() => run(() => sendFriendRequestAction(username))}>Ajouter en ami</button>}
      {relation.kind === "sent" && <button type="button" className="ui-button" disabled={pending} onClick={() => run(() => removeFriendshipAction(relation.friendshipId))}>Demande envoyée · annuler</button>}
      {relation.kind === "received" && <>
        <button type="button" className="ui-button" disabled={pending} onClick={() => run(() => acceptFriendRequestAction(relation.friendshipId))}>Accepter la demande</button>
        <button type="button" className="ui-button" disabled={pending} onClick={() => run(() => removeFriendshipAction(relation.friendshipId))}>Refuser</button>
      </>}
      {relation.kind === "friends" && <button type="button" className="ui-button" disabled={pending} onClick={() => window.confirm(`Retirer ${username} de tes amis ?`) && run(() => removeFriendshipAction(relation.friendshipId))}>Ami · retirer</button>}
      {relation.kind === "blocked"
        ? <button type="button" className="ui-button" disabled={pending} onClick={() => run(() => unblockUserAction(userId))}>Débloquer</button>
        : <button type="button" className="ui-button" disabled={pending} onClick={() => window.confirm(`Bloquer ${username} ?`) && run(() => blockUserAction(username))}>Bloquer</button>}
      {error && <p className="fr-msg" role="status">{error}</p>}
    </div>
  );
}
