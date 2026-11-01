// Vérification de Jin-U Seong UR : Arise (zombies liés), Domaine du monarque (riposte d'ombre).
// Usage : npm run check:jinwoo
import { battle, seededRandom, type BattleCard, type BattleEvent } from "../src/lib/battle";

let failures = 0;
const check = (label: string, ok: boolean, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
};
const card = (characterId: number, attack: number, defense: number, over: Partial<BattleCard> = {}): BattleCard => ({
  characterId, rarity: "UR", type: "AVENTURE", attack, defense, power: 5000, franchiseId: null, ...over,
});

let ariseCount = 0, shadowHits = 0, zombieVanish = 0, doubleArise = 0, badLink = 0;
for (let seed = 1; seed <= 300; seed++) {
  const a = [card(129928, 3600, 2600), card(1, 2500, 2000, { rarity: "SR", type: "COMBAT" }), card(2, 2500, 2000, { rarity: "SR", type: "MAGIE" }), card(3, 2500, 2000, { rarity: "SR", type: "COEUR" })];
  const b = [4, 5, 6, 7].map((id) => card(id, 4200, 2600, { type: "COMBAT" }));
  const { log } = battle(a, b, seededRandom(seed));
  const revives = log.filter((e): e is Extract<BattleEvent, { kind: "revive" }> => e.kind === "revive" && !!e.zombie);
  if (revives.length) ariseCount++;
  if (new Set(revives.map((r) => r.source)).size > 1 || log.filter((e) => e.kind === "action" && e.name === "Arise").length > 1) doubleArise++;
  shadowHits += log.filter((e) => e.kind === "damage" && e.shadow).length;
  // Après la chute de Jin-U (A1), tout zombie relevé doit tomber aussitôt
  const jinKo = log.findIndex((e) => e.kind === "ko" && e.target === "A1");
  if (jinKo >= 0) {
    const live = new Set<string>();
    for (const [i, e] of log.entries()) {
      if (e.kind === "revive" && e.zombie) live.add(e.target);
      if (e.kind === "ko") live.delete(e.target);
      if (i > jinKo + 2 && live.size) badLink++;
      if (i === jinKo + 2 && revives.length && !live.size) zombieVanish++;
    }
  }
}
check("Arise relève les morts en zombies", ariseCount > 0, `${ariseCount}/300 combats`);
check("Arise une seule fois par combat", doubleArise === 0);
check("Les ombres ripostent", shadowHits > 0, `${shadowHits} ripostes`);
check("Les zombies disparaissent avec Jin-U", badLink === 0 && zombieVanish > 0, `${zombieVanish} disparitions, ${badLink} écart(s)`);
console.log(failures ? `\n${failures} échec(s)` : "\nTout est bon.");
process.exit(failures ? 1 : 0);
