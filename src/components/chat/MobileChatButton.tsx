"use client";

import { Icon } from "@/components/icons";

export function MobileChatButton() {
  return <button type="button" className="mobile-chat-trigger" aria-label="Ouvrir le chat" onClick={() => window.dispatchEvent(new Event("chat:open"))}>
    <Icon name="echange" /><span>Chat</span>
  </button>;
}
