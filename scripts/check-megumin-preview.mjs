import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync('public/mockups/sort-feu-megumin.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const renderer = readFileSync('public/vfx/megumin-explosion.js', 'utf8');
const context = new Proxy({}, { get: (_, key) => key === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {} });
const elements = new Map();
const listeners = new Map();
const frames = new Map();
let frameId = 0;
let audio;
const motion = { matches: false, addEventListener() {}, removeEventListener() {} };
const sandbox = {
  Audio: class {
    constructor() { this.currentTime = 0; this.playbackRate = 1; this.paused = true; }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    removeAttribute() {}
    load() {}
  },
  document: {
    hidden: false,
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, { value: '1', checked: false, dispatchEvent() {}, getContext: () => context, getBoundingClientRect: () => ({ width: 1000, height: 500 }) });
      return elements.get(id);
    },
    addEventListener() {}, removeEventListener() {},
  },
  matchMedia: () => motion,
  devicePixelRatio: 1,
  performance: { now: () => 0 },
  requestAnimationFrame(fn) { frames.set(++frameId, fn); return frameId; },
  cancelAnimationFrame(id) { frames.delete(id); },
  addEventListener(name, fn) { listeners.set(name, fn); },
  removeEventListener(name) { listeners.delete(name); },
  window: {},
  CustomEvent: class { constructor(name, options) { this.type = name; this.detail = options.detail; } },
};
runInNewContext(renderer, sandbox, { timeout: 1000 });
Object.assign(sandbox, sandbox.window);
runInNewContext(script, sandbox, { timeout: 1000 });
audio = runInNewContext('sound', sandbox);
const preview = sandbox.window.meguminPreview;
const advance = now => {
  if (!audio.paused) audio.currentTime = now / 1000 * audio.playbackRate;
  const callbacks = [...frames.values()];
  frames.clear();
  callbacks.forEach(fn => fn(now));
};
preview.play();
preview.resume();
preview.resume();
assert.equal(frames.size, 1, 'Une seule boucle même après des reprises répétées');
advance(16);
assert.equal(preview.state.time, 16);
preview.pause();
assert.equal(audio.paused, true);
advance(32);
assert.equal(preview.state.time, 16);
assert.equal(frames.size, 0);
for (const speed of [.25, .5, 1, 2, 4]) {
  elements.get('speed').value = String(speed);
  elements.get('speed').onchange();
  preview.play();
  advance(40);
  assert.equal(preview.state.time, 40 * speed);
  preview.stop();
  assert.equal(audio.paused, true);
  assert.equal(frames.size, 0);
}
for (let i = 0; i < 30; i++) { preview.play(); preview.stop(); }
assert.equal(frames.size, 0);
for (const time of [0, 500, 1500, 1800, 1835, 1850, 2200, 3150, 3600]) {
  preview.seek(time);
  assert.equal(preview.state.time, time);
  assert.equal(frames.size, 0);
}
preview.play();
for (let i = 1; i <= 25; i++) advance(i * 80);
assert.equal(preview.state.time, 3600);
assert.equal(preview.state.playing, false);
assert.equal(frames.size, 0);
const events = [];
preview.configure({ seed: 42, duration: 5400, quality: 'low', onEvent: event => events.push(event.name) });
assert.equal(preview.state.duration, 5400);
assert.equal(preview.state.particles, 30);
preview.play();
advance(675); // x4, half the 5.4s custom duration: impact at 2.7s.
assert.equal(preview.state.time, 2700);
assert.deepEqual(events, ['charge', 'launch', 'impact', 'results']);
advance(675);
assert.equal(events.filter(name => name === 'impact').length, 1);
preview.skip();
assert.equal(preview.state.time, 5400);
assert.equal(audio.paused, true);
assert.equal(frames.size, 0);
preview.play();
preview.stop();
assert.equal(preview.state.time, 0);
assert.equal(audio.paused, true);
preview.configure({ duration: 3600 });
motion.matches = true;
preview.play();
assert.equal(preview.state.playing, false);
assert.equal(frames.size, 0);
assert.match(elements.get('phase').textContent, /Mouvement réduit/);
const reducedText = [];
const reducedCanvas = { width: 1000, height: 500, getBoundingClientRect: () => ({ width: 1000, height: 500 }), getContext: () => new Proxy({}, { get: (_, key) => key === 'fillText' ? text => reducedText.push(text) : () => {} }) };
const reducedEffect = new sandbox.MeguminExplosion(reducedCanvas, { reducedMotion: true });
reducedEffect.draw(3600);
assert.ok(reducedText.includes('−1240'), 'Le résultat fixe conserve les dégâts');
assert.ok(reducedText.includes('KO'), 'Le résultat fixe conserve le KO');
reducedEffect.destroy();
motion.matches = false;
preview.play();
preview.destroy();
assert.equal(audio.paused, true);
assert.equal(frames.size, 0);
assert.equal(preview.state.destroyed, true);
assert.equal(listeners.has('resize'), false);
assert.equal(listeners.size, 0);
console.log('Megumin : lecture, pause, vitesses, interruption, inspection, fin, mouvement réduit et démontage OK.');
