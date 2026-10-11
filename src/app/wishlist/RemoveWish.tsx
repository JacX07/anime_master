"use client";

import { useTransition } from "react";
import { removeWishAction } from "@/app/wishlist-actions";

export function RemoveWish({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="vt-btn ghost" disabled={pending} onClick={() => start(async () => void (await removeWishAction(id)))}>
      Retirer
    </button>
  );
}
