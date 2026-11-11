// Armes légendaires des empereurs (docs/specs/raid-empereurs.md) : Griffon, Murakumogiri, Hassaikai, Napoléon. Sans base.
// Usage : npm run check:emperor-weapons
import { battle, seededRandom, type BattleCard, type BattleEvent } from "../src/lib/battle";
import { weaponDef } from "../src/lib/weapons";

let failures = 0;
function check(label: string, ok: boolean, detail = "") { if (!ok) failures++; console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`); }

const base = (id: number, over: Partial<BattleCard> = {}): BattleCard => ({
  characterId: id, rarity: "UR", type: "COMBAT", attack: 4000, defense: 2500, power: 1, franchiseId: 21, speed: 100, stars: 5, ...over,
});
const withWeapon = (cards: BattleCard[], key: string | null) => cards.map((c) => (key ? { ...c, weapon: weaponDef(key)!.weapon } : c));
const sim = (a: BattleCard[], b: BattleCard[], n = 120) => {
  const logs: BattleEvent[][] = [];
  for (let seed = 1; seed <= n; seed++) logs.push(battle(a, b, seededRandom(seed), { gauge: true }).log);
  return logs;
};
const events = (logs: BattleEvent[][]) => logs.flat();
const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

const foes = () => [1, 2, 3, 4].map((i) => base(9000 + i, { type: "MYSTERE", attack: 3500, defense: 3000 }));
const squad = (ids: number[], over: Partial<BattleCard> = {}) => ids.map((id) => base(id, over));

// Définitions
for (const key of ["griffon", "murakumogiri", "hassaikai", "napoleon"]) check(`Arme définie : ${key}`, !!weaponDef(key));
check("Griffon : ATK et vitesse +10 %", weaponDef("griffon")!.weapon.stats?.attack === 0.1 && weaponDef("griffon")!.weapon.stats?.speed === 0.1 && weaponDef("griffon")!.weapon.stat === 0);

// Griffon : peur
const griffon = events(sim(withWeapon(squad([201, 202, 203, 204]), "griffon"), foes()));
const plain = events(sim(squad([201, 202, 203, 204]), foes()));
const fearOn = griffon.filter((e) => e.kind === "status" && e.status === "fear" && e.on && e.target.startsWith("B")).length;
const missesB = (evs: BattleEvent[]) => evs.filter((e) => e.kind === "dodge" && e.source.startsWith("B")).length;
check("Griffon : l'adversaire touché reçoit Peur", fearOn > 50, `${fearOn} peurs`);
check("Griffon : un effrayé rate des coups, pas sans l'arme", missesB(griffon) > 20 && missesB(plain) === 0, `${missesB(griffon)} ratés contre ${missesB(plain)}`);

// Murakumogiri : coups physiques doublés
const dmgFrom = (evs: BattleEvent[], side: string) => evs.filter((e): e is Extract<BattleEvent, { kind: "damage" }> => e.kind === "damage" && e.source.startsWith(side) && !e.shadow).map((e) => e.amount);
const muraka = mean(dmgFrom(events(sim(withWeapon(squad([211, 212, 213, 214]), "murakumogiri"), foes())), "A"));
const nomura = mean(dmgFrom(events(sim(squad([211, 212, 213, 214]), foes())), "A"));
check("Murakumogiri : dégâts physiques nettement plus hauts", muraka / nomura > 1.45, `×${(muraka / nomura).toFixed(2)}`);

// Hassaikai : réduction cumulable
const tank = withWeapon(squad([221, 222, 223, 224], { type: "AVENTURE" }), "hassaikai");
const tankless = squad([221, 222, 223, 224], { type: "AVENTURE" });
const taken = mean(dmgFrom(events(sim(foes(), tank)), "A"));
const takenBase = mean(dmgFrom(events(sim(foes(), tankless)), "A"));
check("Hassaikai : dégâts reçus réduits", taken / takenBase < 0.8, `×${(taken / takenBase).toFixed(2)}`);

// Napoléon : foudre/feu doublés, autres éléments appliquent aussi le feu
const stormA = withWeapon(squad([13, 68, 6, 6], { type: "MAGIE" }), "napoleon");
const burns = (evs: BattleEvent[]) => evs.filter((e) => e.kind === "status" && e.status === "burn" && e.on && e.target.startsWith("B")).length;
const noStorm = squad([13, 68, 6, 6], { type: "MAGIE" });
const sA = events(sim(stormA, foes())), sB = events(sim(noStorm, foes()));
check("Napoléon : dégâts de foudre et de feu doublés", mean(dmgFrom(sA, "A")) / mean(dmgFrom(sB, "A")) > 1.2, `×${(mean(dmgFrom(sA, "A")) / mean(dmgFrom(sB, "A"))).toFixed(2)}`);
const waterOnly = [6, 6, 6, 6];
const wBurn = burns(events(sim(withWeapon(squad(waterOnly, { type: "MAGIE" }), "napoleon"), foes())));
const nBurn = burns(events(sim(squad(waterOnly, { type: "MAGIE" }), foes())));
check("Napoléon : un sort d'eau applique aussi le feu", wBurn > 20 && nBurn === 0, `${wBurn} brûlures contre ${nBurn}`);

console.log(failures ? `\n${failures} vérification(s) en échec.` : "\nArmes des empereurs conformes.");
process.exitCode = failures ? 1 : 0;
