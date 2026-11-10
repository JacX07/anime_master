"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { CharacterCard } from "@/components/CharacterCard";
import { combatPowers } from "@/lib/combat-power";
import type { BattleCard } from "@/lib/battle";
import type { TeamContext } from "@/lib/team-context";
import { RARITY_NAMES } from "@/lib/labels";
import type { Rarity } from "@/generated/prisma/enums";
import { closeOnBackdrop } from "@/lib/dialog";
import type { ModeTeam } from "./useModeTeam";
import "@/app/histoire/histoire.css";
import { EnergyMeter } from "./EnergyMeter";
import { CardFilterBar, RoleTags, useCardFilter, useFavorites } from "./CardFilters";
import { SpellList } from "@/app/equipe/TeamBuilder";

export type PrepCard = TeamContext["ownedCards"][number];
export type PrepEnemy = { id: string; name: string; imageUrl: string; combat: BattleCard };
const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

function Card({ card, power }: { card: PrepEnemy | PrepCard; power?: number }) {
  return <CharacterCard {...card.combat} power={power ?? combatPowers([card.combat])[0]} powerTitle="Puissance de combat" name={card.name} imageUrl={card.imageUrl} stars={"stars" in card ? card.stars : undefined} finish={"finish" in card ? card.finish : undefined}/>;
}

/**
 * Écran de préparation commun à l'histoire, la Tour, les donjons et les raids : ton équipe contre les ennemis,
 * cartes à remplacer, squads à charger, composition automatique. Chaque mode garde sa propre composition (`useModeTeam`).
 */
export function TeamPreparation({ title, subtitle, team, context, enemies, hiddenEnemies, enemyLabel, allowDuo = false, energy = false, footer, notes, onBack }: {
  title: string; subtitle: string; team: ModeTeam; context: TeamContext;
  /** Ennemis connus ; sinon `hiddenEnemies` (raretés seulement, Tour). */
  enemies?: PrepEnemy[]; hiddenEnemies?: Rarity[]; enemyLabel?: (card: PrepEnemy, i: number) => string;
  allowDuo?: boolean; /** Le combat coûte 1 énergie (histoire, donjons) */ energy?: boolean; footer: ReactNode; notes?: ReactNode; onBack: () => void;
}) {
  const { ownedCards, squads } = context;
  const { slots, size, pending, error } = team;
  const [slot, setSlot] = useState<number | null>(null);
  const favs = useFavorites(context.favorites);
  const filterable = ownedCards.map((c) => ({ ...c, characterId: c.combat.characterId, rarity: c.combat.rarity, type: c.combat.type }));
  const pick = useCardFilter(filterable, favs);
  const [spellCard, setSpellCard] = useState<(typeof filterable)[number] | null>(null);
  const spellDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (spellCard) spellDialog.current?.showModal(); else spellDialog.current?.close(); }, [spellCard]);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    if (slot !== null) dialog.current?.showModal();
    else dialog.current?.close();
  }, [slot]);
  const cards = slots.map((id) => ownedCards.find((c) => c.id === id));
  const active = cards.slice(0, size).filter((c): c is PrepCard => !!c);
  const powers = combatPowers(active.map((c) => c.combat));
  const enemyPowers = enemies ? combatPowers(enemies.map((c) => c.combat)) : [];
  return <section className="hs-preparation" aria-label="Préparation du combat">
    <header className="hs-prep-heading"><div><h2 ref={heading} tabIndex={-1}>{title}</h2><p>{subtitle}</p></div><button type="button" className="ui-button" disabled={pending} onClick={onBack}>Retour</button></header>
    <div className="hs-prep-toolbar">
      {allowDuo && <div className="hs-actions" role="group" aria-label="Taille de l’équipe"><button type="button" className="ui-button text-action" disabled={pending} aria-pressed={!team.duo} onClick={() => team.changeDuo(false)}>Équipe · 4 cartes</button><button type="button" className="ui-button text-action" disabled={pending} aria-pressed={team.duo} onClick={() => team.changeDuo(true)}>Duo · 2 cartes</button></div>}
      <div className="hs-actions">
        {squads.length > 0 && <label className="hs-squad-load">Charger une squad
          <select value="" disabled={pending} onChange={(e) => { const s = squads.find((x) => x.id === e.target.value); if (s) team.loadSquad(s.slots); }}>
            <option value="">Choisir…</option>
            {squads.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.slots.filter(Boolean).length}/4)</option>)}
          </select>
        </label>}
        <button type="button" className="ui-button" disabled={pending} onClick={team.autoTeam}>Composition automatique</button>
      </div>
    </div>
    <div className="hs-vs-layout"><section aria-label="Ton équipe"><header className="hs-camp-head"><h3>Ton équipe</h3><strong>Puissance {fmt(powers.reduce((sum, n) => sum + n, 0))}</strong>{team.budget !== null && size === 4 && <strong data-over={team.budgetError ? true : undefined} title="Budget d’équipe : UR 8, SSR 5, SR 3, R 2, N 1">Budget {team.cost}/{team.budget}</strong>}</header><div className="hs-prep-cards">{cards.map((card, i) => <button key={i} type="button" className={`hs-card-choice${i >= size ? " is-reserve" : ""}`} disabled={pending || i >= size} aria-label={`${card?.name ?? `Emplacement ${i + 1}`}, ${i >= size ? "en réserve" : "changer ce compagnon"}`} onClick={() => { pick.reset(); setSlot(i); }}>
      {card ? <Card card={card} power={i < size ? powers[active.indexOf(card)] : undefined}/> : <span className="hs-empty-slot"><Icon name="squads"/><b>{i === 0 ? "Leader" : `Poste ${i + 1}`}</b><span>Choisir un compagnon</span></span>}<small>{i >= size ? "En réserve" : "Changer"}</small>
    </button>)}</div></section><span className="hs-vs-label" aria-label="contre">VS</span><section aria-label="Ennemis"><header className="hs-camp-head"><h3>Ennemis</h3>{enemies && <strong>Puissance {fmt(enemyPowers.reduce((sum, n) => sum + n, 0))}</strong>}</header><div className="hs-prep-cards">
      {enemies ? enemies.map((card, i) => <div key={card.id} className="hs-enemy-card"><Card card={card} power={enemyPowers[i]}/><small>{enemyLabel ? enemyLabel(card, i) : card.combat.boss ? "Boss" : "Sbire"}</small></div>)
        : (hiddenEnemies ?? []).map((r, i) => <div key={i} className="hs-enemy-card"><span className="hs-empty-slot"><Icon name="squads"/><b>{RARITY_NAMES[r]}</b><span>Inconnu jusqu’au combat</span></span></div>)}
    </div></section></div>
    <p className="hs-team-note" role="status">{pending ? "Chargement…" : "Clique une carte pour la remplacer. Cette composition est propre à ce mode et reste en mémoire."}</p>
    {error && <p className="hs-error" role="alert">{error}</p>}
    {team.budgetError && <p className="hs-error" role="alert">{team.budgetError}</p>}
    <footer className="hs-prep-footer">{energy && <EnergyMeter energy={context.energy} />}{footer}</footer>
    {!team.ready && !team.budgetError && <p className="hs-team-note">Choisis {size} personnages différents pour combattre.</p>}
    {notes}
    <dialog ref={dialog} className="hs-picker" aria-labelledby="hs-picker-title" onCancel={() => setSlot(null)} onClose={() => setSlot(null)} onClick={closeOnBackdrop}><header><h2 id="hs-picker-title">Choisir un compagnon</h2><button type="button" className="ui-button text-action" onClick={() => setSlot(null)}>Fermer</button></header><CardFilterBar filter={pick} /><div className="hs-picker-grid">{pick.filtered.map((card) => {
      const used = cards.some((c, i) => i !== slot && c?.combat.characterId === card.combat.characterId);
      return <div key={card.id} className="squad-pick-item"><button type="button" className="hs-card-choice" disabled={used || pending} aria-pressed={slot !== null && slots[slot] === card.id} aria-label={`Choisir ${card.name}${used ? ", déjà dans l’équipe" : ""}`} onClick={() => { if (slot !== null) team.choose(slot, card.id); setSlot(null); }}><Card card={card}/>{favs.has(card.characterId) && <span className="fav-badge" aria-hidden="true">★</span>}<small>{used ? "Déjà dans l’équipe" : card.name}</small></button>
        <div className="squad-pick-meta"><RoleTags roles={pick.roles.get(card.characterId)!} /><button type="button" className="ui-button" onClick={() => setSpellCard(card)}>Sorts</button></div></div>;
    })}</div>{!pick.filtered.length && ownedCards.length > 0 && <p>Aucune carte ne correspond.</p>}{!ownedCards.length && <p>Ouvre un booster pour recruter tes premiers compagnons.</p>}</dialog>
    <dialog ref={spellDialog} className="hs-picker hs-spells" aria-label={spellCard ? `Sorts de ${spellCard.name}` : undefined} onClose={() => setSpellCard(null)} onClick={closeOnBackdrop}>{spellCard && <><header><h2>Sorts · {spellCard.name}</h2><button type="button" className="ui-button text-action" onClick={() => setSpellCard(null)}>Fermer</button></header><SpellList card={spellCard} /></>}</dialog>
  </section>;
}
