// Exterior + graphic scenes: Harbour Street, the memory storm, the window,
// the violent tunnel, the Loom, black frames, titles, the HUD clock, credits.
import { W, H, FONTS, glow, additive, vGradient, poly, smoothPath, setFont, fillScreen, strokeGlowPath, lightningPath, text, withAlpha } from '../draw.js';
import { drawSkyline, drawBruise, drawBirds, drawRain, drawEarth, drawStars, drawIncursionSky } from '../world.js';
import { humanoid, makePose, maskedFigure } from '../figures.js';
import { drawKey } from './execution.js';
import { clamp, lerp, ease, hash, hashRange, mulberry32, rgba, smoothstep, TAU, fract } from '../util.js';

// ── HARBOUR STREET ───────────────────────────────────────────────────────────
function facades(ctx, night, T) {
  const base = 880;
  const fronts = [
    { x: -40, w: 420, h: 560, col: '#3a2a22', name: 'CHANDLERY' },
    { x: 380, w: 560, h: 620, col: '#2e2420', name: 'THORNE ARCHIVAL', ours: true },
    { x: 940, w: 400, h: 540, col: '#33261e', name: 'BOOKS & MAPS' },
    { x: 1340, w: 620, h: 600, col: '#2b221c', name: 'HARBOUR TEA ROOM' },
  ];
  for (const f of fronts) {
    const g = vGradient(ctx, 0, base - f.h, 0, base, [[0, night ? '#120d10' : f.col], [1, night ? '#08060a' : '#160f0b']]);
    ctx.fillStyle = g;
    ctx.fillRect(f.x, base - f.h, f.w, f.h);
    // upper windows
    for (let i = 0; i < 3; i++) {
      const wx = f.x + 50 + i * ((f.w - 100) / 3);
      const lit = night ? hash(i + f.x, 201) > 0.5 : false;
      ctx.fillStyle = lit ? '#ffb066' : night ? '#0b0d18' : '#5d6f86';
      ctx.fillRect(wx, base - f.h + 70, (f.w - 160) / 3, 120);
      if (lit) additive(ctx, () => glow(ctx, wx + 50, base - f.h + 130, 120, '#ffb066', 0.25));
    }
    // sign board
    ctx.fillStyle = night ? '#0c0a08' : '#1a120c';
    ctx.fillRect(f.x + 30, base - 330, f.w - 60, 70);
    const flick = f.ours && night ? (hash(Math.floor(T * 14), 211) > 0.18 ? 1 : 0.25) : 1;
    text(ctx, f.name, f.x + f.w / 2, base - 295, { family: FONTS.title, size: f.ours ? 40 : 32, weight: 700, color: f.ours ? (night ? `rgba(255,190,110,${flick})` : '#e8c88a') : night ? '#5a4a3a' : '#c9b48a', spacing: 4 });
    if (f.ours && night) additive(ctx, () => glow(ctx, f.x + f.w / 2, base - 295, 300, '#ffb066', 0.3 * flick));
    // shop window + door
    ctx.fillStyle = night ? (f.ours ? '#3a2410' : '#0d0b10') : '#28323d';
    ctx.fillRect(f.x + 40, base - 240, f.w * 0.55, 220);
    if (f.ours && night) additive(ctx, () => glow(ctx, f.x + 40 + f.w * 0.27, base - 130, 220, '#ffb066', 0.35));
    ctx.fillStyle = night ? '#0a0806' : '#1a120c';
    ctx.fillRect(f.x + f.w * 0.7, base - 250, f.w * 0.2, 250);
  }
  // pavement + cobbles
  ctx.fillStyle = night ? '#07060a' : '#2a2622';
  ctx.fillRect(0, base, W, H - base);
  ctx.strokeStyle = night ? 'rgba(120,110,140,0.12)' : 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(0, base + 20 + i * i * 6);
    ctx.lineTo(W, base + 20 + i * i * 6);
    ctx.stroke();
  }
  // lamppost
  ctx.fillStyle = '#060508';
  ctx.fillRect(1030, 380, 14, 520);
  ctx.fillRect(1010, 360, 54, 40);
  if (night) {
    additive(ctx, () => glow(ctx, 1037, 380, 360, '#ffb066', 0.5));
    // wet reflections
    additive(ctx, () => {
      const g = ctx.createLinearGradient(0, base, 0, H);
      g.addColorStop(0, 'rgba(255,176,102,0.25)');
      g.addColorStop(1, 'rgba(255,176,102,0)');
      ctx.fillStyle = g;
      ctx.fillRect(1000, base, 80, H - base);
      ctx.fillStyle = 'rgba(255,190,110,0.1)';
      ctx.fillRect(560, base, 160, H - base);
    });
  }
}

export function street(ctx, s) {
  const { T, t } = s;
  const night = s.params.night;
  const bruise = s.v('bruise', 0);
  if (night) {
    fillScreen(ctx, vGradient(ctx, 0, 0, 0, H, [[0, '#05060e'], [1, '#121426']]));
    drawStars(ctx, T, { count: 60, alpha: 0.25, h: 300 });
  } else {
    fillScreen(ctx, vGradient(ctx, 0, 0, 0, H * 0.6, [[0, '#4f7fb6'], [1, '#c4d6e6']]));
    drawBruise(ctx, T, bruise, { reach: 380 });
    const birdsFrozen = s.params.birds === 'resume' ? 0 : bruise > 0.45 ? 1 : 0;
    drawBirds(ctx, T, { count: 24, y: 90, x: 300, spread: 1200, spreadY: 140, frozen: birdsFrozen, freezeAt: s.shotStart + 4, color: '#16101c' });
  }
  facades(ctx, night, T);
  // people
  if (s.params.people) {
    const look = smoothstep(0.15, 0.6, bruise);
    // [x, height, facing, ground y]: smaller figures stand further back
    const crowd = [[150, 430, 1, 1040], [300, 380, -1, 1000], [1200, 400, 1, 1010], [1520, 450, -1, 1050], [1700, 360, 1, 995], [1380, 340, 1, 990], [520, 330, 1, 985]];
    crowd.forEach(([x, h, d, gy], i) => {
      const phone = look > 0.5 && i % 2 === 0;
      const r = humanoid(ctx, x, gy, h, {
        costume: i % 3 === 1 ? 'personAlt' : 'person',
        body: '#0c0a0e',
        rim: bruise > 0.3 ? '#c98cff' : '#e0d2c0',
        rimDy: -2,
        dir: d,
        pose: makePose('stand', phone ? 'phone' : null),
        headTilt: -0.35 * look,
        t: T + i,
      });
      if (phone) additive(ctx, () => glow(ctx, r.handF[0], r.handF[1], 40, '#bfe0ff', 0.9));
    });
    if (s.params.child) {
      humanoid(ctx, 1290, 1030, 470, { costume: 'personAlt', body: '#0c0a0e', rim: '#c98cff', rimDy: -2, dir: -1, headTilt: -0.3, t: T });
      humanoid(ctx, 1215, 1030, 250, { costume: 'child', body: '#0c0a0e', rim: '#e0b8ff', rimDy: -2, dir: 1, pose: makePose('stand', 'pointUp'), headTilt: -0.5, t: T });
    }
  }
  if (s.params.elias) humanoid(ctx, 800, 1040, 500, { costume: 'elias', body: '#0a0705', rim: bruise > 0.3 ? '#d6a0ff' : '#ffd28a', rimDy: -2, dir: 1, headTilt: -0.4 * smoothstep(0.2, 0.7, bruise), bare: true, t: T });
  if (night && s.params.rain) drawRain(ctx, T, { count: 320, speed: 1100, color: 'rgba(180,200,255,0.3)' });
  if (bruise > 0) fillScreen(ctx, rgba('#2a0838', 0.18 * bruise));
}

// ── WHISPERS: every object remembers at once ─────────────────────────────────
const MEMORIES = [
  'CAST IRON, 1891', 'SHE WAITED HERE EVERY TUESDAY', 'THE GLASSBLOWER BURNED HIS THUMB', 'FIRST KISS — 1974',
  'BRICK · KILN No. 4', 'HE NEVER CAME BACK', 'PAINTED BY HAND, 1952', 'A CHILD SCRATCHED HER NAME HERE',
  'THE LAST TRAM, 1961', 'CARVED FROM SHIP TIMBER', 'IT WAS RAINING THAT DAY', 'BLOWN GLASS · MURANO',
  'SOMEONE CRIED HERE', 'FORGED IN THE GREAT FROST', 'HE PROPOSED BY THIS LAMP', 'THE BELL WAS RECAST TWICE',
  'SHE NEVER OPENED IT', 'EVERY SECOND', 'NINE SECONDS', 'REMEMBER ME',
];
export function whispers(ctx, s) {
  const { T, t } = s;
  street(ctx, { ...s, params: { bruise: 1, people: true }, v: (n, d) => (n === 'bruise' ? 1 : d) });
  fillScreen(ctx, 'rgba(8,2,14,0.55)');
  // memories flying out of the screen
  const n = 70;
  for (let i = 0; i < n; i++) {
    const life = 2.2 + hash(i, 221) * 1.6;
    const born = hash(i, 222) * 9 - 1.5;
    const u = (t - born) / life;
    if (u < 0 || u > 1) continue;
    const z = lerp(0.2, 2.6, ease.inCubic(u));
    const ax = hashRange(i, 223, -1, 1), ay = hashRange(i, 224, -1, 1);
    const x = W / 2 + ax * 520 * z, y = H * 0.45 + ay * 300 * z;
    const word = MEMORIES[i % MEMORIES.length];
    const serif = i % 3 === 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(hashRange(i, 225, -0.15, 0.15));
    ctx.globalAlpha = Math.min(smoothstep(0, 0.15, u), 1 - smoothstep(0.75, 1, u));
    setFont(ctx, serif ? FONTS.serif : FONTS.type, 30 * z, serif ? 600 : 400, serif ? 'italic' : 'normal');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = i % 5 === 0 ? '#ffd27a' : i % 5 === 1 ? '#e6c6ff' : '#f2ead8';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 12;
    ctx.fillText(word, 0, 0);
    ctx.restore();
  }
  // Elias in the centre, clutching his head
  humanoid(ctx, W / 2, 1000, 720, { costume: 'elias', body: '#050306', rim: '#ffd27a', rimDy: -2, dir: 1, pose: makePose('stand', 'clutch'), lean: 0.05 * Math.sin(T * 7), bare: true, t: T });
  additive(ctx, () => glow(ctx, W / 2, 420, 300, '#ffd27a', 0.25 + 0.15 * Math.sin(T * 9)));
  // nine-second counter
  const sec = Math.min(9, Math.floor(t) + 1);
  text(ctx, `${String(sec).padStart(2, '0')}`, W - 140, 140, { family: FONTS.mono, size: 64, weight: 700, color: 'rgba(255,120,220,0.7)' });
}

// ── WINDOW (the second Earth on the horizon) ─────────────────────────────────
export function windowScene(ctx, s) {
  const { T, t } = s;
  fillScreen(ctx, '#050307');
  const wx = 420, wy = 90, ww = 1080, wh = 820;
  ctx.save();
  ctx.beginPath();
  ctx.rect(wx, wy, ww, wh);
  ctx.clip();
  fillScreen(ctx, vGradient(ctx, 0, wy, 0, wy + wh, [[0, '#04040c'], [0.7, '#140a24'], [1, '#2a1238']]));
  drawStars(ctx, T, { count: 180, alpha: 0.7, h: 700 });
  // the other Earth rising, pale and enormous
  const rise = lerp(0, 40, s.p);
  drawEarth(ctx, W * 0.55, H * 1.62 - rise, 1150, { palette: 'pale', atmo: '#c9a6ff', atmoAlpha: 0.6, alpha: 0.85, rot: 0.6, light: { x: -0.5, y: -0.8 }, seed: 9 });
  additive(ctx, () => glow(ctx, W * 0.55, H * 0.6, 900, '#b48cff', 0.18));
  ctx.save();
  ctx.translate(0, 60);
  drawSkyline(ctx, { t: 0, fill: '#0a0710', fillBottom: '#030205', rim: '#8f6ccf', windows: 0.15, windowColor: '#ffb066', clock: { h: 10, m: 41, face: '#9a8fb0' }, farLayer: false });
  ctx.restore();
  ctx.restore();
  // the blind going up
  const b = s.v('blind', 1);
  const slats = 22;
  const visibleH = wh * (1 - b);
  for (let i = 0; i < slats; i++) {
    const y = wy + (i / slats) * visibleH;
    ctx.fillStyle = i % 2 ? '#1a1410' : '#16110d';
    ctx.fillRect(wx, y, ww, visibleH / slats + 1);
  }
  ctx.fillStyle = '#0c0907';
  ctx.fillRect(wx, wy + visibleH - 6, ww, 16);
  // frame + mullions
  ctx.strokeStyle = '#0a0705';
  ctx.lineWidth = 28;
  ctx.strokeRect(wx, wy, ww, wh);
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(wx + ww / 2, wy);
  ctx.lineTo(wx + ww / 2, wy + wh);
  ctx.moveTo(wx, wy + wh / 2);
  ctx.lineTo(wx + ww, wy + wh / 2);
  ctx.stroke();
  // Seren in silhouette at the window
  humanoid(ctx, wx + 140, 1080, 900, { costume: 'seren', body: '#030205', rim: '#b48cff', rimDy: -2, dir: 1, pose: makePose('stand', { elF: [0.13, -0.8], haF: [0.13, -0.92] }), t: T, sigil: 0.5 });
}

// ── TUNNEL (violent retrospection) ───────────────────────────────────────────
export function tunnel(ctx, s) {
  const { t, T } = s;
  fillScreen(ctx, '#05010a');
  const cx = W / 2 + Math.sin(T * 3) * 30, cy = H / 2 + Math.cos(T * 2.3) * 20;
  // shattering shop for the first moment
  if (t < 0.9) {
    const k = t / 0.9;
    for (let i = 0; i < 40; i++) {
      const a = hash(i, 231) * TAU;
      const d = ease.inCubic(k) * hashRange(i, 232, 300, 1400);
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(k * hashRange(i, 233, -6, 6));
      ctx.fillStyle = rgba(i % 2 ? '#3a2716' : '#ffd28a', 1 - k);
      ctx.beginPath();
      poly(ctx, [[0, -60], [70, 30], [-50, 50]].map(([px, py]) => [px * hashRange(i, 234, 0.6, 2), py * hashRange(i, 235, 0.6, 2)]));
      ctx.fill();
      ctx.restore();
    }
  }
  // speed lines
  additive(ctx, () => {
    for (let i = 0; i < 220; i++) {
      const a = hash(i, 241) * TAU;
      const sp = hashRange(i, 242, 0.6, 1.6);
      const u = fract(hash(i, 243) + T * sp * 0.9);
      const r0 = lerp(30, 1400, u * u), r1 = r0 * (1.1 + u * 0.6);
      const col = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#b678ff' : '#ff6be0';
      ctx.strokeStyle = rgba(col, 0.15 + 0.6 * u);
      ctx.lineWidth = 1 + u * 3;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.stroke();
    }
    glow(ctx, cx, cy, 500, '#ffffff', 0.4);
    glow(ctx, cx, cy, 1100, '#8a3cff', 0.35);
  });
  // thousands of Earths rushing past
  for (let i = 0; i < 46; i++) {
    const a = hash(i, 251) * TAU;
    const u = fract(hash(i, 252) + T * 0.35);
    const z = u * u;
    const r = lerp(40, 1300, z);
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.8;
    const size = lerp(4, 170, z);
    drawEarth(ctx, x, y, size, { atmo: i % 2 ? '#c58cff' : '#ff6be0', atmoAlpha: 0.7, alpha: smoothstep(0, 0.2, u), rot: i, seed: 3 + (i % 3), palette: i % 4 === 0 ? 'pale' : 'earth' });
  }
}

// ── LOOM (Atropos) ───────────────────────────────────────────────────────────
export function loom(ctx, s) {
  const { t, T } = s;
  fillScreen(ctx, '#030206');
  const flare = s.events.flare ?? 3;
  const snip = s.events.snip ?? 8;
  const n = 120;
  const cutIdx = 64, flareIdx = 66;
  additive(ctx, () => {
    for (let i = 0; i < n; i++) {
      const x0 = (i / n) * W * 1.2 - W * 0.1;
      const depth = hash(i, 261);
      let col = depth > 0.7 ? '#f4e7c3' : depth > 0.35 ? '#c9a2ff' : '#8ff3ff';
      let a = 0.08 + depth * 0.22;
      if (i === flareIdx && t > flare) {
        col = '#ffd27a';
        a = 0.9;
      }
      const cut = i === cutIdx && t > snip;
      const recoil = cut ? ease.outCubic(clamp((t - snip) / 1.2)) : 0;
      ctx.strokeStyle = rgba(col, a);
      ctx.lineWidth = 1 + depth * 2 + (i === flareIdx && t > flare ? 2 : 0);
      ctx.beginPath();
      for (let y = -20; y <= H + 20; y += 30) {
        if (cut && y > H * 0.42 - 0 && y < H * 0.42 + 30) {
          ctx.stroke();
          ctx.beginPath();
          continue;
        }
        const wob = Math.sin(y * 0.01 + T * (0.5 + depth) + i) * 6 * (1 + depth);
        // a cut thread recoils away from the snip point
        const yy = cut ? (y < H * 0.42 ? y - recoil * (H * 0.42 - y) * 0.6 : y + recoil * (y - H * 0.42) * 0.6) : y;
        y === -20 ? ctx.moveTo(x0 + wob, yy) : ctx.lineTo(x0 + wob, yy);
      }
      ctx.stroke();
      if (i === flareIdx && t > flare) glow(ctx, x0, H * 0.42, 220, '#ffd27a', 0.5 * smoothstep(flare, flare + 0.6, t));
    }
  });
  // Atropos
  const reach = smoothstep(0.5, 3, t);
  const m = maskedFigure(ctx, W * 0.66, H * 1.05, 980, { t: T, reach });
  // silver scissors
  const sk = smoothstep(snip - 1.6, snip - 0.4, t);
  if (sk > 0) {
    const sx = lerp(W * 0.8, W * 0.56, sk), sy = H * 0.42;
    const close = t > snip ? 1 : 0;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.strokeStyle = '#d9dee6';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    const open = lerp(0.35, 0.02, close);
    for (const sgn of [-1, 1]) {
      ctx.save();
      ctx.rotate(sgn * open);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-170, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(46, sgn * 22, 26, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    if (close) additive(ctx, () => glow(ctx, sx - 120, sy, 120, '#ffffff', 0.9 * (1 - clamp((t - snip) / 0.5))));
  }
  // far away, a world winks out
  if (t > snip + 0.5) {
    const k = clamp((t - snip - 0.5) / 1.6);
    additive(ctx, () => glow(ctx, W * 0.18, H * 0.25, 40 + k * 400, '#ffffff', (1 - k) * 0.9));
  }
}

// ── BLACK ────────────────────────────────────────────────────────────────────
export function black(ctx, s) {
  fillScreen(ctx, '#000000');
  const { t, T } = s;
  for (const f of s.params.flashes || []) {
    if (t >= f && t < f + 0.09) {
      drawIncursionSky(ctx, T, { intensity: 1.5, cy: -700 });
      if (s.params.hand) humanoid(ctx, W * 0.5, H * 1.4, 1600, { costume: 'seren', body: '#000', rim: '#ff7ae6', dir: 1, pose: makePose('stand', 'reachFar'), t: T });
    }
  }
}

// ── TITLE ────────────────────────────────────────────────────────────────────
export function title(ctx, s) {
  const { t, T } = s;
  fillScreen(ctx, '#020104');
  const shatterAt = 7.5;
  if (t < shatterAt) {
    const form = smoothstep(0.5, 6.0, t);
    additive(ctx, () => {
      for (let i = 0; i < 60; i++) {
        const a = hash(i, 271) * TAU + T * 0.3;
        const r = lerp(1100, 0, form) * hashRange(i, 272, 0.5, 1.3) + 40;
        ctx.strokeStyle = rgba(i % 2 ? '#c58cff' : '#ffd27a', 0.35);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r * 0.6);
        ctx.quadraticCurveTo(W / 2 + Math.cos(a + 1) * r * 0.5, H / 2 + Math.sin(a + 1) * r * 0.3, W / 2, H / 2);
        ctx.stroke();
      }
    });
    drawKey(ctx, W / 2 + 60, H / 2, 420, { T, alpha: form, glow: 0.5 + form, rot: -0.12 + Math.sin(T * 0.6) * 0.05, crack: smoothstep(6.4, 7.4, t) });
    return;
  }
  const u = t - shatterAt;
  // shards flying outward
  for (let i = 0; i < 60; i++) {
    const a = hash(i, 281) * TAU;
    const d = ease.outCubic(clamp(u / 1.6)) * hashRange(i, 282, 200, 1200);
    const x = W / 2 + Math.cos(a) * d, y = H / 2 + Math.sin(a) * d * 0.6;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(u * hashRange(i, 283, -5, 5));
    ctx.globalAlpha = clamp(1 - u / 2.5);
    ctx.fillStyle = i % 3 ? '#0d0812' : '#9b5cff';
    ctx.beginPath();
    poly(ctx, [[0, -24], [30, 10], [-20, 22]]);
    ctx.fill();
    ctx.restore();
  }
  additive(ctx, () => glow(ctx, W / 2, H / 2, 900, '#9b5cff', 0.5 * Math.exp(-u * 1.2) + 0.1));
  // title letters assembling
  const titleStr = 'THE ANCHOR OF YESTERDAY';
  // fit the title inside the frame with a margin, whatever the font metrics
  setFont(ctx, FONTS.title, 104, 700);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '10px';
  const fitSize = Math.min(104, (104 * 1640) / ctx.measureText(titleStr).width);
  setFont(ctx, FONTS.title, fitSize, 700);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const tw = ctx.measureText(titleStr).width;
  let x = W / 2 - tw / 2;
  const fadeOut = 1 - smoothstep(s.dur - shatterAt - 1.2, s.dur - shatterAt, u);
  [...titleStr].forEach((ch, i) => {
    const w = ctx.measureText(ch).width + 10;
    const k = ease.outCubic(clamp((u - 0.1 - i * 0.035) / 0.9));
    const fromA = hash(i, 291) * TAU;
    const ox = Math.cos(fromA) * 500 * (1 - k), oy = Math.sin(fromA) * 300 * (1 - k);
    ctx.save();
    ctx.globalAlpha = k * fadeOut;
    ctx.fillStyle = '#f4ecdc';
    ctx.shadowColor = '#9b5cff';
    ctx.shadowBlur = 30;
    ctx.translate(x + ox, H * 0.46 + oy);
    ctx.rotate((1 - k) * hashRange(i, 292, -2, 2));
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    x += w - 10;
  });
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  const sub = smoothstep(2.4, 3.4, u) * fadeOut;
  text(ctx, 'EPISODE ONE', W / 2, H * 0.6, { family: FONTS.mono, size: 26, weight: 500, color: '#c9a2ff', alpha: sub, spacing: 14 });
  text(ctx, 'Two Skies, One Grave', W / 2, H * 0.66, { family: FONTS.serif, size: 50, weight: 500, style: 'italic', color: '#f4ecdc', alpha: sub });
}

// ── CLOCK (the nine-day HUD) ─────────────────────────────────────────────────
export function clock(ctx, s) {
  const { t, T } = s;
  fillScreen(ctx, '#000');
  const from = s.params.from ?? 9 * 86400 - 1;
  const v = from - (t >= 1 ? 1 : 0);
  const d = Math.floor(v / 86400), h = Math.floor((v % 86400) / 3600), m = Math.floor((v % 3600) / 60), sec = v % 60;
  const str = `${String(d).padStart(2, '0')}D ${String(h).padStart(2, '0')}H ${String(m).padStart(2, '0')}M ${String(sec).padStart(2, '0')}S`;
  const a = smoothstep(0.1, 0.5, t) * (1 - smoothstep(s.dur - 0.9, s.dur - 0.3, t));
  const fr = Math.floor(T * 24);
  const jx = hash(fr, 301) > 0.9 ? (hash(fr, 302) - 0.5) * 20 : 0;
  text(ctx, s.params.label || 'INCURSION', W / 2 + jx, H * 0.4, { family: FONTS.mono, size: 34, weight: 500, color: '#ff3b5c', alpha: a, spacing: 18 });
  ctx.save();
  ctx.shadowColor = '#ff3b5c';
  ctx.shadowBlur = 40;
  text(ctx, str, W / 2 + jx, H * 0.52, { family: FONTS.mono, size: 120, weight: 700, color: '#ff4d6a', alpha: a });
  ctx.restore();
  if (t > 1 && t < 1.15) fillScreen(ctx, 'rgba(255,60,90,0.15)');
}

// ── CREDITS ──────────────────────────────────────────────────────────────────
export function credits(ctx, s) {
  const { t, T } = s;
  fillScreen(ctx, '#030206');
  additive(ctx, () => {
    for (let i = 0; i < 40; i++) {
      const x = hash(i, 311) * W, sp = hashRange(i, 312, 10, 40);
      ctx.strokeStyle = rgba(i % 2 ? '#ffd27a' : '#c9a2ff', 0.12);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let y = 0; y <= H; y += 40) {
        const xx = x + Math.sin(y * 0.01 + T * 0.4 + i) * 20;
        y ? ctx.lineTo(xx, y) : ctx.moveTo(xx, y);
      }
      ctx.stroke();
    }
  });
  const items = s.params.items || CREDITS;
  const speed = 70;
  let y = H + 40 - t * speed;
  for (const [a, b] of items) {
    if (a === '') {
      y += 50;
      continue;
    }
    if (b == null) {
      text(ctx, a, W / 2, y, { family: FONTS.title, size: 46, weight: 700, color: '#f4ecdc', spacing: 6 });
      y += 90;
    } else {
      text(ctx, a, W / 2 - 30, y, { family: FONTS.mono, size: 22, color: '#c9a2ff', align: 'right', spacing: 4 });
      text(ctx, b, W / 2 + 30, y, { family: FONTS.serif, size: 34, weight: 500, color: '#f4ecdc', align: 'left' });
      y += 58;
    }
  }
}

const CREDITS = [
  ['THE ANCHOR OF YESTERDAY'],
  ['EPISODE ONE', 'Two Skies, One Grave'],
  ['', ''],
  ['ELIAS THORNE', 'voiced by Gemini · Charon'],
  ['SEREN', 'voiced by Gemini · Kore'],
  ['MISTER YESTERDAY', 'voiced by Gemini · Algenib'],
  ['MRS. PEMBERTON', 'voiced by Gemini · Gacrux'],
  ['HENRY · MR. ABERNATHY', 'Puck · Orus'],
  ['DR. MARLOWE · ANCHOR', 'Sadaltager · Rasalgethi'],
  ['', ''],
  ['VOICES', 'Google Gemini TTS'],
  ['ANIMATION', 'procedural canvas engine'],
  ['SCORE & SOUND', 'synthesised in code'],
  ['', ''],
  ['NEXT', 'Episode Two · Nine Days'],
];
