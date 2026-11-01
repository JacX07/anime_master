// Builds an isolated preview from the exact controller used by BattlePlayer.
// Usage: npx tsx scripts/preview-combat-vfx.ts
import { readFileSync, writeFileSync } from "node:fs";
import ts from "typescript";

const controller = ts.transpileModule(readFileSync("src/components/battle/combat-vfx.ts", "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText.replace("export class CombatVfx", "class CombatVfx").replace(/export \{\};?/, "");
const examples = [
  ["slash", "katana", "Tanjirou", "b126071-BTNEc1nRIv68.png"],
  ["slash", "iai", "Zoro", "b62-S7oAeA9WInjV.png"],
  ["slash", "greatsword", "Guts", "b422-XTaiTuvRohsV.png"],
  ["magic", "katana", "Frieren", "b176754-PCnpqIOkjhFk.png"],
  ["gun", "katana", "Revy", "b458-tlKqPcuR287U.png"],
];
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FX anime cel</title><style>
*{box-sizing:border-box}body{margin:0;font:14px system-ui;color:var(--foreground,#e3eaf7)}.toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}button,select{font:inherit;background:var(--secondary,#253043);color:var(--foreground,#e3eaf7);border:1px solid var(--border,#57657b);padding:8px;border-radius:6px}label,output,p{font-size:12px;color:var(--muted-foreground,#9faec4)}article{padding:14px;background:var(--card,#131d2b);border:1px solid var(--border,#344055);border-radius:var(--radius,10px);margin-bottom:12px}h3{margin:0 0 10px;font-size:14px}.scene{position:relative;height:150px;background:#141d2b;overflow:hidden;border-radius:8px}.card{position:absolute;top:20px;width:70px;height:110px;border:1px solid #8296b4;border-radius:6px;background:#27344b;overflow:hidden;box-shadow:0 4px 10px #0005}.card img{width:100%;height:88px;object-fit:cover}.card small{display:block;text-align:center;font-size:10px;color:#eff3fa}.source{left:6%}.target{right:6%}.target img{filter:saturate(.6)}.card:after{content:"";position:absolute;bottom:0;left:4px;right:4px;height:2px;background:#89c9a3}input{width:140px}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #b9b4ff;outline-offset:2px}
</style></head><body><div class="toolbar"><button id="play">Jouer</button><button id="pause">Pause</button><button id="stop">Interrompre</button><button id="check">Vérifier</button><label>Vitesse <select id="speed"><option>1</option><option>2</option><option>4</option></select></label><label>Intensité <select id="intensity"><option value="1">Base</option><option value="1.15">Sort</option><option value="1.35">Ultime</option></select></label><label>Inspection <input id="time" type="range" min="0" max="850" value="500"></label><output id="status">500 ms</output></div>
${examples.map(([style, weapon, name, image]) => `<article><h3>${name} · ${style === "slash" ? weapon === "greatsword" ? "Lame massive" : weapon === "iai" ? "Iaï" : "Katana" : style === "magic" ? "Magie" : "Tir"}</h3><div class="scene" data-style="${style}" data-weapon="${weapon}"><div class="card source"><img src="https://s4.anilist.co/file/anilistcdn/character/large/${image}" alt=""><small>${name}</small></div><div class="card target"><img src="https://s4.anilist.co/file/anilistcdn/character/large/b422-XTaiTuvRohsV.png" alt=""><small>Cible</small></div></div></article>`).join("")}
<p>Même contrôleur que le lecteur de combat · impact à 480 ms · aucune règle de combat exécutée.</p><script>${controller}
const entries=[...document.querySelectorAll('.scene')].map(root=>({root,controller:new CombatVfx(root)}));
const status=document.getElementById('status');let speed=1;
function draw(paused=false,at=0){for(const {root,controller} of entries){controller.clear();controller.setPlayback(speed,!paused);const a=root.querySelector('.source'),b=root.querySelector('.target');controller.play({style:root.dataset.style,weapon:root.dataset.weapon,from:{x:a.offsetLeft+35,y:75},to:{x:b.offsetLeft+35,y:75},impactAt:480,targetCard:b,actorCard:root.dataset.style==='slash'?a:null,intensity:Number(document.getElementById('intensity').value)});if(paused)root.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=at})}status.textContent=paused?at+' ms':'Lecture';}
document.getElementById('play').onclick=()=>draw();
document.getElementById('pause').onclick=()=>entries.forEach(e=>e.controller.setPlayback(speed,false));
document.getElementById('stop').onclick=()=>{entries.forEach(e=>e.controller.clear());status.textContent='Interrompu'};
document.getElementById('speed').onchange=e=>{speed=Number(e.target.value);entries.forEach(e=>e.controller.setPlayback(speed,true))};
document.getElementById('intensity').onchange=()=>draw(true,500);
document.getElementById('time').oninput=e=>draw(true,Number(e.target.value));
async function check(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){status.textContent='Mouvement réduit actif : effets désactivés';return {checks:'reduced-motion'}}
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const assert=(ok,message)=>{if(!ok)throw Error(message)};
  draw();entries.forEach(e=>e.controller.setPlayback(1,false));
  const frozen=entries[0].root.getAnimations({subtree:true})[0],time=frozen.currentTime;
  await wait(60);assert(Math.abs(frozen.currentTime-time)<1,'Pause');
  for(const speed of [1,2,4]){
    entries.forEach(e=>e.controller.clear());draw();entries.forEach(e=>e.controller.setPlayback(speed,true));
    await wait(1300/speed+150);
    assert(entries.every(e=>!e.root.querySelector('.bt-cel-vfx')&&!e.root.getAnimations({subtree:true}).length),'Fin x'+speed);
  }
  for(let i=0;i<30;i++){draw();entries.forEach(e=>e.controller.clear())}
  await wait(0);assert(entries.every(e=>!e.root.querySelector('.bt-cel-vfx')&&!e.root.getAnimations({subtree:true}).length),'Nettoyage');
  const intervals=[];draw();let previous=performance.now(),start=previous;
  await new Promise(resolve=>{function sample(t){intervals.push(t-previous);previous=t;if(t-start<700)requestAnimationFrame(sample);else resolve()}requestAnimationFrame(sample)});
  entries.forEach(e=>e.controller.clear());intervals.sort((a,b)=>a-b);
  const result={checks:'pause, x1/x2/x4, 30 interruptions, nettoyage',medianFrameMs:intervals[Math.floor(intervals.length/2)],p95FrameMs:intervals[Math.floor(intervals.length*.95)]};
  status.textContent='Validé · frame médiane '+result.medianFrameMs.toFixed(1)+' ms';console.log(result);return result;
}
document.getElementById('check').onclick=()=>{status.textContent='Vérification…';check().catch(e=>status.textContent=e.message)};
window.vfxPreview={entries,draw,check};
addEventListener('pagehide',()=>entries.forEach(e=>e.controller.clear()),{once:true});draw(true,Number(location.hash.slice(1))||420);
</script></body></html>`;
writeFileSync("public/mockups/combat-vfx.html", html);
console.log("public/mockups/combat-vfx.html");
