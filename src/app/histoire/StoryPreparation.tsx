"use client";

import { TeamPreparation, type PrepEnemy } from "@/components/team/TeamPreparation";
import type { ModeTeam } from "@/components/team/useModeTeam";
import type { TeamContext } from "@/lib/team-context";
import type { UniverseView } from "./StoryBoard";
import { StoryDrops } from "./StoryDrops";
import { STORY_ART } from "./story-art";

export type StoryEnemy = PrepEnemy;

/** Préparation d'un combat d'histoire : l'écran commun, avec le duo, le butin et la règle des étoiles. */
export function StoryPreparation({ universe, level, enemies, team, context, onBack, onFight }: {
  universe: UniverseView; level: number; enemies: StoryEnemy[]; team: ModeTeam; context: TeamContext; onBack: () => void; onFight: () => void;
}) {
  const art = STORY_ART[universe.key];
  return <TeamPreparation
    title={`Combat ${level}`}
    subtitle={`${universe.name} · ${art?.acts?.[Math.ceil(level / 5)]?.location ?? art?.location} · Acte ${Math.ceil(level / 5)}`}
    team={team} context={context} enemies={enemies} allowDuo energy onBack={onBack}
    footer={<><StoryDrops universeKey={universe.key} level={level} cleared={level <= universe.maxLevel}/><button type="button" className="ui-button hs-fight-button" disabled={team.pending || !team.ready} onClick={onFight}>{team.pending ? "Chargement…" : level <= universe.maxLevel ? "Rejouer" : "Combattre"}</button></>}
    notes={<p className="hs-team-note">Une défaite ne coûte rien. Victoire : 1 étoile · aucun K.-O. : 2 · victoire en duo : 3, même si un personnage tombe.</p>}
  />;
}
