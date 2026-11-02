"use client";
import { combatPowers } from "@/lib/combat-power";
import { BATTLE, createBattle, type BattleCard } from "@/lib/battle";
import { sumArtifactStats } from "@/lib/artifact-stats";
import { weaponDef } from "@/lib/weapons";
import type { TeamCard } from "./TeamBuilder";
import type { getPlayerInventory } from "@/lib/player-inventory";
import { Icon } from "@/components/icons";
import { DUNGEONS } from "@/lib/dungeons";

const STAT_ICONS: Record<string, string> = { Puissance: "puissance", PV: "hp", "Compétence magique": "magie", ATK: "atk", DEF: "def", Vitesse: "speed", "Chance de critique": "eveil", "Dégâts critiques": "puissance", Esquive: "speed" };

export function StatisticsPanel({ card, team, inventory }: { card: TeamCard; team: TeamCard[]; inventory: Awaited<ReturnType<typeof getPlayerInventory>> }) {
  const context = team.some((member) => member.id === card.id) ? team : [card];
  const battleCards: BattleCard[] = context.map((member) => ({ characterId: member.characterId, attack: member.attack, defense: member.defense, type: member.type, rarity: member.rarity, power: 0,
    speed: member.speed, stars: member.stars, franchiseId: member.franchiseId, weapon: weaponDef(member.weaponKey ?? "")?.weapon ?? null,
    artifactStats: sumArtifactStats(inventory.items.flatMap((item) => item.artifact?.equippedCard?.id === member.id ? [item.artifact] : [])) }));
  const prepared = createBattle(battleCards, [], () => 0.5, { spells: false, combos: false }).teams.A;
  const index = context.findIndex((member) => member.id === card.id);
  const unit = prepared[index];
  const gear = battleCards[index].artifactStats!;
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  const percent = (n: number) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(n * 100)} %`;
  const number = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(n);
  const rows = [
    ["Puissance", number(combatPowers([{ ...battleCards[index], stars: 0, weapon: null, artifactStats: undefined }])[0]), number(combatPowers(battleCards)[index])],
    ["PV", number(BATTLE.hp(card.attack, card.defense)), number(unit.maxHp)],
    ["Compétence magique", "0 %", percent(gear.magicSkill ?? 0)],
    ["ATK", number(card.attack), number(unit.atk)],
    ["DEF", number(card.defense), number(unit.def)],
    ["Vitesse", number(card.speed), number(unit.speed)],
    ["Chance de critique", percent(BATTLE.critRate), percent(clamp(BATTLE.critRate + gear.crit))],
    ["Dégâts critiques", percent(BATTLE.critDamage), percent(BATTLE.critDamage + gear.critDamage)],
    ["Esquive", "0 %", percent(clamp(unit.dodge + gear.dodge))],
  ];
  const owned = inventory.items.flatMap((item) => item.artifact ? [item.artifact] : []);
  const sets = DUNGEONS.flatMap((d) => {
    const mine = owned.filter((a) => a.setKey === d.key);
    if (!mine.length) return [];
    const worn = mine.filter((a) => a.equippedCard?.id === card.id).length;
    const tiers = d.bonus.split(/\s+(?=4 pièces)/);
    const next = worn < 2 ? 2 : worn < 4 ? 4 : 0;
    return [{ key: d.key, name: d.universe, worn, slots: new Set(mine.map((a) => a.slot)).size, tiers, next }];
  });
  return <section className="eq-statistics"><h2 className="eq-h">Statistiques détaillées</h2><details><summary>Comment c’est calculé</summary><p>Valeurs au début du combat, avec l’éveil, l’arme, les artefacts, les sets et les synergies de l’équipe affichée. La puissance valorise l’ATK, les PV, la DEF, les critiques, l’esquive et les stats spéciales. La vitesse contribue au score et multiplie sa valeur totale. Les effets temporaires des sorts ne sont pas inclus. Compétence magique augmente les dégâts des seuls sorts marqués magiques.</p></details>
    <table><thead><tr><th scope="col">Statistique</th><th scope="col">Base</th><th scope="col">En combat</th></tr></thead><tbody>{rows.map(([label, base, total]) => <tr key={label}><th scope="row"><Icon name={STAT_ICONS[label]} /> {label}</th><td>{base}</td><td>{total}</td></tr>)}</tbody></table>
    {sets.length > 0 && <div className="eq-sets"><h3>Bonus de set</h3><ul>{sets.map((set) => <li key={set.key} data-active={set.worn >= 2 || undefined}>
      <b>{set.name}</b> <span>{set.worn}/4 portés · {set.slots}/4 emplacements possédés{set.next ? ` · encore ${set.next - set.worn} pour le bonus ${set.next} pièces` : " · set complet"}</span>
      {set.tiers.map((tier, i) => <p key={i} data-on={(i === 0 ? set.worn >= 2 && set.worn < 4 : set.worn >= 4) || undefined}>{tier}</p>)}
    </li>)}</ul></div>}
    {!team.some((member) => member.id === card.id) && <p>Cette carte n’est pas dans l’équipe affichée : calcul individuel, sans synergie d’équipe.</p>}
    <small>L’esquive de l’arme s’applique aux sorts affiliés ; celle des artefacts s’applique aux coups esquivables.</small>
  </section>;
}
