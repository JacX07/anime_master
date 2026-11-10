"use client";

import { useState, useTransition } from "react";
import { setAvatarAction, setShowcaseAction, setTitleAction } from "@/app/profile-actions";
import { RARITY_NAMES } from "@/lib/labels";

interface Pin {
  id: number;
  name: string;
  imageUrl: string;
  rarity: string;
}

/** Réglages de ton propre profil : titre équipé et vitrine (6 personnages au plus). */
export function ProfileEditor({ titles, current, pinnable, pinned, max, avatar = null }: { titles: { key: string; title: string }[]; current: string | null; pinnable: Pin[]; pinned: number[]; max: number; avatar?: number | null }) {
  const [title, setTitle] = useState(current ?? "");
  const [avatarId, setAvatarId] = useState<number | null>(avatar);
  // Mode du sélecteur : vitrine ou photo de profil ; recherche, rareté et défilement par paquets (toute la collection, v0.3.0)
  const [mode, setMode] = useState<"showcase" | "avatar">("showcase");
  const [q, setQ] = useState("");
  const [rarity, setRarity] = useState("");
  const [shown, setShown] = useState(60);
  const needle = q.trim().toLocaleLowerCase("fr");
  const list = pinnable.filter((c) => (!rarity || c.rarity === rarity) && (!needle || c.name.toLocaleLowerCase("fr").includes(needle)));
  const [picked, setPicked] = useState<number[]>(pinned);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < max ? [...p, id] : p));
  const save = () =>
    start(async () => {
      const [a, b, c] = await Promise.all([setTitleAction(title || null), setShowcaseAction(picked), setAvatarAction(avatarId)]);
      const err = [a, b, c].find((r) => !r.ok);
      setMsg(err && !err.ok ? err.error : "Profil enregistré.");
    });

  return (
    <section className="pf-edit" aria-label="Modifier mon profil">
      <h2>Mon profil</h2>
      <label className="pf-field">
        Titre
        <select value={title} onChange={(e) => setTitle(e.target.value)}>
          <option value="">Aucun titre</option>
          {titles.map((t) => (
            <option key={t.key} value={t.key}>
              {t.title}
            </option>
          ))}
        </select>
      </label>
      <div className="pf-modes" role="group" aria-label="Choisir">
        <button type="button" className="ui-button" aria-pressed={mode === "showcase"} onClick={() => setMode("showcase")}>Vitrine ({picked.length} / {max})</button>
        <button type="button" className="ui-button" aria-pressed={mode === "avatar"} onClick={() => setMode("avatar")}>Photo de profil</button>
        {mode === "avatar" && avatarId !== null && <button type="button" className="ui-button" onClick={() => setAvatarId(null)}>Revenir aux initiales</button>}
      </div>
      <p className="vt-muted">{mode === "showcase" ? "Choisis jusqu’à " + max + " personnages de ta collection, toutes raretés." : "Choisis un personnage : son image devient ta photo de profil (menu, profil, classements)."}</p>
      <div className="card-filters">
        <input type="search" aria-label="Rechercher un personnage" placeholder="Nom…" value={q} onChange={(e) => { setQ(e.target.value); setShown(60); }} />
        <select aria-label="Rareté" value={rarity} onChange={(e) => { setRarity(e.target.value); setShown(60); }}><option value="">Toutes raretés</option>{Object.entries(RARITY_NAMES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <small>{list.length} personnage{list.length > 1 ? "s" : ""}</small>
      </div>
      <ul className="pf-pick">
        {list.slice(0, shown).map((c) => {
          const on = mode === "showcase" ? picked.includes(c.id) : avatarId === c.id;
          return (
          <li key={c.id}>
            <button type="button" data-on={on} data-rarity={c.rarity} onClick={() => (mode === "showcase" ? toggle(c.id) : setAvatarId(c.id))} title={c.name} aria-pressed={on}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.imageUrl} alt={c.name} loading="lazy" referrerPolicy="no-referrer" />
            </button>
          </li>
          );
        })}
      </ul>
      {shown < list.length && <button type="button" className="ui-button" onClick={() => setShown((n) => n + 60)}>Afficher plus ({list.length - shown} restants)</button>}
      <div className="pf-save">
        <button type="button" className="site-cta" onClick={save} disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        {msg && <span role="status">{msg}</span>}
      </div>
    </section>
  );
}
