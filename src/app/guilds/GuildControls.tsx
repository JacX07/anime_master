"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { createGuildAction, guildMemberAction, updateGuildAction } from "../guild-actions";
import { GUILD_COST, GUILD_ICONS, type GuildInput } from "@/lib/guild-rules";

export function GuildAction({ operation, guildId, targetId, children, confirm, disabled, back }: {
  operation: string; guildId: string; targetId?: string; children: React.ReactNode; confirm?: string; disabled?: boolean; back?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  return <span className="guild-action"><button type="button" className="ui-button" disabled={pending || disabled} onClick={() => {
    if (confirm && !window.confirm(confirm)) return;
    start(async () => {
      try {
        const result = await guildMemberAction(operation, guildId, targetId);
        setMessage({ ok: result.ok, text: result.ok ? result.message : result.error });
        if (result.ok) {
          if (back) router.push("/guilds");
          else if (result.tag) router.push(`/guilds/${result.tag}`);
          router.refresh();
        }
      } catch { setMessage({ ok: false, text: "Connexion interrompue, réessaie." }); }
    });
  }}>{pending ? "En cours…" : children}</button>{message && <small role={message.ok ? "status" : "alert"}>{message.text}</small>}</span>;
}

export function GuildForm({ guild, disabled = false }: { guild?: GuildInput & { id: string }; disabled?: boolean }) {
  const router = useRouter();
  const [input, setInput] = useState<GuildInput>(guild ?? { name: "", tag: "", description: "", icon: "squads", joinMode: "REQUEST" });
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  return <form className="guild-form" onSubmit={(event) => {
    event.preventDefault();
    start(async () => {
      try {
        const result = guild ? await updateGuildAction(guild.id, input) : await createGuildAction(input);
        setMessage({ ok: result.ok, text: result.ok ? result.message : result.error });
        if (result.ok && result.tag) { router.push(`/guilds/${result.tag}`); router.refresh(); }
      } catch { setMessage({ ok: false, text: "Connexion interrompue, réessaie." }); }
    });
  }}>
    <label>Nom de la guilde<input value={input.name} minLength={3} maxLength={40} required disabled={pending || disabled} onChange={(e) => setInput({ ...input, name: e.target.value })}/></label>
    <label>Tag · 2 à 4 caractères<input value={input.tag} minLength={2} maxLength={4} pattern="[A-Za-z0-9]{2,4}" required disabled={pending || disabled} onChange={(e) => setInput({ ...input, tag: e.target.value.toUpperCase() })}/></label>
    <label>Description<textarea value={input.description} maxLength={500} rows={3} disabled={pending || disabled} onChange={(e) => setInput({ ...input, description: e.target.value })}/></label>
    <label>Entrée<select value={input.joinMode} disabled={pending || disabled} onChange={(e) => setInput({ ...input, joinMode: e.target.value as GuildInput["joinMode"] })}><option value="REQUEST">Sur demande</option><option value="OPEN">Ouverte</option></select></label>
    <fieldset><legend>Emblème</legend><div className="guild-emblems">{GUILD_ICONS.map((icon) => <button key={icon} type="button" className="guild-emblem" disabled={pending || disabled} aria-label={`Emblème ${icon}`} aria-pressed={input.icon === icon} onClick={() => setInput({ ...input, icon })}><Icon name={icon}/></button>)}</div></fieldset>
    <button type="submit" className="ui-button" disabled={pending || disabled}>{pending ? "Enregistrement…" : guild ? "Enregistrer la guilde" : `Créer la guilde · ${GUILD_COST.toLocaleString("fr-FR")} Ryō`}</button>
    {message && <p role={message.ok ? "status" : "alert"}>{message.text}</p>}
  </form>;
}
