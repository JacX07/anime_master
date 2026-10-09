// Maquettes Anime Masters — interactions communes : inclinaison 3D, son synthétisé, ouverture.
const CHARS = [
  { name: "Satoru Gojou", series: "Jujutsu Kaisen", img: "https://s4.anilist.co/file/anilistcdn/character/large/b127691-9zqh1xpIubn7.png", rarity: "UR", type: "MAGIE", atk: 4920, def: 3080, serial: 12 },
  { name: "Anya Forger", series: "Spy × Family", img: "https://s4.anilist.co/file/anilistcdn/character/large/b138100-4Li0tWRCa5bQ.png", rarity: "SSR", type: "MYSTERE", atk: 3390, def: 2494, serial: 87 },
  { name: "Frieren", series: "Frieren", img: "https://s4.anilist.co/file/anilistcdn/character/large/b176754-PCnpqIOkjhFk.png", rarity: "SR", type: "AVENTURE", atk: 3990, def: 2913, serial: 214, finish: "HOLO" },
  { name: "Kaguya Shinomiya", series: "Kaguya-sama", img: "https://s4.anilist.co/file/anilistcdn/character/large/b120649-NPaWaIpWy60E.png", rarity: "R", type: "COEUR", atk: 4270, def: 2444, serial: 431 },
  { name: "Levi", series: "L'Attaque des Titans", img: "https://s4.anilist.co/file/anilistcdn/character/large/b45627-CR68RyZmddGG.png", rarity: "N", type: "COMBAT", atk: 4600, def: 3347, serial: 1203 },
];
const TYPES = { COMBAT: ["🔥", "Combat"], MYSTERE: ["🔮", "Mystère"], MAGIE: ["✨", "Magie"], COEUR: ["💗", "Cœur"], AVENTURE: ["🧭", "Aventure"] };

// ---------- Son (Web Audio, rien à télécharger) ----------
const Sound = {
  ctx: null,
  on: true,
  profile: "pop",
  init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === "suspended") this.ctx.resume();
  },
  tone(freq, dur, { type = "sine", gain = 0.15, at = 0, slide = 0 } = {}) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime + at;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  },
  noise(dur, { from = 800, to = 4000, gain = 0.12, at = 0, q = 1.5 } = {}) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime + at;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = q;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.ctx.destination);
    src.start(t);
  },
  // Chaque direction a son propre « grain » sonore
  hover() {
    const p = this.profile;
    if (p === "pop") this.tone(880, 0.07, { type: "sine", gain: 0.08, slide: 1.6 });
    if (p === "neon") this.tone(1320, 0.05, { type: "square", gain: 0.03 });
    if (p === "manga") this.noise(0.06, { from: 3000, to: 6000, gain: 0.05 });
    if (p === "dream") this.tone(1568, 0.25, { type: "triangle", gain: 0.05 });
  },
  open() {
    const p = this.profile;
    if (p === "pop") { for (let i = 0; i < 6; i++) this.tone(300 + i * 40, 0.04, { type: "square", gain: 0.04, at: i * 0.06 }); this.tone(520, 0.25, { gain: 0.15, at: 0.4, slide: 2.2 }); }
    if (p === "neon") { this.tone(110, 0.6, { type: "sawtooth", gain: 0.06, slide: 4 }); this.noise(0.6, { from: 300, to: 6000, gain: 0.08 }); }
    if (p === "manga") { this.tone(90, 0.35, { type: "sine", gain: 0.35, slide: 0.5 }); this.noise(0.25, { from: 200, to: 900, gain: 0.25, q: 0.7 }); }
    if (p === "dream") { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.6, { type: "triangle", gain: 0.06, at: i * 0.08 })); }
  },
  flip(rarity) {
    const p = this.profile;
    this.noise(0.18, { from: p === "manga" ? 600 : 1200, to: p === "manga" ? 2500 : 5000, gain: 0.07 });
    const rank = ["N", "R", "SR", "SSR", "UR"].indexOf(rarity);
    const scale = p === "neon" ? [440, 554, 659, 880, 1109, 1319] : [523, 659, 784, 1047, 1319, 1568];
    for (let i = 0; i <= rank; i++) this.tone(scale[i], 0.3, { type: p === "neon" ? "sawtooth" : "triangle", gain: p === "neon" ? 0.03 : 0.07, at: 0.08 + i * 0.07 });
    if (rarity === "UR") {
      this.tone(scale[5] * 2, 0.9, { type: "sine", gain: 0.08, at: 0.5 });
      if (p === "manga") this.tone(70, 0.5, { gain: 0.4, at: 0.05, slide: 0.6 });
    }
  },
};

// ---------- Inclinaison 3D + reflet qui suit la souris ----------
function enableTilt(root = document) {
  root.querySelectorAll("[data-tilt]").forEach((el) => {
    el.addEventListener("pointerenter", () => Sound.hover());
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--rx", `${(0.5 - y) * 18}deg`);
      el.style.setProperty("--ry", `${(x - 0.5) * 22}deg`);
      el.style.setProperty("--mx", `${x * 100}%`);
      el.style.setProperty("--my", `${y * 100}%`);
    });
    el.addEventListener("pointerleave", () => {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    });
  });
}

// ---------- Ouverture : retournement échelonné ----------
function openPack(container, renderCard, { onUR } = {}) {
  Sound.init();
  Sound.open();
  container.innerHTML = "";
  CHARS.forEach((c, i) => {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.style.setProperty("--i", i);
    slot.innerHTML = `<div class="flipper"><div class="face back"></div><div class="face front">${renderCard(c)}</div></div>`;
    container.appendChild(slot);
    const reveal = () => {
      if (slot.classList.contains("revealed")) return;
      slot.classList.add("revealed");
      Sound.flip(c.rarity);
      if (c.rarity === "UR" && onUR) onUR(slot);
    };
    slot.addEventListener("click", reveal);
    slot.reveal = reveal;
  });
  enableTilt(container);
}

function revealAll(container) {
  [...container.querySelectorAll(".slot")].forEach((s, i) => setTimeout(() => s.reveal(), i * 280));
}

function soundToggle(btn) {
  btn.addEventListener("click", () => {
    Sound.init();
    Sound.on = !Sound.on;
    btn.textContent = Sound.on ? "🔊 Son activé" : "🔇 Son coupé";
    btn.setAttribute("aria-pressed", String(Sound.on));
  });
}
