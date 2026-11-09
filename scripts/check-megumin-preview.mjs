import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync('public/mockups/sort-feu-megumin.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const context = new Proxy({}, { get: (_, key) => key === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {} });
const elements = new Map();
const listeners = new Map();
const frames = new Map();
let frameId = 0;
const motion = { matches: false, addEventListener() {}, removeEventListener() {} };
const sandbox = {
  document: {
    hidden: false,
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, { value: '1', checked: false, getContext: () => context, getBoundingClientRect: () => ({ width: 1000, height: 500 }) });
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
};
runInNewContext(script, sandbox, { timeout: 1000 });
const preview = sandbox.window.meguminPreview;
const advance = now => {
  const callbacks = [...frames.values()];
  frames.clear();
  callbacks.forEach(fn => fn(now));
};
preview.play();
advance(16);
assert.equal(preview.state.time, 16);
preview.pause();
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
  assert.equal(frames.size, 0);
}
for (let i = 0; i < 30; i++) { preview.play(); preview.stop(); }
assert.equal(frames.size, 0);
for (const time of [0, 700, 2200, 2800, 3150, 4200, 6000, 6400]) {
  preview.seek(time);
  assert.equal(preview.state.time, time);
  assert.equal(frames.size, 0);
}
preview.play();
for (let i = 1; i <= 25; i++) advance(i * 80);
assert.equal(preview.state.time, 6400);
assert.equal(preview.state.playing, false);
assert.equal(frames.size, 0);
motion.matches = true;
preview.play();
assert.equal(preview.state.playing, false);
assert.equal(frames.size, 0);
assert.match(elements.get('phase').textContent, /Mouvement réduit/);
motion.matches = false;
preview.play();
preview.destroy();
assert.equal(frames.size, 0);
assert.equal(preview.state.destroyed, true);
assert.equal(listeners.has('resize'), false);
console.log('Megumin : lecture, pause, vitesses, interruption, inspection, fin, mouvement réduit et démontage OK.');
