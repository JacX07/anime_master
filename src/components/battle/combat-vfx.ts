import type { AttackVisual, AttackWeapon } from "@/lib/attack-visual";

type Point = { x: number; y: number };
export interface CombatVfxOptions {
  style: Exclude<AttackVisual, "melee">;
  from: Point;
  to: Point;
  /** Replay milliseconds, independent of playback speed. */
  impactAt: number;
  intensity?: number;
  weapon?: AttackWeapon;
  support?: boolean;
  dodge?: boolean;
  /** Target `.bt-card`, split in two by the iaï cut. */
  targetCard?: HTMLElement | null;
  /** Attacker card: it wields the blade and follows its grip. */
  actorCard?: HTMLElement | null;
}

const NS = "http://www.w3.org/2000/svg";
const ink = "#151a36";
const burst = `<path d="M0-34 6-12 26-23 13-5 39 0 14 6 26 25 7 14 0 38-6 13-28 25-13 5-37 0-12-7-25-26-5-12Z" fill="#fff5dc" stroke="${ink}" stroke-width="2"/><path d="M0-24 3-7 18-14 8-2 25 0 8 3 15 16 2 8 0 25-4 7-18 16-7 2-23 0-8-4-15-17-3-8Z" fill="white"/>`;

/** Flat cel drawings: one dark contour, two color planes, a sharp white core. */
function artwork(style: CombatVfxOptions["style"]): string {
  if (style === "slash") return "";
  if (style === "magic") return `
    <g data-part="seal" fill="none" stroke="#a896ff" stroke-width="1.7">
      <ellipse rx="11" ry="26"/><ellipse rx="7" ry="20"/><path d="M0-20 7 10-7 10Z M0 20 7-10-7-10Z M-17-7-13-4M13 4 17 7M-4-30H4M-4 30H4"/>
    </g>
    <g data-part="projectile" stroke="${ink}" stroke-linejoin="round" stroke-width="1.5">
      <path d="M-95 0-72-8-82-18-48-11-37-26-28-15-12-22 3-15 18-21 35-9 47 0 31 10 12 9-4 22-18 14-36 24-42 11-65 15-57 5Z" fill="#8354e8"/>
      <path d="M-76 0-48-5-29-16-22-7-7-13 6-7 20-12 39 0 20 6 5 5-8 13-18 6-34 14-38 5-54 8Z" fill="#b6a0ff" stroke="none"/>
      <path d="M-64 0-38-2-22-9-14-3 0-8 12-3 31 0 13 3 1 2-13 7-21 2-37 6Z" fill="#fff8ed" stroke="none"/>
      <path d="M-72-27-60-23-63-16Z M-48 28-34 31-40 24Z M-7-33 1-27-8-26Z" fill="#ac84ff" stroke="none"/>
    </g>`;
  return `
    <g transform="translate(24 0)"><g data-part="weapon" stroke="${ink}" stroke-width="1.5" stroke-linejoin="round">
      <path d="M-8-9H43V2H17L10 25H-4L2 2H-8Z" fill="#343e50"/>
      <path d="M-6-8H42V-3H-6Z" fill="#8995a5"/><path d="M16 3Q30 17 31 3M0 10 9 13M-2 16 7 19" fill="none" stroke="#a0a8b1" stroke-width="1"/>
    <g data-part="flash" stroke="none"><path d="M43-6 54-12 51-5 69-4 53 0 56 7 43 2Z" fill="#ffcd7d"/><path d="M43-4 58-4 49 0 43 0Z" fill="#fff9dc"/></g>
    </g></g><g data-part="projectile"><path d="M-100 0H0" stroke="#fff4d6" stroke-width="1.2"/></g>
    <g data-part="casing"><path d="M0 0H7V3H0Z" fill="#d4b775" stroke="${ink}" stroke-width=".6"/></g>`;
}


type Pose = { x: number; y: number; r: number; s: number; o: number };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const seg = (t: number, a: number, b: number) => b <= a ? (t >= b ? 1 : 0) : clamp01((t - a) / (b - a));
const lerp = (a: number, b: number, e: number) => a + (b - a) * e;
const easeOut = (x: number) => 1 - (1 - x) ** 3;
const easeIn = (x: number) => x ** 3;
const easeInOut = (x: number) => x < .5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
const quad = (p: number[][], t: number) => [0, 1].map((i) => (1 - t) ** 2 * p[0][i] + 2 * (1 - t) * t * p[1][i] + t * t * p[2][i]);
const poly = (points: number[][]) => "M" + points.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + "Z";

/** Katana drawn grip-centred, blade toward +x: curved blade, wavy temper line, gold habaki, braided grip. */
const KATANA = (() => {
  const edge = [[34, 3.8], [122, 3.8], [188, -16.6]], spine = [[34, -3.6], [120, -5], [186, -21]];
  const front: number[][] = [], back: number[][] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40 * .97, e = quad(edge, t), m = quad(spine, t), k = .42 + .07 * Math.sin(t * Math.PI * 16);
    front.push(e); back.unshift([e[0] + (m[0] - e[0]) * k, e[1] + (m[1] - e[1]) * k]);
  }
  const blade = "M34 -3.6Q120 -5 186 -21L198 -24.6Q195 -19.4 188 -16.6Q122 3.8 34 3.8Z";
  let wrap = "";
  for (let x = -21; x < 20; x += 7.4) wrap += `<path d="M${x.toFixed(1)} 0L${(x + 3.7).toFixed(1)} -3.4L${(x + 7.4).toFixed(1)} 0L${(x + 3.7).toFixed(1)} 3.4Z" fill="#e6dcc6" stroke="#0e1120" stroke-width=".7"/>`;
  return `<g stroke-linejoin="round">
    <rect x="-30" y="-4.6" width="6.5" height="9.2" rx="1.6" fill="#b89a52" stroke="${ink}" stroke-width="1.2"/>
    <path d="M-24 -4.6H22V4.6H-24Z" fill="#1d2236" stroke="${ink}" stroke-width="1.2"/>${wrap}
    <ellipse cx="24.5" rx="3.4" ry="11.5" fill="#2b2834" stroke="${ink}" stroke-width="1.3"/>
    <ellipse cx="24.5" rx="1.4" ry="8.5" fill="none" stroke="#b89a52" stroke-width=".9"/>
    <path d="M27.5 -4.3H34L35 -3.6V3.8L34 4.4H27.5Z" fill="#dcbc62" stroke="${ink}" stroke-width="1"/>
    <path d="${blade}" fill="#9fb1c1"/><path d="${poly(front.concat(back))}" fill="#eef5fa"/>
    <path d="M36 -2.7Q120 -4 183 -19.8" fill="none" stroke="#dfe8ef" stroke-width="1"/>
    <path d="M34 -.6Q121 -1.6 186 -18.6M186 -21L188 -16.6" fill="none" stroke="#71869a" stroke-width=".6"/>
    <path d="${blade}" fill="none" stroke="${ink}" stroke-width="1.4"/></g>`;
})();
const SAYA = `<path d="M33 -6Q120 -7.4 188 -25.5Q201 -29 200 -22Q199 -17 191 -14Q122 6.2 33 6.2Z" fill="#141826" stroke="${ink}" stroke-width="1.4"/>
  <path d="M40 -3.5Q120 -4.8 186 -21.5" fill="none" stroke="#9a2f3a" stroke-width="1.6"/>
  <path d="M33 -6H39V6.2H33Z M60 4.5Q64 10 68 4.5" fill="#2c2f3e" stroke="${ink}" stroke-width="1"/>`;
/** Guts' slab blade, grip-centred like the katana. */
const GREATSWORD = `<g stroke="${ink}" stroke-linejoin="round" stroke-width="2" transform="translate(-12 0)">
  <path d="M30-10 135-14 155 0 135 14 30 10Z" fill="#8b9bad"/><path d="M33-9 134-12 149 0 33 0Z" fill="#dce9f1"/>
  <path d="M25-12 32-12 32 12 25 12Z" fill="#c8a967"/>
  <path d="M0-4H25V5H0Z" fill="#263448"/><path d="M3-4 10 5 17-4 24 5" fill="none" stroke="#aebac6" stroke-width="1"/></g>`;
const STAR = `<path d="M0-9 1.6-1.6 9 0 1.6 1.6 0 9-1.6 1.6-9 0-1.6-1.6Z" fill="#fff"/>`;

/** Arc trail between a0 and a1 degrees, tapering over the full sweep a0..aEnd. */
function crescent(a0: number, a1: number, aEnd: number, radius: number, width: number): string {
  const outer: number[][] = [], inner: number[][] = [];
  for (let n = 0; n <= 24; n++) {
    const a = lerp(a0, a1, n / 24), u = (a - a0) / (aEnd - a0), r = a * Math.PI / 180;
    const w = width * Math.sin(Math.PI * Math.min(u, 1)) ** .8 * u ** .35 + 1;
    outer.push([radius * Math.cos(r), radius * Math.sin(r)]);
    inner.unshift([(radius - w) * Math.cos(r), (radius - w) * Math.sin(r)]);
  }
  return poly(outer.concat(inner));
}

const SWING = { raised: -104, contact: -28, follow: 14 };
const STEP = 10;
/** Samples a timeline into linear keyframes, so hit-stop and easing survive any playback rate. */
function sample(end: number, frame: (t: number) => Keyframe): Keyframe[] {
  const frames: Keyframe[] = [];
  for (let t = 0; t <= end; t += STEP) frames.push({ ...frame(t), offset: t / end });
  frames[frames.length - 1].offset = 1;
  return frames;
}
const poseFrame = (p: Pose): Keyframe => ({ opacity: p.o, transform: `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) rotate(${p.r.toFixed(1)}deg) scale(${p.s.toFixed(3)})` });

const TRAIL_ANGLES = Array.from({ length: 8 }, (_, k) => lerp(SWING.raised, SWING.follow, (k + 1) / 8));
const IAI_TILT = -2.2;

function arcPose(length: number, T: number, weapon: AttackWeapon): (t: number) => Pose {
  const pivot = [length - 135, 58], start = Math.max(0, T - 480), travel = Math.min(start + 180, T - 120);
  const s = weapon === "greatsword" ? 1.05 : .8;
  return (t) => {
    if (t < start + 120) { const e = easeOut(seg(t, start, start + 120)); return { x: 0, y: 0, r: -8, s: s * (.7 + .3 * e), o: e }; }
    if (t < travel) return { x: 0, y: 0, r: -8, s, o: 1 };
    if (t < T - 80) { const e = easeInOut(seg(t, travel, T - 80)); return { x: pivot[0] * e, y: pivot[1] * e, r: lerp(-8, SWING.raised, e), s, o: 1 }; }
    let r: number;
    if (t < T - 40) r = SWING.raised - 6 * Math.sin(Math.PI * seg(t, T - 80, T - 40));
    else if (t < T) r = lerp(SWING.raised, SWING.contact, easeIn(seg(t, T - 40, T)));
    else if (t < T + 45) r = SWING.contact; // hit-stop
    else if (t < T + 100) r = lerp(SWING.contact, SWING.follow, easeOut(seg(t, T + 45, T + 100)));
    else r = SWING.follow + 6 * easeOut(seg(t, T + 100, T + 300));
    const back = 1 - easeInOut(seg(t, T + 120, T + 400));
    return { x: pivot[0] * back, y: pivot[1] * back, r, s, o: 1 - seg(t, T + 260, T + 380) };
  };
}

function arcArtwork(length: number, weapon: AttackWeapon): string {
  const blade = weapon === "greatsword" ? GREATSWORD : KATANA;
  const [radius, width] = weapon === "greatsword" ? [155, 44] : [163, 40];
  const pieces = TRAIL_ANGLES.map((a, k) => `<g data-part="trail${k}"><path d="${crescent(SWING.raised, a, SWING.follow, radius, width)}" fill="#315fe5" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>${a - 2 > SWING.raised + 5 ? `<path d="${crescent(SWING.raised + 4, a - 2, SWING.follow - 2, radius - 5, width * .47)}" fill="#fff5dc"/>` : ""}</g>`).join("");
  return `<g transform="translate(${length - 135} 58)">${pieces}</g><g data-part="ghost1">${blade}</g><g data-part="ghost0">${blade}</g><g data-part="weapon">${blade}</g>`;
}

function iaiArtwork(length: number): string {
  const x0 = length * .36 + 45, tilt = IAI_TILT * Math.PI / 180, y0 = -(length - x0) * Math.tan(tilt), cut = (length + 30 - x0) / Math.cos(tilt);
  return `<rect data-part="flash" x="${-length}" y="${-length}" width="${3 * length}" height="${2 * length}" fill="#fff"/>
    <g data-part="streaks" stroke="#dfe9ff" stroke-width="1.2" stroke-linecap="round" fill="none"><path d="M${x0 - 5} 18H${length - 60}M${x0 - 15} 28H${length - 30}M${x0 + 15} 38H${length - 80}"/></g>
    <g transform="translate(${x0.toFixed(1)} ${y0.toFixed(1)}) rotate(${IAI_TILT})"><path data-part="cut" d="M0 0Q${cut / 2} -3.4 ${cut} 0Q${cut / 2} 3.4 0 0Z" fill="#fff" stroke="#9fc0ff" stroke-width=".8"/></g>
    <g transform="translate(${length} 0) rotate(${IAI_TILT})"><g data-part="impact-flat">${burst}</g></g>
    <g data-part="sheath"><g data-part="thumb">${KATANA}</g>${SAYA}<g transform="translate(31 0)"><g data-part="click">${STAR}</g></g></g>`;
}

/** Owns only its animations and temporary SVGs. Safe to interrupt and reuse. */
export class CombatVfx {
  private animations = new Set<Animation>();
  private nodes = new Set<Element>();
  private speed = 1;
  private paused = false;
  constructor(private root: HTMLElement) {}

  animate(el: Element, frames: Keyframe[], options: KeyframeAnimationOptions): Animation {
    const animation = el.animate(frames, options);
    animation.playbackRate = this.speed;
    if (this.paused) animation.pause();
    this.animations.add(animation);
    void animation.finished.then(() => {
      this.animations.delete(animation);
      animation.cancel();
    }, () => this.animations.delete(animation));
    return animation;
  }

  setPlayback(speed: number, playing: boolean) {
    this.speed = speed;
    this.paused = !playing;
    for (const animation of this.animations) {
      animation.updatePlaybackRate(speed);
      if (playing) animation.play(); else animation.pause();
    }
  }

  /** Coupe en arc: the blade leaves the card, rises, slices through the target with a hit-stop. */
  private arc(timeline: (part: string, frame: (t: number) => Keyframe) => void, length: number, T: number, weapon: AttackWeapon): (t: number) => Pose {
    const pose = arcPose(length, T, weapon);
    timeline("weapon", (t) => poseFrame(pose(t)));
    [[22, .35], [44, .18]].forEach(([lag, opacity], i) => timeline(`ghost${i}`, (t) => {
      const p = pose(t - lag);
      return poseFrame({ ...p, o: t > T - 40 && t < T + 100 ? opacity : 0 });
    }));
    // Each trail piece contains the previous ones: show one at a time, in step with the blade angle.
    const shown = TRAIL_ANGLES.map((a) => { let t = T - 40; while (t < T + 100 && pose(t).r < a - .01) t += STEP; return t; });
    shown.forEach((from, k) => {
      const last = k === shown.length - 1, to = last ? T + 380 : shown[k + 1];
      timeline(`trail${k}`, (t) => ({ opacity: t < from || t >= to ? 0 : last ? 1 - seg(t, T + 140, T + 380) : 1 }));
    });
    return (t) => { const p = pose(t); return { ...p, r: p.r * .08 * (1 - seg(t, T + 120, T + 400)) }; };
  }

  /** Iaï: sheathed stance, invisible draw, then the click of the resheath splits the target. */
  private iai(timeline: (part: string, frame: (t: number) => Keyframe) => void, length: number, T: number, dodge: boolean): (t: number) => Pose {
    const stance = length * .36, start = Math.max(0, T - 480), draw = T - 190;
    // The holder walks to the stance, snaps forward on the invisible draw, and walks back after the click.
    const holder = (t: number): Pose => {
      const out = easeInOut(seg(t, start + 100, start + 230)) * (1 - easeInOut(seg(t, T + 120, T + 420)));
      const tremble = t > start + 230 && t < draw ? .5 * Math.sin(t / 9) : 0;
      const snap = 10 * Math.sin(Math.PI * seg(t, draw, draw + 60));
      return { x: stance * out + tremble + snap, y: 28 * out, r: 0, s: 1, o: 1 };
    };
    timeline("sheath", (t) => {
      const e = easeOut(seg(t, start, start + 100)), h = holder(t);
      const hidden = t >= draw && t < draw + 40;
      return poseFrame({ x: h.x, y: h.y, r: -6, s: .75 * (.7 + .3 * e), o: hidden ? 0 : e * (1 - seg(t, T + 340, T + 450)) });
    });
    timeline("thumb", (t) => ({ opacity: 1, transform: `translateX(${(4 * seg(t, T - 260, T - 230) * (1 - seg(t, T - 20, T))).toFixed(2)}px)` }));
    timeline("click", (t) => ({ opacity: t < T ? 0 : 1 - seg(t, T, T + 110), transform: `scale(${(.6 + 1.6 * seg(t, T, T + 110)).toFixed(2)})` }));
    timeline("cut", (t) => {
      const width = easeOut(seg(t, draw, draw + 45));
      const thick = dodge ? 1 - seg(t, T, T + 200) : t < T ? lerp(1, .45, seg(t, draw + 80, T)) : lerp(1.8, 0, seg(t, T, T + 320));
      return { opacity: t < draw ? 0 : 1, transform: `scale(${width.toFixed(3)}, ${thick.toFixed(3)})` };
    });
    timeline("streaks", (t) => ({ opacity: t < draw ? 0 : .8 * (1 - seg(t, draw, draw + 160)) }));
    timeline("flash", (t) => ({ opacity: t < draw ? 0 : .4 * (1 - seg(t, draw, draw + 140)) }));
    if (!dodge) timeline("impact-flat", (t) => {
      const e = seg(t, T, T + 170), k = .3 + .7 * easeOut(e);
      return { opacity: t < T ? 0 : 1 - e, transform: `scale(${k.toFixed(3)}, ${(k * .45).toFixed(3)})` };
    });
    return holder;
  }

  /** Two clipped copies of the target card drift apart along the cut, then close back. */
  private splitCard(card: HTMLElement, T: number, cutAngle: number) {
    const rect = card.getBoundingClientRect(), bounds = this.root.getBoundingClientRect();
    const w = rect.width, h = rect.height, r = cutAngle * Math.PI / 180;
    const d = [Math.cos(r), Math.sin(r)], n = [-d[1], d[0]], far = 2 * (w + h);
    const at = (a: number, b: number) => `${(w / 2 + d[0] * a + n[0] * b).toFixed(1)}px ${(h / 2 + d[1] * a + n[1] * b).toFixed(1)}px`;
    for (const side of [1, -1]) {
      const clone = card.cloneNode(true) as HTMLElement;
      clone.setAttribute("aria-hidden", "true");
      clone.style.cssText = `position:absolute;left:${rect.left - bounds.left + this.root.scrollLeft}px;top:${rect.top - bounds.top + this.root.scrollTop}px;width:${w}px;height:${h}px;margin:0;translate:none;scale:none;opacity:0;pointer-events:none;z-index:19;clip-path:polygon(${at(-far, 0)},${at(far, 0)},${at(far, side * far)},${at(-far, side * far)})`;
      this.root.append(clone); this.nodes.add(clone);
      const ox = (side > 0 ? 3 : -2) * d[0] + side * 4 * n[0], oy = (side > 0 ? 3 : -2) * d[1] + side * 4 * n[1];
      const apart = `translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px) rotate(${side * 1.5}deg)`;
      const animation = this.animate(clone, [{ opacity: 1, transform: "none" }, { opacity: 1, transform: apart, offset: .2 }, { opacity: 1, transform: apart, offset: .68 }, { opacity: 1, transform: "none" }], { delay: T, duration: 380 });
      const remove = () => { clone.remove(); this.nodes.delete(clone); };
      void animation.finished.then(remove, remove);
    }
    this.animate(card, [{ opacity: 0 }, { opacity: 0 }], { delay: T, duration: 380 });
  }

  clear() {
    for (const animation of this.animations) animation.cancel();
    this.animations.clear();
    for (const node of this.nodes) node.remove();
    this.nodes.clear();
  }

  play({ style, from, to, impactAt, intensity = 1, weapon = "katana", support = false, dodge = false, targetCard = null, actorCard = null }: CombatVfxOptions) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dx = to.x - from.x, dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);
    const scale = Math.min(1, Math.max(.38, distance / 420)) * Math.min(1.4, intensity);
    const length = distance / scale;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const svg = document.createElementNS(NS, "svg");
    svg.classList.add("bt-cel-vfx");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("width", "1"); svg.setAttribute("height", "1");
    svg.style.cssText = `position:absolute;left:${from.x}px;top:${from.y}px;overflow:visible;pointer-events:none;z-index:20;`;
    const iai = style === "slash" && weapon === "iai" && !support;
    const art = style !== "slash" ? artwork(style) : iai ? iaiArtwork(length) : arcArtwork(length, weapon);
    svg.innerHTML = `<g transform="rotate(${angle}) scale(${scale})">${art}${iai ? "" : `<g transform="translate(${length} 0)"><g data-part="impact">${burst}</g></g>`}</g>`;
    this.root.append(svg); this.nodes.add(svg);
    const end = impactAt + (style !== "slash" ? 260 : iai ? 460 : 420);
    const run = (part: string, frames: Keyframe[], start: number, duration: number) => {
      const el = svg.querySelector(`[data-part="${part}"]`);
      if (!el) return;
      (el as SVGElement).style.opacity = "0";
      this.animate(el, frames, { delay: start, duration, fill: "both" });
    };
    const timeline = (part: string, frame: (t: number) => Keyframe) => run(part, sample(end, frame), 0, end);
    let holder: ((t: number) => Pose) | null = null;
    if (iai) {
      holder = this.iai(timeline, length, impactAt, dodge);
      if (targetCard && !dodge) this.splitCard(targetCard, impactAt, angle + IAI_TILT);
    } else if (style === "slash") {
      holder = this.arc(timeline, length, impactAt, weapon);
    } else if (style === "magic") {
      run("seal", [{ opacity: 0, transform: "scale(.7)" }, { opacity: 1, transform: "scale(1)", offset: .25 }, { opacity: 0, transform: "scale(1.15)" }], 0, impactAt + 80);
      run("projectile", [{ opacity: 0, transform: "translateX(40px) scale(.7)" }, { opacity: 1, transform: "translateX(55px)", offset: .2 }, { opacity: 1, transform: `translateX(${support ? 60 : length - 35}px)`, offset: 300 / 420 }, { opacity: 1, transform: `translateX(${support ? 60 : length - 35}px)`, offset: .8 }, { opacity: 0, transform: `translateX(${support ? 65 : length}px) scale(.7)` }], Math.max(0, impactAt - 300), 420);
    } else {
      const shoot = Math.max(0, impactAt - 70);
      run("weapon", [{ opacity: 0, transform: "translateX(-8px)" }, { opacity: 1, offset: .2 }, { opacity: 1, transform: "translateX(-5px)", offset: .65 }, { opacity: 0, transform: "none" }], 0, end);
      run("flash", [{ opacity: 0 }, { opacity: 1, offset: .12 }, { opacity: 0 }], shoot, 70);
      run("projectile", [{ opacity: 0, transform: "translateX(80px) scaleX(.2)" }, { opacity: 1, offset: .15 }, { opacity: 1, transform: `translateX(${support ? 100 : length}px) scaleX(1)`, offset: .85 }, { opacity: 0 }], shoot, 80);
      run("casing", [{ opacity: 0, transform: "translate(20px, -5px)" }, { opacity: 1, transform: "translate(15px, -20px) rotate(40deg)", offset: .4 }, { opacity: 0, transform: "translate(4px, 15px) rotate(100deg)" }], shoot, 250);
    }
    if (holder && actorCard) {
      // Local grip position -> screen offset of the card centre.
      const a = angle * Math.PI / 180, cos = Math.cos(a) * scale, sin = Math.sin(a) * scale, hold = holder;
      this.animate(actorCard, sample(end, (t) => {
        const p = hold(t), lift = 1 + .08 * Math.min(1, Math.hypot(p.x, p.y) / 40);
        return { transform: `translate(${(p.x * cos - p.y * sin).toFixed(1)}px, ${(p.x * sin + p.y * cos).toFixed(1)}px) rotate(${p.r.toFixed(2)}deg) scale(${lift.toFixed(3)})` };
      }), { duration: end });
    }
    if (!support && !dodge && !iai) run("impact", [{ opacity: 0, transform: "scale(.3)" }, { opacity: 1, transform: "scale(1)", offset: .15 }, { opacity: 0, transform: "scale(1.2)" }], impactAt, 220);
    // A single lifetime animation removes the whole drawing, including support effects.
    const lifetime = this.animate(svg, [{ opacity: 1 }, { opacity: 1 }], { duration: end + 100 });
    void lifetime.finished.then(() => { svg.remove(); this.nodes.delete(svg); }, () => { svg.remove(); this.nodes.delete(svg); });
  }
}
