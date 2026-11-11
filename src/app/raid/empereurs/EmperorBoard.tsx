"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getBattlePreviewAction, startBattleAction } from "@/app/battle-actions";
import { ResourceArt } from "@/components/ResourceArt";
import { LiveBattle } from "@/components/battle/LiveBattle";
import { TeamPreparation, type PrepEnemy } from "@/components/team/TeamPreparation";
import { useModeTeam } from "@/components/team/useModeTeam";
import type { BattleView } from "@/lib/battles";
import { emperorKey, HARDCORE_KEY } from "@/lib/emperors";
import { RESOURCE_NAMES } from "@/lib/story";
import type { getEmperorState } from "@/lib/battles";
import type { TeamContext } from "@/lib/team-context";
import "../../histoire/histoire.css";
import "../raid.css";

type State = Awaited<ReturnType<typeof getEmperorState>>;
interface Target { boss: string; name: string; difficulty: string }

export function EmperorBoard({ state, portraits, context, storageKey }: { state: State; portraits: Record<number, string>; context: TeamContext; storageKey: string }) {
  const router = useRouter();
  const squad = useModeTeam(storageKey, context, false, false);
  const { pending, start, error, setError } = squad;
  const [prep, setPrep] = useState<{ target: Target; enemies: PrepEnemy[] } | null>(null);
  const [fight, setFight] = useState<{ battle: BattleView; target: Target; auto: boolean } | null>(null);
  const diffName = (key: string) => state.difficulties.find((d) => d.key === key)?.name ?? key;

  function prepare(target: Target) {
    setError(null);
    start(async () => {
      const res = await getBattlePreviewAction(emperorKey(target.boss, target.difficulty));
      if (!res.ok) return setError(res.error);
      setPrep({ target, enemies: res.cards });
    });
  }
  function run(target: Target) {
    setError(null);
    start(async () => {
      const res = await startBattleAction(emperorKey(target.boss, target.difficulty), true, squad.selectedIds);
      if (!res.ok) return setError(res.error);
      setPrep(null);
      setFight({ battle: res.battle, target, auto: localStorage.getItem("bt-auto") !== "off" });
    });
  }

  if (fight) {
    return <section className="hs-fight">
      <LiveBattle
        key={fight.battle.id}
        initial={fight.battle}
        initialAuto={fight.auto}
        music="raid"
        names={{ A: "Ton équipe", B: fight.target.name }}
        title={`${fight.target.name} (${diffName(fight.target.difficulty)})`}
        onExit={() => setFight(null)}
        abandonOnExit
        onEnd={() => router.refresh()}
        renderEnd={(battle) => {
          const gains = Object.entries(battle.loot?.resources ?? {}).filter(([, n]) => n > 0);
          return <div className="hs-result" role="status">
            <b>{battle.winner === "A" ? `${fight.target.name} est vaincu !` : "Il tient bon. Aucune récompense légendaire sans la victoire."}</b>
            {gains.length > 0 && <ul>{gains.map(([key, n]) => <li key={key}><ResourceArt resource={key} />+{n} {RESOURCE_NAMES[key] ?? key}</li>)}</ul>}
            <div className="hs-actions"><button type="button" className="bt-btn" onClick={() => setFight(null)}>Retour au Défi</button></div>
            {error && <p className="hs-error" role="alert">{error}</p>}
          </div>;
        }}
      />
    </section>;
  }

  if (prep) {
    const t = prep.target;
    return <TeamPreparation title={t.name} subtitle={`Difficulté ${diffName(t.difficulty)} · ${t.boss === HARDCORE_KEY ? "les quatre empereurs ensemble" : "deux vagues d’équipage, puis l’empereur (dernière vague montrée)"}`}
      team={squad} context={context} enemies={prep.enemies} energy enemyLabel={(c) => c.combat.boss ? "Empereur" : "Équipage"} onBack={() => { setPrep(null); setError(null); }}
      footer={<button type="button" className="ui-button hs-fight-button" disabled={pending || !squad.ready} onClick={() => run(t)}>{pending ? "Chargement…" : "Combattre"}</button>} />;
  }

  return <>
    {!state.tutorial && <p className="hs-error" role="status">Termine d’abord le tutoriel de l’histoire pour ouvrir le raid.</p>}
    {error && <p className="hs-error" role="alert">{error}</p>}
    <div className="rd-emperors">
      {state.emperors.map((e) => <section key={e.key} className="rd-boss" aria-label={e.name}>
        {portraits[e.characterId] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={portraits[e.characterId]} alt={e.name} referrerPolicy="no-referrer" />
        )}
        <div>
          <h2 className="hs-h">{e.name}</h2>
          <p className="vt-muted">{e.blurb}</p>
          <p><ResourceArt resource={e.resource} size={28} />{e.resourceName} : <b>{e.resources}</b> · {e.keyName} : <b>{e.keys}</b></p>
          {e.clearedToday ? <p role="status">Vaincu aujourd’hui : reviens demain.</p> : <div className="hs-actions" role="group" aria-label={`Difficultés de ${e.name}`}>
            {state.difficulties.map((d) => <button key={d.key} type="button" className="ui-button" disabled={pending || !state.tutorial || !d.unlocked} onClick={() => prepare({ boss: e.key, name: e.name, difficulty: d.key })}>{d.name}</button>)}
          </div>}
        </div>
      </section>)}
      <section className="rd-boss" aria-label="Hardcore">
        <div>
          <h2 className="hs-h">Hardcore : les quatre empereurs</h2>
          <p className="vt-muted">Une clé de chaque empereur, consommées à la victoire. Récompense : deux ressources légendaires parmi les quatre.</p>
          <p>Jeux de clés complets : <b>{state.hardcore.keys}</b></p>
          {state.hardcore.clearedToday ? <p role="status">Vaincu aujourd’hui : reviens demain.</p> : <div className="hs-actions" role="group" aria-label="Difficultés du Hardcore">
            {state.difficulties.map((d) => <button key={d.key} type="button" className="ui-button" disabled={pending || !state.tutorial || !d.unlocked || state.hardcore.keys < 1} onClick={() => prepare({ boss: HARDCORE_KEY, name: "Les quatre empereurs", difficulty: d.key })}>{d.name}</button>)}
          </div>}
        </div>
      </section>
    </div>
    <p className="hs-team-note">Cœurs de brèche : {state.fullHeartsLeft} au taux plein aujourd’hui, comme au raid. Chaque passage coûte 1 énergie (rendue en cas de défaite).</p>
  </>;
}
