// Maquette 2D de l'ouverture de paquets : aucune 3D, des éléments HTML animés avec l'API Web Animations
// (transformations et opacité uniquement) et un petit canevas 2D pour les gerbes de particules, actif seulement pendant un effet.

const CHARS = [
  { name: "Satoru Gojou", series: "Jujutsu Kaisen", img: "https://s4.anilist.co/file/anilistcdn/character/large/b127691-9zqh1xpIubn7.png" },
  { name: "Anya Forger", series: "Spy × Family", img: "https://s4.anilist.co/file/anilistcdn/character/large/b138100-4Li0tWRCa5bQ.png" },
  { name: "Frieren", series: "Frieren", img: "https://s4.anilist.co/file/anilistcdn/character/large/b176754-PCnpqIOkjhFk.png" },
  { name: "Kaguya Shinomiya", series: "Kaguya-sama", img: "https://s4.anilist.co/file/anilistcdn/character/large/b120649-NPaWaIpWy60E.png" },
  { name: "Levi", series: "L'Attaque des Titans", img: "https://s4.anilist.co/file/anilistcdn/character/large/b45627-CR68RyZmddGG.png" },
];
const RC = { N: "#9aa8b8", R: "#2b9bff", SR: "#7a5cff", SSR: "#f2a516", UR: "#ff3b4a" };
const RANK = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 };
const RIFT = { x: 0.5, y: 0.366 }; // centre de la brèche dans le repère de la scène (0..1)
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

const $ = (id) => document.getElementById(id);
const stage = $("stage"), cardsEl = $("cards"), rift = $("rift"), flashEl = $("flash"), callout = $("callout"), storeBtn = $("store");
const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? Math.min(ms, 60) : ms));
const anim = (el, frames, opts) => el.animate(frames, { fill: "forwards", ...opts }).finished;

let crystals = 68, busy = false, stored = 0, drawn = [];

// ---------- HUD ----------
function renderHud() {
  $("crystals").textContent = crystals; $("topCrystals").textContent = `${crystals} ◇`;
  $("pips").innerHTML = Array.from({ length: 10 }, (_, i) => `<i class="${i < Math.min(10, Math.ceil(crystals / 5)) ? "" : "off"}"></i>`).join("");
  document.querySelectorAll(".row button").forEach((b) => (b.disabled = busy || crystals < +b.dataset.n));
}

// ---------- Tirage (factice : la vraie version vient du serveur) ----------
function roll(n) {
  const pickR = () => { const x = Math.random() * 100; return x < 1.5 ? "UR" : x < 7 ? "SSR" : x < 22 ? "SR" : x < 50 ? "R" : "N"; };
  const out = Array.from({ length: n }, () => ({ ...CHARS[Math.floor(Math.random() * CHARS.length)], rarity: pickR() }));
  // pour la démo : un SSR garanti en ×5, un SSR et un UR en ×10
  if (n >= 5 && !out.some((c) => RANK[c.rarity] >= 3)) out[Math.floor(Math.random() * n)].rarity = "SSR";
  if (n >= 10 && !out.some((c) => c.rarity === "UR")) out[(out.findIndex((c) => c.rarity !== "SSR") + n) % n].rarity = "UR";
  return out;
}

// ---------- Particules (canevas 2D, boucle seulement tant qu'il reste des particules) ----------
const fx = $("fx"), g = fx.getContext("2d");
let parts = [], looping = false;
function sizeFx() { const r = stage.getBoundingClientRect(), k = Math.min(devicePixelRatio, 1.5); fx.width = r.width * k; fx.height = r.height * k; g.setTransform(k, 0, 0, k, 0, 0); }
addEventListener("resize", sizeFx); sizeFx();
function burst(x, y, colors, n = 80, speed = 6) {
  if (reduced) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random());
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, life: 1, decay: 0.012 + Math.random() * 0.018, r: 1 + Math.random() * 2.6, c: colors[i % colors.length] });
  }
  if (!looping) { looping = true; requestAnimationFrame(tick); }
}
function tick() {
  const r = stage.getBoundingClientRect();
  g.clearRect(0, 0, r.width, r.height);
  g.globalCompositeOperation = "lighter";
  parts = parts.filter((p) => (p.life -= p.decay) > 0);
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.vx *= 0.97; p.vy = p.vy * 0.97 + 0.08;
    g.globalAlpha = p.life; g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
  }
  if (parts.length) requestAnimationFrame(tick); else { looping = false; g.clearRect(0, 0, r.width, r.height); }
}

// ---------- Cartes ----------
const toPx = (fx_, fy) => { const r = stage.getBoundingClientRect(); return [fx_ * r.width, fy * r.height]; };
// Emplacements selon la taille du lot (repère de la scène, en fractions)
function slots(n) {
  if (n === 1) return { w: 15, pos: [[0.5, 0.5]] };
  if (n === 5) return { w: 11, pos: [0, 1, 2, 3, 4].map((i) => [0.5 + (i - 2) * 0.125, 0.53]) };
  return { w: 8.6, pos: Array.from({ length: n }, (_, i) => [0.5 + ((i % 5) - 2) * 0.1, i < 5 ? 0.37 : 0.67]) };
}
function makeCard(c, [sx, sy], w) {
  const el = document.createElement("div");
  el.className = "card"; el.dataset.r = c.rarity;
  el.style.cssText = `left:${sx * 100}%;top:${sy * 100}%;--w:${w}cqw;--rc:${RC[c.rarity]}`;
  el.innerHTML = `<div class="inner"><div class="back"></div><div class="face"><img src="${c.img}" alt="" referrerpolicy="no-referrer" /><span class="rar">${c.rarity}</span><div class="plate"><span class="name">${c.name}</span><span class="series">${c.series}</span></div></div></div>`;
  el.addEventListener("click", () => flip(el, c));
  cardsEl.append(el);
  return el;
}
async function flip(el, c) {
  if (el.classList.contains("flipped")) return;
  el.classList.add("flipped");
  const [x, y] = [parseFloat(el.style.left) / 100, parseFloat(el.style.top) / 100];
  const [px, py] = toPx(x, y);
  burst(px, py, [RC[c.rarity], "#ffffff"], 18 + RANK[c.rarity] * 18, 3 + RANK[c.rarity]);
  anim(el, [{ transform: "scale(1)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }], { duration: 420, easing: "ease-out" });
}

// Mise en scène avant de retourner un SSR / UR
async function special(el, c) {
  const ur = c.rarity === "UR", [x, y] = [el.style.left, el.style.top];
  const [px, py] = toPx(parseFloat(x) / 100, parseFloat(y) / 100);
  const rays = Object.assign(document.createElement("div"), { className: `rays${ur ? " ur" : ""}` });
  rays.style.cssText = `left:${x};top:${y};--w:${el.style.getPropertyValue("--w")}`;
  cardsEl.insertBefore(rays, el);
  anim(rays, [{ opacity: 0, transform: "scale(.3)" }, { opacity: 1, transform: "scale(1)" }], { duration: ur ? 900 : 600, easing: "cubic-bezier(.2,.8,.2,1)" });
  // la carte vibre et grossit, l'anneau de sa couleur s'élargit
  await anim(el, [
    { transform: "scale(1) translate(0,0)" }, { transform: "scale(1.18) translate(-1%,0)" }, { transform: "scale(1.2) translate(1%,0)" },
    { transform: "scale(1.22) translate(-1%,0)" }, { transform: "scale(1.25) translate(0,0)" },
  ], { duration: ur ? 1300 : 750, easing: "ease-in" });
  for (let i = 0; i < (ur ? 3 : 1); i++) {
    const ring = Object.assign(document.createElement("div"), { className: "ring" });
    ring.style.cssText = `left:${x};top:${y};--w:${el.style.getPropertyValue("--w")};--rc:${ur ? ["#6fb6ff", "#6ff2cf", "#ff7ad9"][i] : RC.SSR}`;
    cardsEl.append(ring);
    anim(ring, [{ opacity: 1, transform: "scale(.6)" }, { opacity: 0, transform: "scale(3.2)" }], { duration: 900, delay: i * 160, easing: "ease-out" }).then(() => ring.remove());
  }
  if (ur) anim(flashEl, [{ opacity: 0 }, { opacity: 0.85 }, { opacity: 0 }], { duration: 700 });
  callout.textContent = ur ? "ULTRA RARE" : "SUPER RARE"; callout.className = `callout${ur ? "" : " ssr"}`;
  anim(callout, [{ opacity: 0, transform: "scale(.8)", letterSpacing: ".5em" }, { opacity: 1, transform: "scale(1)", letterSpacing: ".12em", offset: 0.3 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: ur ? 2200 : 1600, easing: "ease-out" });
  burst(px, py, ur ? ["#6fb6ff", "#6ff2cf", "#ffe27a", "#ff7ad9", "#ffffff"] : ["#ffd36b", "#f2a516", "#ffffff"], ur ? 220 : 120, ur ? 9 : 7);
  flip(el, c);
  await anim(el, [{ transform: "scale(1.25)" }, { transform: "scale(1)" }], { duration: 500, easing: "cubic-bezier(.3,1.5,.5,1)" });
  if (!ur) anim(rays, [{ opacity: 1 }, { opacity: 0 }], { duration: 1200, delay: 600 }).then(() => rays.remove());
  else rays.dataset.keep = "1"; // le halo arc-en-ciel reste derrière l'UR jusqu'au rangement
}

// ---------- Ouverture ----------
async function open(n) {
  if (busy || crystals < n) return;
  busy = true; crystals -= n; renderHud();
  document.body.classList.add("opening");
  // la brèche se charge et tremble, puis éclate
  await anim(rift, [
    { transform: "scale(1)" }, { transform: "scale(1.04) translate(-.4%,0)" }, { transform: "scale(1.07) translate(.4%,0)" },
    { transform: "scale(1.1) translate(-.3%,0)" }, { transform: "scale(1.14)" },
  ], { duration: 900, easing: "ease-in" });
  anim(flashEl, [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 0 }], { duration: 650 });
  const [rx, ry] = toPx(RIFT.x, RIFT.y);
  burst(rx, ry, ["#ffffff", "#b7a3ff", "#6ff2cf", "#6fb6ff"], 160, 9);
  anim(rift, [{ transform: "scale(1.14)" }, { transform: "scale(.94)" }, { transform: "scale(1)" }], { duration: 700, easing: "cubic-bezier(.3,1.4,.5,1)" });

  // les cartes jaillissent de la brèche vers leur place, face cachée
  drawn = roll(n);
  const { w, pos } = slots(n);
  const els = drawn.map((c, i) => makeCard(c, pos[i], w));
  await Promise.all(els.map((el, i) => {
    const [sx, sy] = pos[i], [px, py] = toPx(sx, sy);
    return anim(el, [
      { transform: `translate(${rx - px}px, ${ry - py}px) scale(.15) rotate(${(Math.random() - 0.5) * 120}deg)`, opacity: 0 },
      { opacity: 1, offset: 0.2 },
      { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1 },
    ], { duration: 750, delay: i * 70, easing: "cubic-bezier(.2,.9,.25,1.15)" });
  }));
  await wait(250);

  // révélation une à une ; les SSR et UR ont leur propre mise en scène
  for (let i = 0; i < els.length; i++) {
    if (els[i].classList.contains("flipped")) continue;
    if (RANK[drawn[i].rarity] >= 3) { await special(els[i], drawn[i]); await wait(500); }
    else { flip(els[i], drawn[i]); await wait(n === 1 ? 500 : 260); }
  }
  storeBtn.hidden = false;
}

// ---------- Rangement : les cartes filent vers « Album » ----------
async function store() {
  storeBtn.hidden = true;
  const sr = stage.getBoundingClientRect(), ar = $("album").getBoundingClientRect();
  const tx = ar.left + ar.width / 2 - sr.left, ty = ar.top + ar.height / 2 - sr.top;
  cardsEl.querySelectorAll(".rays, .ring").forEach((e) => anim(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 }).then(() => e.remove()));
  const els = [...cardsEl.querySelectorAll(".card")];
  await Promise.all(els.map((el, i) => {
    const [px, py] = toPx(parseFloat(el.style.left) / 100, parseFloat(el.style.top) / 100);
    return anim(el, [{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${tx - px}px, ${ty - py}px) scale(.08) rotate(20deg)`, opacity: 0.2 }], { duration: 650, delay: i * 55, easing: "cubic-bezier(.6,0,.4,1)" });
  }));
  els.forEach((e) => e.remove());
  stored += els.length;
  const badge = $("albumBadge"); badge.textContent = `+${stored}`; badge.hidden = false;
  anim(badge, [{ transform: "scale(1.6)" }, { transform: "scale(1)" }], { duration: 400, easing: "cubic-bezier(.3,1.6,.5,1)" });
  document.body.classList.remove("opening");
  busy = false; renderHud();
}

rift.addEventListener("click", () => open(1));
document.querySelectorAll(".row button").forEach((b) => b.addEventListener("click", () => open(+b.dataset.n)));
document.querySelectorAll(".bn").forEach((b) => b.addEventListener("click", () => document.querySelectorAll(".bn").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", String(x === b)); })));
storeBtn.addEventListener("click", store);
renderHud();
