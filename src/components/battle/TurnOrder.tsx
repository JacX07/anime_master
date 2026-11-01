import type { UnitId, UnitView } from "@/lib/battle";
import type { PlayerCharacter } from "./BattlePlayer";

export function TurnOrder({ order, info, characters, onPick, ended }: { order: UnitId[]; info: Partial<Record<UnitId, UnitView>>; characters: Record<number, PlayerCharacter>; onPick: (id: UnitId) => void; ended: boolean }) {
  return <aside className="bt-turn-order" aria-label="Ordre de passage">
    <h2>Ordre</h2><ol>{order.map((id, index) => {
      const unit = info[id]; if (!unit) return null;
      const character = characters[unit.characterId];
      return <li key={`${id}-${index}`} data-side={id[0]} data-current={index === 0 || undefined}>
        <button type="button" onClick={() => onPick(id)} aria-label={`${index === 0 ? "Action en tête" : `Position ${index + 1}`} : ${character?.name ?? id}, ${id[0] === "A" ? "allié" : "adversaire"}`} title={character?.name ?? id}>
          <span className="bt-turn-number">{index + 1}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {character?.imageUrl ? <img src={character.imageUrl} alt="" referrerPolicy="no-referrer" /> : <span className="bt-turn-fallback">{character?.name.charAt(0) ?? "?"}</span>}
          <span className="bt-turn-name">{character?.name ?? id}</span>
          {index === 0 && <span className="bt-turn-now">En tête</span>}
        </button>
      </li>;
    })}</ol>{!order.length && <small>{ended ? "Terminé" : "En attente"}</small>}
  </aside>;
}
