import assert from 'node:assert/strict';
import { applyAction, autoAction, createBattle, currentActor, type BattleCard, type BattleState } from '../src/lib/battle';
const card = (characterId: number): BattleCard => ({ characterId, rarity: 'SSR', type: 'COMBAT', attack: 100, defense: 1000, power: 1, franchiseId: null, noBasicAttack: true, noUltimate: true, noTertiary: true });
const until = (s: BattleState, id: string) => { for (let i=0; currentActor(s)?.id !== id; i++) { assert(i<30); applyAction(s, autoAction(s)); } };
const start = (id: number) => createBattle([card(id)], [card(999999)], () => 0.99, { startingSide: 'A' });
const attack = (s: BattleState) => { until(s, 'A1'); applyAction(s, { spell: 'base', target: 'B1' }); };
const s = start(62);
for(let i=1;i<=6;i++) { attack(s); assert.equal(s.teams.B[0].fx.find(f=>f.key==='bleed')?.stacks, Math.min(5,i)); }
const t=s.teams.B[0];
const before=t.hp;
until(s,'B1'); applyAction(s,{spell:'base',target:'A1'});
assert(Math.abs(t.hp-(before-Math.ceil(before*0.1)))<1e-8);
const healed = start(62);
attack(healed);
healed.teams.B[0].fx.push({key:'regen', amount:0.1, turns:2, fresh:false});
until(healed,'B1'); applyAction(healed,{spell:'base',target:'A1'});
assert(!healed.teams.B[0].fx.some(f=>f.key==='bleed'));
const immune=start(62);
immune.teams.B[0].fx.push({key:'immune',amount:0,turns:99,fresh:false});
attack(immune); assert(!immune.teams.B[0].fx.some(f=>f.key==='bleed'));
const plain=start(999998); attack(plain); assert(!plain.teams.B[0].fx.some(f=>f.key==='bleed'));
// Exercise both element orders, consuming only the matching elemental mark.
for(const [id, mark, result] of [[68,'earth','broken'],[11,'burn','broken'],[17,'wet','vulnerable'],[6,'swept','vulnerable']] as const) {
 const st=start(id); st.teams.A[0].spell={name:'Test',target:'foe',effects:[{k:'damage',mult:1}]}; st.teams.A[0].pIn=0;
 st.teams.B[0].fx.push({key:mark,amount:0,turns:2,fresh:false});
 applyAction(st,{spell:'special',target:'B1'});
 assert(st.teams.B[0].fx.some(f=>f.key===result), `${id}: ${result}`);
 assert(!st.teams.B[0].fx.some(f=>f.key===mark), `${id}: consumed ${mark}`);
}
for (const boss of [false, true]) {
 const st=start(68); st.teams.A[0].spell={name:'Test',target:'foe',effects:[{k:'damage',mult:1}]}; st.teams.A[0].pIn=0;
 st.teams.B[0].card.boss=boss;
 st.teams.B[0].fx.push({key:'earth',amount:0,turns:2,fresh:false});
 applyAction(st,{spell:'special',target:'B1'});
 assert.equal(st.teams.B[0].fx.find(f=>f.key==='broken')?.amount, boss ? -0.2 : -0.4);
}
console.log('check-combat-statuses ok');
