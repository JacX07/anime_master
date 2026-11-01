import { ResourceArt } from "@/components/ResourceArt";
import { COMMON_RESOURCE, DAILY_FULL_UNITS, REDUCED_RATE, RESOURCE_NAMES, storyLootPreview, universeOf } from "@/lib/story";

export function StoryDrops({ universeKey, level, cleared }: { universeKey: string; level: number; cleared: boolean }) {
  const universe = universeOf(universeKey);
  if (!universe) return null;
  const loot = storyLootPreview(universe, level, !cleared);
  return (
    <section className="hs-drops" aria-label="Ressources et taux de butin du combat">
      <h4>Butin à la victoire · {cleared ? "Rejeu" : "Première victoire"}</h4>
      <p>{loot.minUnits === loot.units ? `${loot.units} unités d’éveil à répartir.` : `${loot.minUnits} à ${loot.units} unités d’éveil à répartir, selon le plafond quotidien.`}</p>
      <ul>
        {[universe.resource, COMMON_RESOURCE].map((key) => <li key={key}>
          <ResourceArt resource={key} size={24} />
          <span>{RESOURCE_NAMES[key]}<small>0 à {loot.units} unités</small></span>
          <b>50 % par unité</b>
        </li>)}
        {loot.weapon > 0 && <li><ResourceArt resource={universe.weaponResource} size={24} /><span>{RESOURCE_NAMES[universe.weaponResource]}<small>Ressource d’arme · ×{loot.weapon}</small></span><b>100 %</b></li>}
        {loot.ryo > 0 && <li><ResourceArt resource="ryo" size={24} /><span>Ryō<small>×{loot.ryo}</small></span><b>100 %</b></li>}
        {loot.crystals > 0 && <li><ResourceArt resource="cristal" size={24} /><span>Cristaux<small>×{loot.crystals}</small></span><b>100 %</b></li>}
      </ul>
      <p>Chaque unité est tirée séparément : le partage 50/50 n’est pas garanti sur un combat.</p>
      {!cleared && <p>Bonus de première victoire inclus : ×{level === 15 ? 10 : 3} sur les unités d’éveil. Aucun plafond.</p>}
      <p>Rejeu : {DAILY_FULL_UNITS} unités par jour au taux plein, puis {REDUCED_RATE * 100} % des quantités, arrondies. Le plafond ne réduit pas les chances 50/50{loot.weapon > 0 ? " ni la ressource d’arme garantie" : ""}.</p>
    </section>
  );
}
