"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { deleteChatAction, onlinePlayersAction, pollChatAction, reportChatAction, sendChatAction } from "@/app/chat-actions";
import type { ChatMessageView } from "@/lib/chat";
import { CHAT_MAX_LENGTH } from "@/lib/chat-rules";
import "./chat.css";

type Tab = "guild" | "general" | "dm" | "online";
type Online = Extract<Awaited<ReturnType<typeof onlinePlayersAction>>, { ok: true }>;
type PollOk = Extract<Awaited<ReturnType<typeof pollChatAction>>, { ok: true }>;
type State = PollOk["state"];

const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* stockage indisponible */ } },
};
const listeners = new Set<() => void>();
/** Réglage mémorisé par navigateur ; la valeur serveur est la valeur par défaut (pas de décalage à l'hydratation). */
function useStored(key: string, fallback: string): [string, (v: string) => void] {
  const value = useSyncExternalStore(
    (cb) => { listeners.add(cb); window.addEventListener("storage", cb); return () => { listeners.delete(cb); window.removeEventListener("storage", cb); }; },
    () => store.get(key) ?? fallback,
    () => fallback,
  );
  return [value, (v) => { store.set(key, v); listeners.forEach((f) => f()); }];
}
const time = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

/** Bouton et panneau de chat en bas à droite : Guilde, Général, Privé (docs/specs/social.md §4). */
export function ChatDock({ userId }: { userId: string }) {
  const [openRaw, setOpenRaw] = useStored("chat-open", "0");
  const [tabRaw, setTabRaw] = useStored("chat-tab", "general");
  const [hideRaw, setHideRaw] = useStored("chat-hide-general", "0");
  const open = openRaw === "1";
  const hideGeneral = hideRaw === "1";
  const tab: Tab = tabRaw === "guild" || tabRaw === "dm" || tabRaw === "online" ? tabRaw : "general";
  const [peer, setPeer] = useState<string | null>(null);
  const [online, setOnline] = useState<Online | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [box, setBox] = useState<{ channel: string | null; items: ChatMessageView[] }>({ channel: null, items: [] });
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const list = useRef<HTMLDivElement>(null);
  const last = useRef<string | null>(null);
  const busy = useRef(false);

  const channel = tab === "online" ? null : tab === "general" ? "general" : tab === "guild" ? state?.guild?.channel ?? null : peer;
  const watching = open && !!channel && !(tab === "general" && hideGeneral);

  const poll = useCallback(async (reset: boolean) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const r = await pollChatAction(watching ? channel : null, reset ? null : last.current, watching);
      if (!r.ok) { setError(r.error); return; }
      setState(r.state);
      if (watching) {
        setBox((prev) => {
          const base = reset || prev.channel !== channel ? [] : prev.items;
          const known = new Set(base.map((m) => m.id));
          const items = [...base, ...r.messages.filter((m) => !known.has(m.id))];
          last.current = items.length ? items[items.length - 1].createdAt : null;
          return { channel, items };
        });
        setError(null);
      }
    } finally { busy.current = false; }
  }, [channel, watching]);

  // Changement de canal : on recharge ; ensuite sondage toutes les 5 s (60 s fermé)
  useEffect(() => { last.current = null; void poll(true); }, [channel, watching]); // eslint-disable-line react-hooks/exhaustive-deps
  const messages = box.channel === channel ? box.items : [];
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) void poll(false); }, open ? 5000 : 60000); // fermé : simple pastille de non-lus, une minute suffit (egress Supabase)
    return () => clearInterval(id);
  }, [poll, open]);
  // Onglet « En ligne » : chargement à l'ouverture puis toutes les 60 s (egress Supabase)
  useEffect(() => {
    if (!open || tab !== "online") return;
    const load = () => { void onlinePlayersAction().then((r) => { if (r.ok) setOnline(r); }); };
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, 60000);
    return () => clearInterval(id);
  }, [open, tab]);
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }); }, [messages.length, open, tab, peer]);

  const toggle = (v: boolean) => setOpenRaw(v ? "1" : "0");
  const pick = (t: Tab) => { setTabRaw(t); setPeer(null); };
  const send = () => {
    const body = text.trim();
    if (!body || !channel) return;
    start(async () => {
      const r = await sendChatAction(channel, body);
      if (r.ok) { setText(""); setError(null); setBox((b) => (b.channel !== channel || b.items.some((m) => m.id === r.message.id) ? b : { channel, items: [...b.items, r.message] })); last.current = r.message.createdAt; }
      else setError(r.error);
    });
  };
  const act = (call: () => Promise<{ ok: boolean; error?: string }>) => start(async () => { const r = await call(); if (!r.ok) setError(r.error ?? "Échec."); else void poll(true); });

  const unread = state?.unread ?? 0;
  const canDelete = (m: ChatMessageView) => !!state && (state.staff || (state.guildOwner && m.channel.startsWith("guild:")));
  const peerInfo = state?.dms.find((d) => d.channel === peer);
  const writeOk = tab === "general" ? state?.general.canWrite !== false : true;

  if (!open) {
    return (
      <button type="button" className="chat-fab" onClick={() => toggle(true)} aria-label={unread ? `Ouvrir le chat, ${unread} non lus` : "Ouvrir le chat"}>
        Chat{unread > 0 && <i>{unread > 99 ? "99+" : unread}</i>}
      </button>
    );
  }
  return (
    <section className="chat-panel" aria-label="Chat">
      <div className="chat-tabs" role="tablist">
        {state?.guild && <button role="tab" type="button" aria-selected={tab === "guild"} onClick={() => pick("guild")}>Guilde{state.guild.unread > 0 && <i>{state.guild.unread}</i>}</button>}
        {!hideGeneral && <button role="tab" type="button" aria-selected={tab === "general"} onClick={() => pick("general")}>Général{(state?.general.unread ?? 0) > 0 && <i>{state?.general.unread}</i>}</button>}
        <button role="tab" type="button" aria-selected={tab === "dm"} onClick={() => pick("dm")}>Privé{(state?.dms.reduce((n, d) => n + d.unread, 0) ?? 0) > 0 && <i>{state?.dms.reduce((n, d) => n + d.unread, 0)}</i>}</button>
        <button role="tab" type="button" aria-selected={tab === "online"} onClick={() => pick("online")}>En ligne{online && online.total > 0 && <i className="chat-count">{online.total}</i>}</button>
        <button type="button" className="chat-close" onClick={() => toggle(false)} aria-label="Réduire le chat">–</button>
      </div>

      {tab === "online" ? (
        <div className="chat-list chat-online">
          {!online ? <p className="chat-empty">Chargement…</p> : online.players.length === 0 ? <p className="chat-empty">Personne d&apos;autre n&apos;est en ligne pour l&apos;instant.</p> : (
            <>
              {online.players.map((p) => {
                const conv = p.friend ? state?.dms.find((d) => d.userId === p.id) : undefined;
                return (
                  <div key={p.id} className="chat-player">
                    <span className="chat-dot" aria-hidden="true" />
                    <span className="chat-player-name"><Link href={`/u/${p.username}`}>{p.username}</Link><small>{[p.friend && "ami", p.guildTag && `[${p.guildTag}]`].filter(Boolean).join(" · ") || "en ligne"}</small></span>
                    {conv ? <button type="button" onClick={() => { setTabRaw("dm"); setPeer(conv.channel); }}>Message</button> : <Link href={`/u/${p.username}`}>Profil</Link>}
                  </div>
                );
              })}
              {online.total > online.players.length && <p className="chat-empty">+ {online.total - online.players.length} autres joueurs en ligne</p>}
            </>
          )}
        </div>
      ) : tab === "dm" && !peer ? (
        <div className="chat-list">
          {state?.dms.length ? state.dms.map((d) => (
            <button key={d.channel} type="button" className="chat-conv" onClick={() => setPeer(d.channel)}>
              <span>{d.username}</span>{d.unread > 0 && <i>{d.unread}</i>}
            </button>
          )) : <p className="chat-empty">Ajoute des amis pour leur écrire. <Link href="/friends">Mes amis</Link></p>}
        </div>
      ) : tab === "guild" && !state?.guild ? (
        <p className="chat-empty">Tu n&apos;as pas de guilde. <Link href="/guilds">Trouver une guilde</Link></p>
      ) : tab === "general" && hideGeneral ? (
        <p className="chat-empty">Chat général masqué.</p>
      ) : (
        <>
          {tab === "dm" && <div className="chat-sub"><button type="button" onClick={() => setPeer(null)}>← Retour</button><b>{peerInfo?.username}</b></div>}
          {tab === "general" && <div className="chat-sub"><span>Tous les joueurs</span><button type="button" onClick={() => { setHideRaw("1"); pick(state?.guild ? "guild" : "dm"); }}>Masquer</button></div>}
          <div className="chat-msgs" ref={list} aria-live="polite">
            {messages.length === 0 && <p className="chat-empty">Aucun message pour l&apos;instant.</p>}
            {messages.map((m) => (
              <div key={m.id} className="chat-msg" data-mine={m.authorId === userId || undefined}>
                <small>{m.guildTag && <em>[{m.guildTag}]</em>}<Link href={`/u/${m.author}`}>{m.author}</Link> · {time(m.createdAt)}
                  {m.authorId !== userId && <button type="button" onClick={() => act(() => reportChatAction(m.id))} title="Signaler">Signaler</button>}
                  {canDelete(m) && <button type="button" onClick={() => window.confirm("Supprimer ce message ?") && act(() => deleteChatAction(m.id))}>Supprimer</button>}
                </small>
                <p>{m.content}</p>
              </div>
            ))}
          </div>
          {error && <p className="chat-error" role="status">{error}</p>}
          <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={CHAT_MAX_LENGTH} placeholder={writeOk ? "Écrire…" : "Niveau d'Arpenteur 3 requis"} disabled={!writeOk} aria-label="Message" autoComplete="off" />
            <button type="submit" disabled={pending || !text.trim() || !writeOk}>Envoyer</button>
          </form>
        </>
      )}
      {hideGeneral && <button type="button" className="chat-show" onClick={() => setHideRaw("0")}>Afficher le général</button>}
    </section>
  );
}
