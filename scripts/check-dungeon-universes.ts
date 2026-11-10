import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { DUNGEONS, dungeonKey, parseDungeonKey } from '../src/lib/dungeons';
import { getDungeonState, setAttackTeam, startBattle, getBattle, equipArtifact } from '../src/lib/battles';
import { getPlayerInventory } from '../src/lib/player-inventory';
async function main() {
 const id=`dg-universes-${Date.now()}`;
 await prisma.user.create({data:{id,name:id,username:id,email:`${id}@test.local`}});
 try {
  await prisma.adventureRecord.create({data:{userId:id,key:'access:dungeon'}});
  for(const d of DUNGEONS) await prisma.storyProgress.create({data:{userId:id,universe:d.key,maxLevel:10}});
  const opening=await prisma.packOpening.create({data:{userId:id,lotSize:5,pityTriggered:'NONE'}});
  const characters=(await Promise.all([['UR',2],['SSR',1],['SR',1]].map(([r,t])=>prisma.character.findMany({where:{disabled:false,rarity:r as any},take:t as number,orderBy:{id:'asc'}})))).flat();
  const cards=[];
  for(const c of characters) cards.push(await prisma.card.create({data:{ownerId:id,characterId:c.id,finish:'NORMAL',serial:(await prisma.character.update({where:{id:c.id},data:{pullCount:{increment:1}}})).pullCount,rarityAtPull:'UR',stars:5,packOpeningId:opening.id}}));
  await setAttackTeam(id,cards.map(c=>c.id));
  assert.equal(parseDungeonKey('dungeon:unknown:1'),null);
  assert.equal(parseDungeonKey('dungeon:naruto:11'),null);
  for(const d of DUNGEONS) {
   assert.equal(parseDungeonKey(dungeonKey(1,d.key)),1);
   await assert.rejects(startBattle(id,dungeonKey(2,d.key),false),/verrouillée/);
   const fight=await startBattle(id,dungeonKey(1,d.key),false);
   assert.equal(fight.winner,'A',`${d.key}: victory`);
   assert(fight.characters[d.bossId],`${d.key}: designated boss`);
   const state=await getDungeonState(id,d.key);
   assert.equal(state.maxLevel,1);
   assert.equal(state.artifacts.length,1);
   assert.equal(state.artifacts[0].setKey,d.key);
   await getBattle(id,fight.id);
   assert.equal(await prisma.artifact.count({where:{userId:id,setKey:d.key}}),1);
   await equipArtifact(id,state.artifacts[0].id,cards[0].id);
   const inventory=await getPlayerInventory(id);
   const item=inventory.items.find(i=>i.key===`artifact:${state.artifacts[0].id}`)!;
   assert.equal(item.universe,d.key);assert(item.source.includes(d.universe));
   console.log(`${d.universe}: boss, progression, butin, équipement et inventaire OK`);
  }
 } finally {await prisma.user.delete({where:{id}});}
}
main().finally(()=>prisma.$disconnect());
