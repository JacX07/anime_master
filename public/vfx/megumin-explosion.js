/* Original Canvas 2D spell study. No combat calculations, timers or external assets. */
(() => {
  const TIMING = Object.freeze({
    duration: 3600, cutIn: 100, cutInSettle: 260, cutInExit: 600, cutOut: 780,
    charge: 200, circle: 350, circleStagger: 180, circleSettle: 800, chargeFull: 1000,
    lightStart: 1100, zoomStart: 900, zoomPeak: 1750, zoomExit: 2100, zoomEnd: 2600,
    launch: 1500, impact: 1800, flash: 32, hitStop: 50, recoil: 320, hitLight: 280,
    title: 1630, titleFull: 1730, titleExit: 1950, titleEnd: 2120,
    shockwave: 1880, ringStagger: 85, ringDuration: 390, fireGrow: 260,
    debris: 1940, smoke: 2120, fireExit: 2150, fireEnd: 2500,
    smokeFull: 2450, smokeExit: 2650, smokeEnd: 3180,
    scorch: 2380, scorchFull: 2680, scorchExit: 3100, scorchEnd: 3550,
    collapse: 2860, collapseEnd: 3160, recover: 3000,
    damageRise: 450, damageHold: 1000, damageEnd: 1400,
  });
  const WORLD = Object.freeze({ width: 1000, height: 500, ground: 398 });
  const PALETTE = Object.freeze({ core: '#fff3c1', gold: '#ffce54', flame: '#ff761d', red: '#e33221', dark: '#61251d', ink: '#17191a', smoke: '#80776b' });
  const LIMITS = Object.freeze({ particles: 76, lowParticles: 30, smoke: 13, lowSmoke: 7, dpr: 2 });
  const clamp = v => Math.max(0, Math.min(1, v));
  const segment = (t, start, end) => clamp((t - start) / (end - start));
  const easeOut = v => 1 - (1 - v) ** 3;
  const ridge = [[0, 282], [120, 246], [228, 280], [365, 235], [505, 285], [640, 240], [790, 278], [910, 247], [1000, 282], [1000, 500], [0, 500]];
  const SHAPES = Object.freeze({
    robe: [[-65,90],[-44,24],[38,24],[74,90]],
    hair: [[-48,45],[-48,-42],[-34,-67],[23,-68],[48,-36],[52,52],[26,27],[22,-13],[-28,-14],[-28,35]],
    face: [[-33,-40],[30,-40],[34,0],[15,27],[-11,28],[-34,6]],
    fringe: [[-40,-45],[35,-50],[29,-11],[12,-33],[6,-8],[-9,-29],[-24,-10],[-22,-35]],
    hat: [[-63,-38],[-29,-111],[7,-123],[45,-42],[73,-30],[-76,-25]],
    band: [[-49,-53],[39,-62],[44,-49],[-55,-42]],
    collar: [[-25,42],[0,31],[29,42],[0,58]],
    opponent: [[-28,-24],[-15,-59],[13,-59],[28,-24]],
    cutIn: [[0,71],[760,102],[668,279],[0,245]],
    cutAccent: [[0,78],[378,95],[283,258],[0,240]],
  });

  /**
   * @typedef {{x:number,y:number,label:string,damage:number,hp:number,ko?:boolean,status?:string}} SpellTarget
   * @typedef {{duration?:number,color?:string,intensity?:number,seed?:number,quality?:'full'|'low',reducedMotion?:boolean,target?:{x:number,y:number},targets?:SpellTarget[],onEvent?:(event:{name:string,at:number})=>void}} ExplosionOptions
   */
  class MeguminExplosion {
    /** @param {HTMLCanvasElement} canvas @param {ExplosionOptions} options */
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.options = { duration: TIMING.duration, intensity: 1, seed: 89361, quality: 'full', reducedMotion: false, ...options };
      this.duration = Math.max(400, this.options.duration);
      this.intensity = Math.max(.5, Math.min(1.4, this.options.intensity));
      this.colors = { ...PALETTE, red: options.color || PALETTE.red };
      this.target = options.target || { x: 753, y: WORLD.ground };
      // Fixtures only: a combat caller supplies the server's damage, HP, statuses and KO.
      this.targets = options.targets || [
        { x: this.target.x - 94, y: this.target.y - 2, label: 'Cible A', damage: 1240, hp: .42, status: 'Brûlure' },
        { x: this.target.x + 9, y: this.target.y - 16, label: 'Cible B', damage: 1680, hp: 0, ko: true },
        { x: this.target.x + 113, y: this.target.y - 2, label: 'Cible C', damage: 1150, hp: .55, status: 'Brûlure' },
      ];
      let seed = this.options.seed >>> 0;
      const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      // Fixed pools, generated once. No particle objects or arrays allocated during drawing.
      this.particles = new Float32Array(LIMITS.particles * 6);
      for (let i = 0; i < this.particles.length; i++) this.particles[i] = random();
      this.events = [
        { name: 'charge', at: 0 }, { name: 'launch', at: TIMING.launch },
        { name: 'impact', at: TIMING.impact }, { name: 'results', at: TIMING.impact },
        { name: 'fallout', at: TIMING.debris },
      ];
      this.lastEventTime = -1;
      this.disposed = false;
      this.resize();
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, this.options.quality === 'low' ? 1 : LIMITS.dpr);
      this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
      this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
      this.cssScale = Math.min(rect.width / WORLD.width, rect.height / WORLD.height);
      this.scale = Math.min(this.canvas.width / WORLD.width, this.canvas.height / WORLD.height);
      this.offsetY = (this.canvas.height - WORLD.height * this.scale) / 2;
    }

    resetEvents() { this.lastEventTime = -1; }
    advance(ms) {
      const normalized = ms * TIMING.duration / this.duration;
      for (const event of this.events) {
        if (event.at > this.lastEventTime && event.at <= normalized) this.options.onEvent?.(event);
      }
      this.lastEventTime = normalized;
      this.draw(ms);
    }
    destroy() { this.disposed = true; this.ctx.setTransform(1, 0, 0, 1, 0, 0); this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); }

    ellipse(x, y, rx, ry, fill, alpha = 1) {
      if (rx <= 0 || ry <= 0 || alpha <= 0) return;
      const c = this.ctx;
      c.globalAlpha = clamp(alpha); c.fillStyle = fill; c.beginPath();
      c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
    }
    polygon(points, fill) {
      const c = this.ctx; c.fillStyle = fill; c.beginPath();
      for (let i = 0; i < points.length; i++) { if (i) c.lineTo(points[i][0], points[i][1]); else c.moveTo(points[i][0], points[i][1]); }
      c.closePath(); c.fill();
    }
    text(text, x, y, size, color, align = 'center') {
      const c = this.ctx; c.font = `700 ${size}px Georgia,serif`; c.textAlign = align;
      c.lineWidth = 5; c.strokeStyle = '#17191a'; c.strokeText(text, x, y); c.fillStyle = color; c.fillText(text, x, y);
    }
    /** Original witch portrait, rendered at both card and cut-in scale. */
    portrait(x, y, scale) {
      const c = this.ctx; c.save(); c.translate(x, y); c.scale(scale, scale);
      this.polygon(SHAPES.robe, '#8e302d');
      this.polygon(SHAPES.hair, '#2e2023');
      this.polygon(SHAPES.face, '#f2c8a5');
      this.polygon(SHAPES.fringe, '#392326');
      c.fillStyle = '#722929'; c.fillRect(-25, -7, 16, 5); c.fillRect(12, -7, 16, 5);
      c.fillStyle = '#ffe3a3'; c.fillRect(-17, -7, 4, 3); c.fillRect(18, -7, 4, 3);
      this.polygon(SHAPES.hat, '#252125');
      this.polygon(SHAPES.band, '#c09858');
      this.polygon(SHAPES.collar, '#debc79');
      c.restore();
    }
    circle(x, y, radius, angle, alpha) {
      if (radius <= 0 || alpha <= 0) return;
      const c = this.ctx; c.save(); c.translate(x, y); c.scale(1, .3); c.rotate(angle);
      c.globalAlpha = clamp(alpha); c.strokeStyle = this.colors.red; c.lineWidth = 2;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, 0, radius * (1 - i * .12), 0, Math.PI * 2); c.stroke(); }
      for (let side = 0; side < 2; side++) {
        c.beginPath(); for (let i = 0; i <= 3; i++) { const a = i * Math.PI * 2 / 3 + side * Math.PI; const px = Math.cos(a) * radius * .85, py = Math.sin(a) * radius * .85; if (i) c.lineTo(px, py); else c.moveTo(px, py); } c.stroke();
      }
      for (let i = 0; i < 28; i++) { const a = i * Math.PI / 14; c.save(); c.rotate(a); c.translate(radius * .94, 0); c.beginPath(); c.moveTo(-3, -4); c.lineTo(3, 4); c.moveTo(-3, 4); c.lineTo(0, -5); c.stroke(); c.restore(); }
      c.restore();
    }
    card(x, y, label, caster, t, target) {
      const c = this.ctx, hit = t >= TIMING.impact;
      const age = Math.max(0, t - TIMING.impact - TIMING.hitStop);
      const recoil = !caster && hit ? Math.sin(Math.min(1, age / TIMING.recoil) * Math.PI) * 18 : 0;
      const fall = caster ? easeOut(segment(t, TIMING.collapse, TIMING.collapseEnd)) : 0;
      c.save(); c.translate(x + recoil, y + fall * 8); c.rotate(caster ? fall * -.17 : recoil * .005);
      this.ellipse(0, 5, 43, 8, '#0c1110', .7);
      c.fillStyle = '#111816'; c.fillRect(-38, -113, 76, 115);
      c.strokeStyle = caster ? '#d5b575' : '#bc8bd2'; c.lineWidth = 1.5; c.strokeRect(-38, -113, 76, 115);
      c.save(); c.beginPath(); c.rect(-34, -109, 68, 86); c.clip(); c.fillStyle = caster ? '#572a28' : '#35443d'; c.fillRect(-34, -109, 68, 86);
      if (caster) this.portrait(0, -54, .43);
      else { this.ellipse(0, -73, 12, 15, '#c3b7a0'); this.polygon(SHAPES.opponent, '#1e2c2a'); }
      const illumination = hit ? 1 - segment(t, TIMING.impact + 30, TIMING.impact + TIMING.hitLight) : segment(t, TIMING.lightStart, TIMING.zoomPeak) * .2;
      c.globalAlpha = illumination * .75; c.fillStyle = hit ? '#ffe8bd' : this.colors.red; c.fillRect(-34, -109, 68, 86); c.globalAlpha = 1;
      if (!caster && hit && target.ko) { c.fillStyle = '#101413aa'; c.fillRect(-34, -109, 68, 86); }
      c.restore();
      c.fillStyle = '#e9e5dc'; c.font = '10px system-ui'; c.textAlign = 'center'; c.fillText(label, 0, -8);
      c.fillStyle = '#36433a'; c.fillRect(-30, -2, 60, 3); c.fillStyle = '#9caf7b'; c.fillRect(-30, -2, 60 * (!caster && hit ? target.hp : 1), 3);
      c.restore();
    }
    cutIn(t) {
      if (t < TIMING.cutIn || t > TIMING.cutOut) return;
      const c = this.ctx, enter = easeOut(segment(t, TIMING.cutIn, TIMING.cutInSettle)), leave = segment(t, TIMING.cutInExit, TIMING.cutOut);
      c.save(); c.translate((1 - enter) * -500 + leave ** 2 * 800, 0); c.globalAlpha = 1 - leave;
      this.polygon(SHAPES.cutIn, '#651f24');
      this.polygon(SHAPES.cutAccent, '#b23e2d');
      c.save(); c.beginPath(); c.rect(0, 80, 345, 180); c.clip(); this.portrait(166, 188, 1.7); c.restore();
      this.text('Megumin', 377, 162, 38, '#f7e6bb', 'left');
      this.text('EXPLOSION', 370, 220, 47, '#f7e6bb', 'left');
      c.restore();
    }
    results(t) {
      if (t < TIMING.impact) return;
      const c = this.ctx, age = t - TIMING.impact;
      for (const target of this.targets) {
        // State is supplied by the fixture/server. Rendering never determines damage or KO.
        const lift = this.options.reducedMotion ? 0 : easeOut(segment(age, TIMING.hitStop, TIMING.damageRise)) * 18;
        c.save(); c.translate(target.x, target.y - 139 - lift - (target.ko ? 24 : 0));
        const visible = this.options.reducedMotion ? 1 : 1 - segment(age, TIMING.damageHold, TIMING.damageEnd);
        if (visible > 0) { c.globalAlpha = visible; c.fillStyle = '#171b18'; c.fillRect(-49, -27, 98, 41); this.text('−' + target.damage, 0, 4, this.cssScale < .6 ? 30 : 24, this.colors.core); }
        c.globalAlpha = 1; c.font = '700 11px system-ui'; c.textAlign = 'center';
        const status = target.ko ? 'KO' : target.status || '';
        if (status) { c.fillStyle = '#171b18'; c.fillRect(-47, 25, 94, 25); c.fillStyle = target.ko ? '#e4b5b0' : '#e9bf71'; c.font = `700 ${this.cssScale < .6 ? 19 : 11}px system-ui`; c.fillText(status, 0, 43); }
        c.restore();
      }
    }
    draw(ms) {
      if (this.disposed) return;
      const c = this.ctx, reduced = this.options.reducedMotion;
      const raw = Math.max(0, Math.min(TIMING.duration, ms * TIMING.duration / this.duration));
      // Freeze the explosion and world for exactly three frames at 60 Hz. Results remain immediate.
      const t = raw >= TIMING.impact && raw < TIMING.impact + TIMING.hitStop ? TIMING.impact : raw;
      const x = this.target.x, y = this.target.y, p = this.particles, colors = this.colors;
      const u = (t - TIMING.impact) / 1000;
      c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#1a2220'; c.fillRect(0, 0, this.canvas.width, this.canvas.height);
      c.setTransform(this.scale, 0, 0, this.scale, 0, this.offsetY);
      c.save();
      if (!reduced) {
        const zoom = 1 + .035 * segment(t, TIMING.zoomStart, TIMING.zoomPeak) * (1 - segment(t, TIMING.zoomExit, TIMING.zoomEnd));
        const shake = u >= 0 && u < .25 ? Math.sin(u * 112) * 5 * (1 - u / .25) * this.intensity : 0;
        c.translate(500 + shake, 250 + shake * .3); c.scale(zoom, zoom); c.translate(-500, -250);
      }
      this.polygon(ridge, '#29342d'); c.fillStyle = '#35392e'; c.fillRect(0, WORLD.ground, 1000, 102);
      for (let i = 0; i < 22; i++) { const a = i * 6; c.fillStyle = '#454b39'; c.fillRect(p[a] * 1000, 410 + p[a + 1] * 80, 8 + p[a + 2] * 18, 1); }
      const darken = reduced ? 0 : .64 * segment(t, TIMING.charge, TIMING.chargeFull) * (1 - segment(t, TIMING.impact + TIMING.hitStop, TIMING.smokeFull));
      c.globalAlpha = darken; c.fillStyle = '#080e11'; c.fillRect(0, 0, 1000, 500); c.globalAlpha = 1;
      if (!reduced && t > TIMING.charge && t < TIMING.impact) {
        const charge = segment(t, TIMING.charge, TIMING.launch), end = 1 - segment(t, TIMING.launch, TIMING.impact);
        this.ellipse(x, y, 154 * charge, 26 * charge, colors.red, .15 * charge);
        this.circle(166, 402, 76 * easeOut(charge), t * .0004, charge);
        for (let i = 0; i < 3; i++) { const appear = easeOut(segment(t, TIMING.circle + i * TIMING.circleStagger, TIMING.circleSettle + i * TIMING.circleStagger)); this.circle(x, 129 + i * 64, 135 * appear * end + 16 * (1 - end), t * .0003 * (i % 2 ? -1 : 1), appear * end); }
        const count = this.options.quality === 'low' ? 16 : 34;
        for (let i = 0; i < count; i++) { const a = i * 6, progress = (t * .0005 + p[a]) % 1, angle = p[a + 1] * Math.PI * 2, radius = (1 - progress) * 130; this.ellipse(166 + Math.cos(angle) * radius, 334 + Math.sin(angle) * radius * .7, 1 + progress * 2, 2 + progress * 4, colors.gold, progress * charge); }
        const shot = segment(t, TIMING.launch, TIMING.impact);
        if (shot > 0) {
          const fly = shot ** 2, px = 195 + (x - 195) * fly, py = 305 - Math.sin(fly * Math.PI) * 135;
          c.fillStyle = colors.red; c.beginPath(); c.moveTo(px - 82 * shot, py + 14); c.lineTo(px + 14, py - 5); c.lineTo(px + 4, py + 10); c.closePath(); c.fill();
          this.ellipse(px, py, 13, 7, colors.core);
          this.ellipse(x, y, 25 + shot * 40, 6 + shot * 6, colors.gold, shot * .6);
          c.fillStyle = colors.red; c.globalAlpha = shot * .5; c.fillRect(x - 1, 102, 2, y - 102); c.globalAlpha = 1;
        }
      }
      this.card(166, 399, 'Megumin', true, t);
      for (const target of this.targets) this.card(target.x, target.y, target.label, false, reduced ? raw : t, target);
      if (raw >= TIMING.impact && !reduced) {
        const flash = 1 - segment(raw, TIMING.impact, TIMING.impact + TIMING.flash);
        if (flash > 0) { c.globalAlpha = flash * .5; c.fillStyle = colors.core; c.fillRect(0, 0, 1000, 500); c.globalAlpha = 1; }
        const growth = .25 + .75 * easeOut(segment(t, TIMING.impact, TIMING.impact + TIMING.fireGrow));
        const flameAlpha = 1 - segment(t, TIMING.fireExit, TIMING.fireEnd);
        if (flameAlpha > 0) {
          c.save(); c.translate(x, y); c.scale(growth * this.intensity, growth * this.intensity); c.globalAlpha = flameAlpha;
          // Jagged silhouette, four tones, uneven lobes: no uniform scalloped dome.
          c.fillStyle = colors.dark; c.beginPath(); c.moveTo(-164, 0); c.bezierCurveTo(-208, -40, -163, -90, -133, -105); c.lineTo(-153, -177); c.lineTo(-95, -149); c.bezierCurveTo(-138, -247, -53, -238, -39, -268); c.lineTo(-20, -331); c.lineTo(16, -282); c.bezierCurveTo(63, -312, 94, -247, 84, -213); c.lineTo(151, -247); c.lineTo(126, -165); c.bezierCurveTo(221, -154, 173, -64, 196, -35); c.lineTo(171, 0); c.closePath(); c.fill();
          c.fillStyle = colors.red; c.beginPath(); c.moveTo(-147, 0); c.bezierCurveTo(-170, -74, -98, -96, -115, -148); c.lineTo(-65, -133); c.bezierCurveTo(-78, -212, -9, -210, -14, -269); c.bezierCurveTo(34, -225, 78, -222, 66, -165); c.lineTo(124, -190); c.lineTo(110, -122); c.bezierCurveTo(184, -94, 150, -36, 158, 0); c.closePath(); c.fill();
          c.fillStyle = colors.flame; c.beginPath(); c.moveTo(-112, 0); c.bezierCurveTo(-141, -71, -55, -88, -74, -137); c.lineTo(-31, -118); c.lineTo(2, -223); c.bezierCurveTo(22, -132, 90, -161, 73, -91); c.bezierCurveTo(138, -85, 119, -30, 129, 0); c.closePath(); c.fill();
          c.fillStyle = colors.core; c.beginPath(); c.moveTo(-73, 0); c.bezierCurveTo(-94, -42, -32, -66, -26, -98); c.lineTo(4, -77); c.lineTo(15, -139); c.bezierCurveTo(33, -69, 79, -64, 83, 0); c.closePath(); c.fill();
          c.restore();
        }
        for (let ring = 0; ring < 2; ring++) {
          const progress = segment(t, TIMING.shockwave + ring * TIMING.ringStagger, TIMING.shockwave + TIMING.ringDuration + ring * TIMING.ringStagger);
          if (progress > 0 && progress < 1) { c.save(); c.translate(x, y); c.scale(1, .24); c.strokeStyle = ring ? colors.gold : colors.core; c.globalAlpha = 1 - progress; c.lineWidth = 5 - ring * 2; c.beginPath(); c.arc(0, 0, 310 * easeOut(progress), 0, Math.PI * 2); c.stroke(); c.restore(); }
        }
        const count = this.options.quality === 'low' ? LIMITS.lowParticles : LIMITS.particles;
        for (let i = 0; i < count; i++) {
          const a = i * 6, age = (t - TIMING.debris) / 1000 - p[a] * .16;
          if (age < 0 || age > .7 + p[a + 5] * .5) continue;
          const angle = Math.PI + p[a + 1] * Math.PI, velocity = 110 + p[a + 2] * 360;
          const px = x + Math.cos(angle) * velocity * age, py = y + Math.sin(angle) * velocity * age + 200 * age * age;
          if (py > y + 10) continue;
          c.save(); c.translate(px, py); c.rotate(p[a + 3] * 6 + age * 5); c.globalAlpha = 1 - segment(age, .4, 1.2); c.fillStyle = i % 4 ? colors.gold : '#514b3b'; c.fillRect(-2, -3, 2 + p[a + 4] * 5, 6 + p[a + 5] * 12); c.restore();
        }
        const smokeCount = this.options.quality === 'low' ? LIMITS.lowSmoke : LIMITS.smoke;
        const smoke = segment(t, TIMING.smoke, TIMING.smokeFull) * (1 - segment(t, TIMING.smokeExit, TIMING.smokeEnd));
        for (let i = 0; i < smokeCount; i++) { const a = i * 6, age = Math.max(0, t - TIMING.smoke) / 1000; const side = i % 2 ? 1 : -1; this.ellipse(x + side * (20 + p[a] * 150 + age * 65), y - 15 - p[a + 1] * 90 - age * 14, 17 + p[a + 2] * 39, 13 + p[a + 3] * 27, i % 3 ? colors.smoke : '#4e5045', smoke * .65); }
        const scorch = segment(t, TIMING.scorch, TIMING.scorchFull) * (1 - segment(t, TIMING.scorchExit, TIMING.scorchEnd));
        this.ellipse(x, y + 4, 105, 18, '#171e18', scorch);
      }
      c.restore();
      // Results and labels stay above all flames, smoke and camera movement.
      this.results(raw);
      if (!reduced) {
        this.cutIn(t);
        const titleAlpha = segment(t, TIMING.title, TIMING.titleFull) * (1 - segment(t, TIMING.titleExit, TIMING.titleEnd));
        if (titleAlpha > 0) { c.save(); c.globalAlpha = titleAlpha; c.translate(500, 83); c.rotate(-.045); this.text('EXPLOSION !', 0, 0, 53, colors.core); c.restore(); }
      }
    }
  }
  window.MeguminExplosion = MeguminExplosion;
  window.MEGUMIN_TIMING = TIMING;
})();
