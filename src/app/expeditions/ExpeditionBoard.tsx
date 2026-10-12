"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { claimExpeditionAction, startExpeditionAction } from "@/app/expedition-actions";
import { RarityGem, TypeIcon } from "@/components/icons";
import type { CardType, Rarity } from "@/generated/prisma/enums";
import { FAVORED_BONUS, MAX_TEAM, type Breach } from "@/lib/expedition-rules";
import { TYPE_LABELS } from "@/lib/labels";

const num = new Intl.NumberFormat("fr-FR");
interface Card { id: string; name: string; rarity: Rarity; type: CardType; power: number; imageUrl: string }
interface Open { id: string; breachId: string; endsAt: string; team: { name: string; imageUrl: string; rarity: Rarity }[] }
interface Past { id: string; breachId: string; outcome: string | null; ryo: number; crystals: number; special: number; claimedAt: string | null }
const OUTCOME = { FAIL: "Échec", SUCCESS: "Réussite", TRIUMPH: "Triomphe" } as const;

function left(ms: number) {
  if (ms <= 0) return null;
  const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min ${String(s % 60).padStart(2, "0")} s`;
}

/** Une expédition en cours : compte à rebours, et bouton de récupération dès la fin. */
function OpenRow({ e, breach, pending, onClaim }: { e: Open; breach?: Breach; pending: boolean; onClaim: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const ms = new Date(e.endsAt).getTime() - now, text = left(ms);
  return (
    <li data-ready={ms <= 0}>
      <div className="exp-team">{e.team.map((c, i) => <img key={i} src={c.imageUrl} alt={c.name} title={c.name} />)}</div>
      <div><b>{breach?.name}</b><br /><span className="vt-muted">{text ? `Retour dans ${text}` : "Terminée"}</span></div>
      <button type="button" className="vt-btn" disabled={pending || ms > 0} onClick={onClaim}>Récupérer le butin</button>
    </li>
  );
}

export function ExpeditionBoard({ slots, done, nextSlotAt, breaches, cards, open, history }: {
  slots: number; done: number; nextSlotAt: number | null; slotSteps: number[]; breaches: Breach[]; cards: Card[]; open: Open[]; history: Past[];
}) {
  const router = useRouter();
  const [breachId, setBreachId] = useState(breaches[0].id);
  const [team, setTeam] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const breach = breaches.find((b) => b.id === breachId)!;
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const shown = useMemo(() => cards.filter((c) => !q.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 60), [cards, q]);
  const free = slots - open.length;
  const score = team.reduce((n, id) => { const c = byId.get(id); return c ? n + c.power * (breach.favored.includes(c.type) ? FAVORED_BONUS : 1) : n; }, 0);
  const ratio = score / breach.threshold;
  const verdict = team.length === 0 ? "Choisis des cartes" : ratio < 0.85 ? "Risque d'échec élevé" : ratio < 1.15 ? "Incertain" : ratio < 1.5 ? "Réussite probable" : "Triomphe probable";

  const toggle = (id: string) => setTeam((t) => (t.includes(id) ? t.filter((x) => x !== id) : t.length < MAX_TEAM ? [...t, id] : t));
  const launch = () => start(async () => {
    const r = await startExpeditionAction(breachId, team);
    if (r.ok) { setTeam([]); setError(null); setReport(null); router.refresh(); } else setError(r.error);
  });
  const claim = (id: string) => start(async () => {
    const r = await claimExpeditionAction(id);
    if (r.ok) { setReport(`${r.breach} — ${OUTCOME[r.outcome as keyof typeof OUTCOME]} : +${num.format(r.ryo)} Ryō${r.crystals ? `, +${r.crystals} cristal${r.crystals > 1 ? "ux" : ""}` : ""}${r.special ? `, +${r.special} cristal spécial` : ""}.`); setError(null); router.refresh(); } else setError(r.error);
  });

  return (
    <div className="exp">
      <p className="vt-sub">
        Emplacements : <b>{free} libre{free > 1 ? "s" : ""} sur {slots}</b> · {done} expédition{done > 1 ? "s" : ""} récupérée{done > 1 ? "s" : ""}
        {nextSlotAt ? ` · un emplacement de plus à ${nextSlotAt} expéditions` : ""}
      </p>
      {report && <p className="exp-report" role="status">{report}</p>}
      {error && <p role="alert" className="trade-error">{error}</p>}

      {open.length > 0 && (
        <section aria-label="Expéditions en cours">
          <h2 className="vt-h2">En cours</h2>
          <ul className="exp-open">
            {open.map((e) => <OpenRow key={e.id} e={e} breach={breaches.find((x) => x.id === e.breachId)} pending={pending} onClaim={() => claim(e.id)} />)}
          </ul>
        </section>
      )}

      <section aria-label="Choisir une brèche">
        <h2 className="vt-h2">Choisir une brèche</h2>
        <ul className="exp-breaches" role="radiogroup" aria-label="Brèche">
          {breaches.map((b) => (
            <li key={b.id}>
              <button type="button" role="radio" aria-checked={b.id === breachId} data-tier={b.tier} onClick={() => setBreachId(b.id)}>
                <span className="exp-tier">{b.tier} · {b.hours} h</span>
                <b>{b.name}</b>
                <small>{b.lore}</small>
                <span className="exp-meta">
                  Puissance conseillée {num.format(b.threshold)} ·{" "}
                  {b.favored.map((t) => <TypeIcon key={t} type={t} title={`${TYPE_LABELS[t].name} favorisé`} />)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Équipe">
        <h2 className="vt-h2">Équipe ({team.length}/{MAX_TEAM})</h2>
        <p className="vt-muted">
          Puissance de l&apos;équipe ≈ <b>{num.format(Math.round(score))}</b> / {num.format(breach.threshold)} : {verdict}. Les types favorisés comptent ×{FAVORED_BONUS}.
        </p>
        <div className="exp-team big">
          {team.map((id) => { const c = byId.get(id)!; return <button key={id} type="button" onClick={() => toggle(id)} title={`Retirer ${c.name}`}><img src={c.imageUrl} alt={c.name} /></button>; })}
        </div>
        <button type="button" className="vt-btn" disabled={pending || team.length === 0 || free <= 0} onClick={launch}>
          {free <= 0 ? "Aucun emplacement libre" : pending ? "…" : `Partir en expédition (${breach.hours} h)`}
        </button>
        <div className="trade-picker">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un personnage" aria-label="Chercher un personnage" className="exp-search" />
        <ul className="duel-cards">
          {shown.map((c) => (
            <li key={c.id}>
              <label>
                <input type="checkbox" checked={team.includes(c.id)} disabled={!team.includes(c.id) && team.length >= MAX_TEAM} onChange={() => toggle(c.id)} />
                <RarityGem rarity={c.rarity} />
                <TypeIcon type={c.type} title={TYPE_LABELS[c.type].name} />
                <span>{c.name}</span>
                <span className="vt-muted">{num.format(c.power)}</span>
              </label>
            </li>
          ))}
          {shown.length === 0 && <li className="vt-muted">Aucune carte disponible.</li>}
        </ul>
        </div>
      </section>

      {history.length > 0 && (
        <section aria-label="Historique">
          <h2 className="vt-h2">Dernières expéditions</h2>
          <ul className="exp-history">
            {history.map((h) => (
              <li key={h.id}>
                <b>{breaches.find((b) => b.id === h.breachId)?.name}</b> — {OUTCOME[h.outcome as keyof typeof OUTCOME] ?? "?"} : +{num.format(h.ryo)} Ryō{h.crystals ? `, +${h.crystals} cristaux` : ""}{h.special ? `, +${h.special} spécial` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
