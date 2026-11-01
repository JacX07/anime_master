const labels: Record<string, string> = {
  hp: "PV", attack: "ATK", defense: "DEF", flatHp: "PV", flatAttack: "ATK", flatDefense: "DEF",
  crit: "Chance de critique", critDamage: "Dégâts critiques", speed: "Vitesse", dodge: "Esquive",
};
const percentStats = new Set(["hp", "attack", "defense", "crit", "critDamage", "dodge"]);
const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export const artifactStatLabel = (stat: string) => labels[stat] ?? stat;
export const artifactStatValue = (stat: string, value: number) =>
  `+${number.format(percentStats.has(stat) ? value * 100 : value)}${percentStats.has(stat) ? " %" : ""}`;
