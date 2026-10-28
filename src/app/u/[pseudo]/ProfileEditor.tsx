"use client";

import { useState, useTransition } from "react";
import { setShowcaseAction, setTitleAction } from "@/app/profile-actions";

interface Pin {
  id: number;
  name: string;
  imageUrl: string;
  rarity: string;
}

/** Réglages de ton propre profil : titre équipé et vitrine (6 personnages au plus). */
export function ProfileEditor({ titles, current, pinnable, pinned, max }: { titles: { key: string; title: string }[]; current: string | null; pinnable: Pin[]; pinned: number[]; max: number }) {
  const [title, setTitle] = useState(current ?? "");
  const [picked, setPicked] = useState<number[]>(pinned);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < max ? [...p, id] : p));
  const save = () =>
    start(async () => {
      const [a, b] = await Promise.all([setTitleAction(title || null), setShowcaseAction(picked)]);
      const err = [a, b].find((r) => !r.ok);
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
      <p className="vt-muted">
        Vitrine : {picked.length} / {max} personnages. Les plus rares de ta collection sont proposés en premier.
      </p>
      <ul className="pf-pick">
        {pinnable.map((c) => (
          <li key={c.id}>
            <button type="button" data-on={picked.includes(c.id)} data-rarity={c.rarity} onClick={() => toggle(c.id)} title={c.name} aria-pressed={picked.includes(c.id)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.imageUrl} alt={c.name} loading="lazy" referrerPolicy="no-referrer" />
            </button>
          </li>
        ))}
      </ul>
      <div className="pf-save">
        <button type="button" className="site-cta" onClick={save} disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        {msg && <span role="status">{msg}</span>}
      </div>
    </section>
  );
}
