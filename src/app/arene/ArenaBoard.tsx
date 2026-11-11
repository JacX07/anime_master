"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BattlePlayer, type PlayerCharacter } from "@/components/battle/BattlePlayer";
import type { ArenaView } from "@/lib/arena";
import type { BattleEvent, Spell, UnitId } from "@/lib/battle";
import { arenaJoinAction, arenaLeaveAction, arenaPlayAction, arenaPollAction } from "./arena-actions";

const POLL_MS = 1500;
const HIDDEN_POLL_MS = 5000;

interface Props {
  initial: ArenaView | null;
  elo: number;
  name: string;
  team: { names: string[]; complete: boolean; cost: number };
  budget: number;
}

/** Chrono de l'action en cours : l'heure du serveur sert de référence (l'horloge du navigateur peut dériver). */
function Countdown({ deadline, offset, mine }: { deadline: string; offset: number; mine: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(id); }, []);
  const left = Math.max(0, Math.ceil((Date.parse(deadline) - (now + offset)) / 1000));
  return <span className="arena-timer" data-mine={mine || undefined} data-low={left <= 5 || undefined} role="timer" aria-label={`${left} secondes restantes`}>
    {mine ? "À toi" : "Adversaire"} · {left} s
  </span>;
}

export function ArenaBoard({ initial, elo, name, team, budget }: Props) {
  const [view, setView] = useState<ArenaView | null>(initial);
  const [log, setLog] = useState<BattleEvent[]>(initial?.log ?? []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const logLen = useRef(initial?.log.length ?? 0);
  const viewRef = useRef(view);
  const [clockOffset, setClockOffset] = useState(0);
  const inflight = useRef(false);

  /** Applique une réponse du serveur ; une réponse plus ancienne que l'état affiché est ignorée. */
  const apply = useCallback((next: ArenaView | null, from: number) => {
    if (!next) { viewRef.current = null; logLen.current = 0; setView(null); setLog([]); return; }
    const cur = viewRef.current;
    const sameMatch = cur?.id === next.id;
    if (sameMatch && next.steps < cur.steps) return;
    setClockOffset(Date.parse(next.serverNow) - Date.now());
    if (!sameMatch) { logLen.current = next.log.length; setLog(next.log); }
    else if (from === logLen.current && next.log.length) { logLen.current += next.log.length; setLog((l) => [...l, ...next.log]); }
    viewRef.current = next;
    setView(next);
  }, []);

  const poll = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    const from = logLen.current;
    try {
      const res = await arenaPollAction(viewRef.current?.id ?? null, from);
      if (res.ok) apply(res.view, from);
    } finally { inflight.current = false; }
  }, [apply]);

  const active = view?.status === "QUEUED" || view?.status === "RUNNING";
  useEffect(() => {
    if (!active) return;
    // Onglet masqué : on sonde plus lentement (le serveur fait jouer l'automatique à la place d'un absent, mais seule une sonde le déclenche)
    let last = 0;
    const id = setInterval(() => {
      const now = Date.now();
      if (document.hidden && now - last < HIDDEN_POLL_MS) return;
      last = now;
      void poll();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [active, poll]);

  const join = async () => {
    setBusy(true); setError(null);
    const res = await arenaJoinAction();
    setBusy(false);
    if (!res.ok) return setError(res.error);
    apply(res.view, 0);
  };

  const leave = async () => {
    if (!view) return;
    setBusy(true);
    const res = await arenaLeaveAction(view.id);
    if (!res.ok) { setBusy(false); return setError(res.error); }
    if (view.status === "QUEUED") { setBusy(false); apply(null, 0); return; }
    const from = logLen.current;
    const polled = await arenaPollAction(view.id, from);
    setBusy(false);
    // Le match abandonné est terminé : on relit son résultat
    if (polled.ok && polled.view) apply(polled.view, from);
  };

  const play = async (spell: Spell, target: UnitId | null) => {
    if (!view) return;
    setBusy(true); setError(null);
    const from = logLen.current;
    const res = await arenaPlayAction(view.id, spell, target, view.steps, from);
    setBusy(false);
    if (!res.ok) { setError(res.error); void poll(); return; }
    apply(res.view, from);
  };

  // Lobby : aucun match en cours
  if (!view) {
    const over = team.cost > budget;
    return <section className="arena-lobby" aria-label="Lobby de l’arène">
      <div><p className="vt-muted">Ton Elo</p><strong className="arena-elo">{elo}</strong></div>
      <div>
        <h2>Ton équipe d’attaque</h2>
        {team.complete
          ? <ul className="arena-team">{team.names.map((n) => <li key={n}>{n}</li>)}</ul>
          : <p className="vt-muted">Ton équipe doit compter 4 cartes (page Squads).</p>}
        <p className={over ? "arena-over" : "vt-muted"}>Budget {team.cost}/{budget}{over ? " : trop élevé, retire une carte rare." : ""}</p>
      </div>
      <div className="arena-queue">
        <button type="button" className="ui-button" onClick={join} disabled={busy || !team.complete || over}>Chercher un adversaire</button>
        <p className="vt-muted">Sans adversaire au bout de 30 s, tu affrontes l’équipe d’un autre joueur jouée par l’automatique. Pas de récompense en Ryō : seulement ton Elo.</p>
      </div>
      {error && <p className="hs-error" role="alert">{error}</p>}
    </section>;
  }

  if (view.status === "QUEUED") {
    return <section className="arena-lobby" aria-label="Recherche d’un adversaire">
      <h2>Recherche d’un adversaire…</h2>
      <p className="vt-muted" role="status">Elo {view.me.elo}. La fenêtre de recherche s’élargit peu à peu ; au bout de 30 s, une équipe fantôme est proposée.</p>
      <button type="button" className="ui-button" onClick={leave} disabled={busy}>Annuler</button>
      {error && <p className="hs-error" role="alert">{error}</p>}
    </section>;
  }

  const characters: Record<number, PlayerCharacter> = {};
  const first = log[0];
  const startedUnits = log.flatMap((e) => (e.kind === "start" || e.kind === "wave" ? e.units : []));
  if (first?.kind === "start") {
    for (const u of startedUnits) {
      const c = view.characters[u.characterId];
      characters[u.characterId] = { name: c?.name ?? "?", imageUrl: c?.imageUrl ?? "", rarity: u.rarity, type: u.type };
    }
  }
  const running = view.status === "RUNNING";
  const mine = view.myTurn;
  return <BattlePlayer
    key={view.id}
    music="pvp"
    log={log}
    characters={characters}
    names={{ A: name, B: view.opponent?.name ?? "Adversaire" }}
    title="Arène live"
    exitHref="/arene"
    onNext={() => apply(null, 0)}
    endExtra={view.eloChange !== null ? <p className="arena-elo-change" role="status">Elo : {view.eloChange > 0 ? "+" : ""}{view.eloChange}</p> : undefined}
    live={{
      actor: mine ? view.actor : null,
      choices: view.choices,
      wait: view.wait,
      timeline: view.timeline,
      busy,
      error,
      onPlay: play,
      auto: false,
      onAutoStep: () => undefined,
      onAbandon: running ? leave : undefined,
      countdown: running && view.deadline ? <Countdown deadline={view.deadline} offset={clockOffset} mine={mine} /> : undefined,
      onNext: () => apply(null, 0),
    }}
  />;
}
