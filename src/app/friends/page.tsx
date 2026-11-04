import type { Metadata } from "next";
import { Suspense } from "react";
import { SceneBody } from "@/components/SceneBody";
import { FRIEND_MAX, getFriendsState, touchLastSeen } from "@/lib/friends";
import { requireUser } from "@/lib/session";
import { FriendsBoard } from "./FriendsBoard";
import "./friends.css";

export const metadata: Metadata = { title: "Amis — Anime Masters", robots: { index: false } };

export default function FriendsPage() {
  return (
    <main className="vt">
      <SceneBody night scroll />
      <Suspense fallback={<p className="vt-inner vt-muted">Chargement…</p>}>
        <Friends />
      </Suspense>
    </main>
  );
}

async function Friends() {
  const user = await requireUser();
  await touchLastSeen(user.id);
  const state = await getFriendsState(user.id);
  return (
    <div className="vt-inner friends-page">
      <header className="pg-head">
        <h1 className="vt-title">Amis</h1>
        <p className="vt-sub">Retrouve tes amis, vois qui est en ligne, défie-les ou propose un échange.</p>
      </header>
      <FriendsBoard state={state} max={FRIEND_MAX} />
    </div>
  );
}
