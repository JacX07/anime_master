"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { acceptDuelAction, createDuelAction, declineDuelAction } from "@/app/duel-actions";
import { RarityGem, Stat, TypeIcon } from "@/components/icons";
import { TYPE_LABELS } from "@/lib/labels";
import type { DuelCard } from "@/lib/duels";

const num = new Intl.NumberFormat("fr-FR");

/** Choix de 3 cartes dans l'ordre d'attaque : pour lancer un défi (`to`) ou accepter celui reçu (`duelId`). */
export function TeamPicker({ cards, to, duelId }: { cards: DuelCard[]; to?: string; duelId?: string }) {
  const router = useRouter();
  const [team, setTeam] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return cards.filter((c) => !needle || c.name.toLowerCase().includes(needle)).slice(0, 80);
  }, [cards, q]);

  const toggle = (id: string) => setTeam((t) => (t.includes(id) ? t.filter((x) => x !== id) : t.length < 3 ? [...t, id] : t));
  const move = (i: number, d: -1 | 1) =>
    setTeam((t) => {
      const n = [...t];
      [n[i], n[i + d]] = [n[i + d], n[i]];
      return n;
    });

  const submit = () =>
    start(async () => {
      if (duelId) {
        const r = await acceptDuelAction(duelId, team);
        if (r.ok) router.refresh();
        else setError(r.error);
      } else {
        const r = await createDuelAction(to!, team);
        if (r.ok) router.push(`/duels/${r.duelId}`);
        else setError(r.error);
      }
    });
  const decline = () =>
    start(async () => {
      const r = await declineDuelAction(duelId!);
      if (r.ok) router.push("/duels");
      else setError(r.error);
    });

  return (
    <div className="duel-pick">
      <section aria-label="Ton équipe">
        <h2 className="vt-h2">Ton équipe, dans l&apos;ordre d&apos;attaque</h2>
        <ol className="duel-team">
          {[0, 1, 2].map((i) => {
            const c = team[i] ? byId.get(team[i]) : null;
            return (
              <li key={i} data-empty={!c}>
                <span className="duel-pos">{i + 1}</span>
                {c ? (
                  <>
                    <img src={c.imageUrl} alt="" />
                    <div>
                      <b>{c.name}</b>
                      <span className="duel-stats">
                        <TypeIcon type={c.type} title={TYPE_LABELS[c.type].name} />
                        <Stat icon="atk">{num.format(c.attack)}</Stat>
                        <Stat icon="def">{num.format(c.defense)}</Stat>
                      </span>
                    </div>
                    <span className="duel-order">
                      <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter">↑</button>
                      <button type="button" onClick={() => move(i, 1)} disabled={i === team.length - 1} aria-label="Descendre">↓</button>
                      <button type="button" onClick={() => toggle(c.id)} aria-label="Retirer">✕</button>
                    </span>
                  </>
                ) : (
                  <span className="vt-muted">Choisis une carte</span>
                )}
              </li>
            );
          })}
        </ol>
        {error && (
          <p role="alert" className="trade-error">
            {error}
          </p>
        )}
        <div className="duel-actions">
          {duelId && (
            <button type="button" className="vt-btn ghost" disabled={pending} onClick={decline}>
              Refuser le duel
            </button>
          )}
          <button type="button" className="vt-btn" disabled={pending || team.length !== 3} onClick={submit}>
            {pending ? "…" : duelId ? "Accepter avec cette équipe" : `Défier ${to}`}
          </button>
        </div>
      </section>
      <section className="trade-picker" aria-label="Tes cartes">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un personnage" aria-label="Chercher un personnage" />
        <ul className="duel-cards">
          {shown.map((c) => (
            <li key={c.id}>
              <label>
                <input type="checkbox" checked={team.includes(c.id)} disabled={!team.includes(c.id) && team.length >= 3} onChange={() => toggle(c.id)} />
                <RarityGem rarity={c.rarity} />
                <TypeIcon type={c.type} title={TYPE_LABELS[c.type].name} />
                <span>{c.name}</span>
                <span className="duel-stats vt-muted">
                  <Stat icon="atk">{num.format(c.attack)}</Stat>
                  <Stat icon="def">{num.format(c.defense)}</Stat>
                </span>
              </label>
            </li>
          ))}
          {shown.length === 0 && <li className="vt-muted">Aucune carte.</li>}
        </ul>
      </section>
    </div>
  );
}
