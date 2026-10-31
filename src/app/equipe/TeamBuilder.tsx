"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { CardType, Rarity } from "@/generated/prisma/enums";
import { autoAttackTeamAction, autoDefenseTeamAction, setAttackTeamAction, setDefenseTeamAction } from "@/app/battle-actions";
import { affinity, BATTLE } from "@/lib/battle";
import { BASE_SPELL, AFFINITY_COOLDOWN, SPELL_INFO, SPELL_NAMES } from "@/lib/battle-replay";
import { RARITY_NAMES, TYPE_LABELS } from "@/lib/labels";
import { describeSpell, spellOf, SPELL_COOLDOWN, SPELL_TARGET_LABEL } from "@/lib/spells";
import { TypeIcon } from "@/components/icons";
import "@/components/battle/battle.css";
import "./equipe.css";

export interface TeamCard {
  id: string;
  characterId: number;
  name: string;
  imageUrl: string;
  rarity: Rarity;
  type: CardType;
  attack: number;
  defense: number;
  stars: number;
  franchiseId: number | null;
  series: string | null;
}
type Kind = "ATTACK" | "DEFENSE";
type Slots = (string | null)[];

const num = new Intl.NumberFormat("fr-FR");
const RARITIES: Rarity[] = ["UR", "SSR", "SR", "R", "N"];
const TYPES = Object.keys(TYPE_LABELS) as CardType[];
const MAX_SHOWN = 60;

function SpellList({ card }: { card: TeamCard }) {
  const own = spellOf(card.characterId, card.rarity, card.type);
  const info = SPELL_INFO[card.type];
  return (
    <ul className="eq-spells">
      <li>
        <b>{BASE_SPELL.name}</b> <small>{BASE_SPELL.target}</small>
        <p>{BASE_SPELL.text}</p>
      </li>
      <li>
        <b><TypeIcon type={card.type} /> {SPELL_NAMES[card.type]}</b> <small>{info.target}</small>
        <p>{info.text}</p>
        <small>{AFFINITY_COOLDOWN}</small>
      </li>
      {own ? (
        <li>
          <b>★ {own.name}</b> <small>{SPELL_TARGET_LABEL[own.target ?? "none"]}</small>
          <p>{describeSpell(own)}</p>
          <small>Rechargement : {SPELL_COOLDOWN} actions, disponible dès la 1re action de la carte.</small>
        </li>
      ) : (
        <li className="vt-muted"><small>Pas de sort de personnage (réservé aux SSR et UR).</small></li>
      )}
    </ul>
  );
}


/** Fenêtre d'un personnage : portrait à gauche, sorts à droite, bouton pour l'ajouter à l'équipe ou l'en retirer. */
function CardDialog({ card, slot, full, onClose, onToggle }: { card: TeamCard | null; slot: number; full: boolean; onClose: () => void; onToggle: (card: TeamCard) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (card && !d.open) d.showModal();
    if (!card && d.open) d.close();
  }, [card]);
  return (
    <dialog ref={ref} className="eq-dialog" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-label={card ? `Sorts de ${card.name}` : undefined}>
      {card && (
        <div className="eq-dlg">
          <figure className="eq-dlg-art" data-rarity={card.rarity}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={card.imageUrl} alt={card.name} referrerPolicy="no-referrer" />
            <figcaption>
              <b>{card.name}</b>
              <small>{card.series}</small>
              <small><TypeIcon type={card.type} /> {TYPE_LABELS[card.type].name} · {RARITY_NAMES[card.rarity]}{card.stars > 0 ? ` · ${card.stars}★` : ""}</small>
              <small>ATK {num.format(card.attack)} · DEF {num.format(card.defense)}</small>
            </figcaption>
          </figure>
          <div className="eq-dlg-spells">
            <h2 className="eq-h">Sorts</h2>
            <SpellList card={card} />
            <div className="eq-dlg-btns">
              <button type="button" className="bt-btn" onClick={() => onToggle(card)} disabled={slot < 0 && full}>
                {slot >= 0 ? `Retirer de l'équipe (emplacement ${slot + 1})` : full ? "Équipe pleine : choisis un emplacement" : "Ajouter à l'équipe"}
              </button>
              <button type="button" className="bt-btn" onClick={onClose}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}

export function TeamBuilder({ cards, saved }: { cards: TeamCard[]; saved: Record<Kind, Slots> }) {
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const [kind, setKind] = useState<Kind>("ATTACK");
  const [savedTeams, setSavedTeams] = useState(saved);
  const [teams, setTeams] = useState(saved);
  const [selected, setSelected] = useState<number | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [rarity, setRarity] = useState<Rarity | "">("");
  const [type, setType] = useState<CardType | "">("");
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(MAX_SHOWN);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const slots = teams[kind];
  const members = slots.map((id) => (id ? byId.get(id) ?? null : null));
  const full = members.every(Boolean);
  const dirty = slots.join() !== savedTeams[kind].join();
  const focused = focus ? byId.get(focus) ?? null : null;

  const setSlots = (next: Slots) => {
    setTeams((t) => ({ ...t, [kind]: next }));
    setMsg(null);
  };
  const pick = (id: string) => {
    const next = [...slots];
    const at = next.indexOf(id);
    if (at >= 0) next[at] = null; // même carte : on la retire du slot d'origine
    const target = selected ?? next.findIndex((x) => !x);
    if (target < 0) return setMsg({ ok: false, text: "Équipe pleine : touche un emplacement pour le remplacer." });
    next[target] = id;
    setSlots(next);
    setSelected(next.findIndex((x, i) => i > target && !x) >= 0 ? next.findIndex((x, i) => i > target && !x) : null);
  };
  const clear = (i: number) => {
    const next = [...slots];
    next[i] = null;
    setSlots(next);
  };

  const save = () =>
    start(async () => {
      const ids = slots as string[];
      const r = await (kind === "ATTACK" ? setAttackTeamAction(ids) : setDefenseTeamAction(ids));
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      setSavedTeams((s) => ({ ...s, [kind]: slots }));
      setMsg({ ok: true, text: kind === "ATTACK" ? "Équipe d'attaque enregistrée." : "Équipe de défense enregistrée." });
    });
  const auto = () =>
    start(async () => {
      const r = await (kind === "ATTACK" ? autoAttackTeamAction() : autoDefenseTeamAction());
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      setTeams((t) => ({ ...t, [kind]: r.cardIds }));
      setSavedTeams((s) => ({ ...s, [kind]: r.cardIds }));
      setMsg({ ok: true, text: "Équipe composée avec tes cartes les plus rares." });
    });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return cards.filter(
      (c) => (!rarity || c.rarity === rarity) && (!type || c.type === type) && (!needle || c.name.toLowerCase().includes(needle) || (c.series ?? "").toLowerCase().includes(needle)),
    );
  }, [cards, rarity, type, q]);

  // Aperçu : stats cumulées, bonus de franchise, affinités
  const live = members.filter((c): c is TeamCard => !!c);
  const franchise = live.reduce((best, c) => {
    const same = live.filter((o) => c.franchiseId != null && o.franchiseId === c.franchiseId).length;
    return Math.max(best, BATTLE.franchiseBonus[same] ?? 0);
  }, 0);
  const total = (f: (c: TeamCard) => number) => live.reduce((n, c) => n + f(c) * (1 + c.stars * BATTLE.starBonus), 0);
  const covered = TYPES.filter((t) => live.some((c) => affinity(c.type, t) > 1));
  const exposed = TYPES.filter((t) => live.length > 0 && live.every((c) => affinity(t, c.type) > 1));

  return (
    <div className="eq">
      <nav className="eq-tabs" aria-label="Type d'équipe">
        {(["ATTACK", "DEFENSE"] as const).map((k) => (
          <button key={k} type="button" className="eq-tab" aria-pressed={k === kind} onClick={() => { setKind(k); setSelected(null); setMsg(null); }}>
            {k === "ATTACK" ? "Attaque" : "Défense"}
            <small>{k === "ATTACK" ? "Histoire, Tour, test" : "Arène PvP (bientôt)"}</small>
          </button>
        ))}
      </nav>

      <section className="eq-slots" aria-label={kind === "ATTACK" ? "Équipe d'attaque" : "Équipe de défense"}>
        {members.map((c, i) => (
          <div key={i} className="eq-slot" data-selected={selected === i || undefined} data-rarity={c?.rarity}>
            <button type="button" className="eq-slot-main" onClick={() => (c ? setFocus(c.id) : setSelected(i))} onDoubleClick={() => setSelected(i)} aria-label={c ? `${c.name}, emplacement ${i + 1}` : `Emplacement ${i + 1} vide`}>
              <span className="eq-pos">{i + 1}</span>
              {c ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.imageUrl} alt="" referrerPolicy="no-referrer" />
                  <span className="eq-name">{c.name}</span>
                  <small><TypeIcon type={c.type} /> {RARITY_NAMES[c.rarity]}{c.stars > 0 ? ` · ${c.stars}★` : ""}</small>
                  <small>ATK {num.format(c.attack)} · DEF {num.format(c.defense)}</small>
                </>
              ) : (
                <span className="eq-empty">Vide</span>
              )}
            </button>
            <div className="eq-slot-btns">
              <button type="button" className="bt-btn" onClick={() => setSelected(selected === i ? null : i)} aria-pressed={selected === i}>
                {selected === i ? "Choisis une carte ↓" : c ? "Remplacer" : "Choisir"}
              </button>
              {c && <button type="button" className="bt-btn" onClick={() => clear(i)}>Retirer</button>}
            </div>
          </div>
        ))}
      </section>

      <div className="eq-actions">
        <button type="button" className="bt-btn" disabled={pending || !full || !dirty} onClick={save}>Enregistrer</button>
        <button type="button" className="bt-btn" disabled={pending} onClick={auto}>Auto : mes 4 cartes les plus rares</button>
        {dirty && <span className="vt-muted">Modifications non enregistrées</span>}
        {msg && <span className={msg.ok ? "eq-ok" : "eq-err"} role={msg.ok ? "status" : "alert"}>{msg.text}</span>}
      </div>

      <section className="eq-preview" aria-label="Aperçu de l'équipe">
        <h2 className="eq-h">Aperçu</h2>
        {live.length === 0 ? (
          <p className="vt-muted">Ajoute des cartes pour voir les totaux et les synergies.</p>
        ) : (
          <ul>
            <li>ATK {num.format(Math.round(total((c) => c.attack)))} · DEF {num.format(Math.round(total((c) => c.defense)))} (avant bonus de combat)</li>
            <li>Bonus de franchise : {franchise > 0 ? `+${Math.round(franchise * 100)} % d'ATK, de DEF et de PV` : "aucun (2 cartes du même anime : +3 %, 3 : +6 %, 4 : +10 %)"}</li>
            <li>Forte contre : {covered.length ? covered.map((t) => TYPE_LABELS[t].name).join(", ") : "—"}</li>
            {exposed.length > 0 && <li>Faible contre : {exposed.map((t) => TYPE_LABELS[t].name).join(", ")} (toute l&apos;équipe)</li>}
          </ul>
        )}
      </section>

      <CardDialog
        card={focused}
        slot={focused ? slots.indexOf(focused.id) : -1}
        full={selected === null && slots.every(Boolean)}
        onClose={() => setFocus(null)}
        onToggle={(c) => {
          if (slots.includes(c.id)) clear(slots.indexOf(c.id));
          else pick(c.id);
          setFocus(null);
        }}
      />

      <section className="eq-pick" aria-label="Ma collection">
        <h2 className="eq-h">Ma collection <small>{num.format(filtered.length)} carte{filtered.length > 1 ? "s" : ""}</small></h2>
        <div className="eq-filters">
          <input type="search" placeholder="Nom ou anime…" value={q} onChange={(e) => { setQ(e.target.value); setShown(MAX_SHOWN); }} aria-label="Rechercher" />
          <select value={rarity} onChange={(e) => { setRarity(e.target.value as Rarity | ""); setShown(MAX_SHOWN); }} aria-label="Rareté">
            <option value="">Toutes raretés</option>
            {RARITIES.map((r) => <option key={r} value={r}>{RARITY_NAMES[r]}</option>)}
          </select>
          <select value={type} onChange={(e) => { setType(e.target.value as CardType | ""); setShown(MAX_SHOWN); }} aria-label="Type">
            <option value="">Tous types</option>
            {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t].name}</option>)}
          </select>
        </div>
        {cards.length === 0 && <p className="vt-muted">Ta collection est vide : ouvre des paquets pour commencer.</p>}
        <ul className="eq-grid">
          {filtered.slice(0, shown).map((c) => {
            const at = slots.indexOf(c.id);
            return (
              <li key={c.id} className="eq-card" data-rarity={c.rarity} data-in={at >= 0 || undefined}>
                <button type="button" onClick={() => setFocus(c.id)} aria-label={`Voir les sorts de ${c.name}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
                  <span className="eq-name">{c.name}</span>
                  <small><TypeIcon type={c.type} /> {RARITY_NAMES[c.rarity]}{c.stars > 0 ? ` · ${c.stars}★` : ""}</small>
                  <small className="eq-sp">★ {spellOf(c.characterId, c.rarity, c.type)?.name ?? "Pas de sort perso"}</small>
                  {at >= 0 && <span className="eq-badge">Emplacement {at + 1}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        {filtered.length > shown && (
          <button type="button" className="bt-btn" onClick={() => setShown((n) => n + MAX_SHOWN)}>Voir plus ({filtered.length - shown} restantes)</button>
        )}
      </section>
    </div>
  );
}
