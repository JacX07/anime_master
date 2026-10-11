"use client";

import { useEffect } from "react";
import { markNotificationsReadAction } from "@/app/trade-actions";

/** Marque tout comme lu à l'ouverture de la page (la cloche se remet à zéro). */
export function MarkRead() {
  useEffect(() => {
    void markNotificationsReadAction();
  }, []);
  return null;
}
