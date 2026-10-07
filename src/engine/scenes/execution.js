// Scenes for the Execution: the colliding-Earths city, the rooftop, the eyes,
// the face reveal, the obsidian key, the pocket watches and the 4,112 slam.
import { W, H, FONTS, glow, additive, vGradient, poly, smoothPath, setFont, withAlpha, fillScreen, strokeGlowPath, lightningPath } from '../draw.js';
import { drawIncursionSky, drawSkyline, drawRain, drawDebris, drawBruise, drawBirds, drawEarth, drawMaskedOnShard, drawClockFace } from '../world.js';
import { humanoid, makePose, lerpPose, POSES, profilePortrait, frontPortrait } from '../figures.js';
import { clamp, lerp, ease, hash, hashRange, mulberry32, rgba, smoothstep, TAU, fract, noise1 } from '../util.js';

// ── CITY ─────────────────────────────────────────────────────────────────────
export function city(ctx, s) {
  const { t } = s;
  const mode = s.params.mode;
  if (mode === 'incursion' || mode === 'impact') {
    const tilt = s.v('tilt', 0);
    const impact = mode === 'impact' ? ease.inCubic(clamp(t / 1.2)) : 0;
    ctx.save();
    ctx.translate(0, tilt * 420);
    drawIncursionSky(ctx, s.T, { intensity: 1 + impact * 2, cy: lerp(-1080, -500, impact), r: lerp(1500, 1700, impact) });
    ctx.restore();
    ctx.save();
    ctx.translate(0, tilt * 420);
    drawRain(ctx, s.T, { up: true, count: 220, speed: 700, color: 'rgba(220,180,255,0.22)', slant: -0.05 });
    drawDebris(ctx, s.T, { count: 34, scale: 0.8 });
    drawSkyline(ctx, {
      t: s.T,
      ruin: s.params.ruin ?? 0.7,
      fill: '#2a0d33',
      fillBottom: '#06020a',
      rim: '#e05cff',
      rimDy: -3,
      broken: true,
      clock: { h: 11, m: 58, face: '#b9a2c9', glowColor: '#ff5fd2', glowAlpha: 0.15 },
      windows: 0.08,
      windowColor: '#ff9ad8',
      flicker: true,
    });
    ctx.restore();
    if (s.params.masked) {
      const [a, b] = s.params.masked;
      if (t >= a && t <= b) drawMaskedOnShard(ctx, 1420, 250, 0.9, s.T);
    }
    if (impact > 0) {
      additive(ctx, () => glow(ctx, W / 2, 0, 2600 * impact + 200, '#ffffff', impact));
      ctx.fillStyle = rgba('#ffffff', impact);
      ctx.fillRect(0, 0, W, H);
    }
    return;
  }
  if (mode === 'dawn') {
    fillScreen(ctx, vGradient(ctx, 0, 0, 0, H, [
      [0, '#16233f'], [0.35, '#4a4a6e'], [0.62, '#d88a5a'], [0.78, '#f6c27a'], [1, '#f9e3b0'],
    ]));
    additive(ctx, () => {
      glow(ctx, 520, 760, 520, '#ffd28a', 0.55);
      glow(ctx, 520, 760, 120, '#fff4d6', 0.9);
    });
    // soft clouds
    for (let i = 0; i < 9; i++) {
      const x = ((hash(i, 91) * W * 1.4 + s.T * hashRange(i, 92, 4, 12)) % (W * 1.4)) - W * 0.2;
      const y = 120 + hash(i, 93) * 360;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 260);
      g.addColorStop(0, `rgba(255,214,170,${0.18 + hash(i, 94) * 0.15})`);
      g.addColorStop(1, 'rgba(255,214,170,0)');
      ctx.fillStyle = g;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(2.4, 0.4);
      ctx.translate(-x, -y);
      ctx.fillRect(x - 260, y - 260, 520, 520);
      ctx.restore();
    }
    drawBirds(ctx, s.T, { count: 9, y: 300, x: 200, spread: 700, color: '#2b1f22', scale: 1.2 });
    drawSkyline(ctx, {
      t: 0,
      fill: '#3b2b3a',
      fillBottom: '#120c12',
      rim: '#ffcf8a',
      rimDx: -3,
      rimDy: -2,
      windows: 0.2,
      windowColor: '#ffd28a',
      clock: { h: 6, m: 12 + Math.floor(s.t / 3), face: '#f1dfb4', glowColor: '#ffd28a', glowAlpha: 0.2 },
    });
    return;
  }
  if (mode === 'bruise') {
    fillScreen(ctx, vGradient(ctx, 0, 0, 0, H, [[0, '#5f86b8'], [0.7, '#a9c3dc'], [1, '#d9e3ea']]));
    drawBruise(ctx, s.T, 1, { reach: 600 });
    const ghost = s.v('ghost', 0);
    if (ghost > 0) {
      ctx.save();
      ctx.globalAlpha = ghost * 0.55;
      ctx.translate(0, 0);
      drawSkyline(ctx, { flip: true, flipY: 140, t: 0, fill: '#c9a6e6', fillBottom: '#9a6cc9', farLayer: false, alpha: 1, clock: { h: 11, m: 58, face: '#efe2ff' } });
      ctx.restore();
      additive(ctx, () => glow(ctx, W / 2, 0, 1200, '#d38bff', ghost * 0.3));
    }
    drawBirds(ctx, s.T, { count: 22, y: 380, x: 350, spread: 900, frozen: 1, freezeAt: 3.3, color: '#1c1420' });
    drawSkyline(ctx, { t: 0, fill: '#2e2440', fillBottom: '#100b16', rim: '#d9a0ff', windows: 0.12, clock: { h: 3, m: 12, face: '#e8dcc0' } });
  }
}

// ── ROOFTOP (the Execution) ──────────────────────────────────────────────────
function threadsBetween(ctx, a, b, amount, T, opts = {}) {
  if (amount <= 0) return;
  const n = opts.count ?? 9;
  additive(ctx, () => {
    for (let i = 0; i < n; i++) {
      const ph = i * 1.7 + T * 2.2;
      const bend = (hash(i, 101) - 0.5) * 220 + Math.sin(ph) * 40;
      const cx1 = lerp(a[0], b[0], 0.33) + Math.cos(ph * 0.7) * 40, cy1 = lerp(a[1], b[1], 0.33) + bend;
      const cx2 = lerp(a[0], b[0], 0.66) - Math.sin(ph * 0.8) * 40, cy2 = lerp(a[1], b[1], 0.66) - bend * 0.6;
      const col = i % 3 === 0 ? '#ffd38a' : i % 3 === 1 ? '#c58cff' : '#ff8ae8';
      for (const [w, al] of [[10, 0.08], [4, 0.25], [1.6, 0.9]]) {
        ctx.strokeStyle = rgba(col, al * amount);
        ctx.lineWidth = w * (opts.scale ?? 1);
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.bezierCurveTo(cx1, cy1, cx2, cy2, b[0], b[1]);
        ctx.stroke();
      }
      // particles flowing toward b
      for (let k = 0; k < 4; k++) {
        const u = fract(T * 0.7 + k / 4 + hash(i, 102));
        const mt = 1 - u;
        const x = mt ** 3 * a[0] + 3 * mt * mt * u * cx1 + 3 * mt * u * u * cx2 + u ** 3 * b[0];
        const y = mt ** 3 * a[1] + 3 * mt * mt * u * cy1 + 3 * mt * u * u * cy2 + u ** 3 * b[1];
        glow(ctx, x, y, 14 * (opts.scale ?? 1), col, 0.7 * amount);
      }
    }
    glow(ctx, a[0], a[1], 90 * (opts.scale ?? 1), '#ffc76b', 0.6 * amount);
    glow(ctx, b[0], b[1], 120 * (opts.scale ?? 1), '#8ff3ff', 0.55 * amount);
  });
}

function rooftopSlab(ctx, y, rim = '#d05cff') {
  const pts = [[-60, y + 10], [700, y - 6], [1250, y + 4], [1600, y - 14], [1720, y + 30], [1990, y + 18], [1990, H + 40], [-60, H + 40]];
  ctx.fillStyle = rim;
  ctx.beginPath();
  poly(ctx, pts.map(([x, yy]) => [x, yy - 3]));
  ctx.fill();
  ctx.fillStyle = vGradient(ctx, 0, y, 0, H, [[0, '#120616'], [1, '#030105']]);
  ctx.beginPath();
  poly(ctx, pts);
  ctx.fill();
}

function background(ctx, s, { cityScale = 0.62, cityY = 0, tilt = 0 } = {}) {
  ctx.save();
  ctx.translate(0, tilt);
  drawIncursionSky(ctx, s.T, { intensity: 1 });
  ctx.restore();
  ctx.save();
  ctx.translate(W / 2, H * 0.9 + cityY);
  ctx.scale(cityScale, cityScale);
  ctx.translate(-W / 2, -H * 0.86);
  drawSkyline(ctx, { t: s.T, ruin: 0.75, fill: '#2a0d33', fillBottom: '#08030c', rim: '#e05cff', broken: true, windows: 0.05, windowColor: '#ff9ad8', clock: { h: 11, m: 58, face: '#b9a2c9' } });
  ctx.restore();
}

const SEREN_STYLE = { costume: 'altSeren', body: '#08040c', rim: '#ff7ae6', rimDy: -3, wind: 0.6, hairUp: 0.75 };
const YESTERDAY_STYLE = { costume: 'yesterday', body: '#050307', rim: '#c46bff', rimDy: -3, wind: 0.9 };

export function rooftop(ctx, s) {
  const { t, T } = s;
  const view = s.params.view || 'medium';
  const threads = s.v('threads', 0);
  const turn = s.v('turn', 0);
  const handGlow = s.v('handGlow', 0);
  const freeze = s.params.freeze;
  // Elias as an invisible observer: a translucent shade with a luminous gold edge.
  const ghostElias = (x, y, h, opt = {}) => {
    const shimmer = 0.85 + 0.15 * Math.sin(T * 7);
    additive(ctx, () => glow(ctx, x, y - h * 0.5, h * 0.55, '#ffc860', 0.18 * shimmer));
    return humanoid(ctx, x, y, h, {
      costume: 'elias',
      body: '#120a1a',
      rim: rgba('#ffd98a', shimmer),
      rimDx: 4,
      rimDy: -3,
      t: T,
      bare: true,
      ...opt,
    });
  };

  if (view === 'front-seren' || view === 'seren-sees') {
    background(ctx, s, { cityScale: 0.5, cityY: 160 });
    ctx.fillStyle = 'rgba(8,2,12,0.45)';
    ctx.fillRect(0, 0, W, H);
    const sees = view === 'seren-sees';
    const toCam = s.params.eyesToCamera ? smoothstep(0.2, 1.6, t) : 0;
    const speaking = s.lines.some((l) => T >= l.start && T <= l.end);
    frontPortrait(ctx, W * 0.5, H * 0.42, 330, {
      t: T,
      gaze: sees ? 0 : lerp(0.65, 0, toCam),
      gazeY: sees ? 0 : lerp(-0.7, 0, toCam),
      speaking,
      tears: sees || toCam > 0.5,
      lids: sees ? 0.8 : 1,
      wound: 1 + threads * 0.6,
    });
    // his hand gripping her collar
    humanoid(ctx, W * 0.98, H * 1.55, 1500, { ...YESTERDAY_STYLE, dir: -1, pose: makePose('stand', { elF: [0.18, -0.74], haF: [0.33, -0.66] }), t: T });
    threadsBetween(ctx, [W * 0.52, H * 0.92], [W * 0.78, H * 0.6], threads * 0.7, T, { count: 6 });
    if (sees) additive(ctx, () => glow(ctx, W * 0.5, H * 0.34, 260, '#ffd27a', 0.12 + 0.05 * Math.sin(T * 3)));
    drawRain(ctx, T, { up: true, count: 120, speed: 650, color: 'rgba(230,190,255,0.18)' });
    return;
  }

  if (view === 'low') {
    background(ctx, s, { cityScale: 0.45, cityY: 260, tilt: 120 });
    const look = s.v('lookUp', 0);
    rooftopSlab(ctx, H * 0.97);
    humanoid(ctx, W * 0.73, H * 1.12, 1350, { ...YESTERDAY_STYLE, dir: -1, pose: makePose('stand', { elF: [0.17, -0.72], haF: [0.3, -0.66] }), t: T, eyes: { turn: 0, glow: 0.8 } });
    const pose = makePose('kneel');
    humanoid(ctx, W * 0.3, H * 1.4, 1250, { ...SEREN_STYLE, dir: 1, pose, t: T, headTilt: -0.6 * look, lean: -0.12 * look });
    drawRain(ctx, T, { up: true, count: 180, speed: 700, color: 'rgba(230,190,255,0.2)' });
    return;
  }

  if (view === 'close') {
    background(ctx, s, { cityScale: 0.4, cityY: 300 });
    ctx.fillStyle = 'rgba(10,2,14,0.35)';
    ctx.fillRect(0, 0, W, H);
    humanoid(ctx, W * 0.7, H * 2.15, 2300, { ...YESTERDAY_STYLE, dir: -1, pose: makePose('stand', null, { head: [0.05, -0.905] }), headTilt: 0.12, t: T, eyes: { turn: 0.15, glow: 1.2 } });
    // her head in the lower-left, in silhouette
    ctx.fillStyle = '#050208';
    ctx.beginPath();
    ctx.ellipse(W * 0.2, H * 0.92, 220, 270, 0.2, 0, TAU);
    ctx.fill();
    additive(ctx, () => glow(ctx, W * 0.2, H * 1.05, 380, '#ffc76b', 0.25));
    return;
  }

  if (view === 'orbit') {
    background(ctx, s, { cityScale: 0.55, cityY: 120 });
    rooftopSlab(ctx, H * 0.84);
    const ang = lerp(-0.4, Math.PI + 0.4, ease.inOut(s.p));
    const z = Math.sin(ang);
    const yx = W / 2 + Math.cos(ang) * 470;
    const scale = 1 - z * 0.22;
    const drawHim = () =>
      humanoid(ctx, yx, H * 0.84 - z * 40, 820 * scale, { ...YESTERDAY_STYLE, dir: Math.cos(ang) > 0 ? -1 : 1, t: T, rimDx: 3, eyes: z > 0 ? null : { turn: 0, glow: 0.8 } });
    if (z > 0) drawHim();
    humanoid(ctx, W / 2, H * 0.86, 720, { ...SEREN_STYLE, dir: Math.cos(ang) > 0 ? 1 : -1, pose: makePose('kneel'), t: T, headTilt: 0.15 });
    if (z <= 0) drawHim();
    drawRain(ctx, T, { up: true, count: 160, speed: 650, color: 'rgba(230,190,255,0.2)' });
    return;
  }

  if (view === 'elias-front') {
    background(ctx, s, { cityScale: 0.5, cityY: 200 });
    rooftopSlab(ctx, H * 0.95);
    ghostElias(W * 0.42, H * 1.08, 1100, { pose: makePose('stand', 'backing'), lean: -0.1, dir: 1 });
    humanoid(ctx, W * 1.02, H * 1.35, 1700, { ...YESTERDAY_STYLE, dir: -1, t: T, eyes: { turn: 1, glow: 1 } });
    drawRain(ctx, T, { up: true, count: 160, speed: 650, color: 'rgba(230,190,255,0.2)' });
    return;
  }

  // wide / medium / front-yesterday / behind
  const cfg = {
    wide: { cityScale: 0.78, cityY: 40, slab: 0.8, hx: 1060, hy: 0.8, hh: 360, sx: 900, sh: 330 },
    medium: { cityScale: 0.55, cityY: 160, slab: 0.92, hx: 1150, hy: 0.98, hh: 860, sx: 760, sh: 820 },
    'front-yesterday': { cityScale: 0.5, cityY: 200, slab: 0.95, hx: 960, hy: 1.12, hh: 1050, sx: 560, sh: 640 },
    behind: { cityScale: 0.5, cityY: 200, slab: 0.9, hx: 1260, hy: 1.2, hh: 1250, sx: 760, sh: 560 },
  }[view] || {};
  background(ctx, s, { cityScale: cfg.cityScale, cityY: cfg.cityY });
  rooftopSlab(ctx, H * cfg.slab);
  const wind = freeze ? 0.15 : 0.9;
  const TT = freeze ? s.shotStart + 1.0 : T;

  if (view === 'front-yesterday') {
    const sp = humanoid(ctx, cfg.sx, H * 1.0, cfg.sh, { ...SEREN_STYLE, dir: 1, pose: makePose('kneel'), t: T, headTilt: 0.2 });
    const y = humanoid(ctx, cfg.hx, H * cfg.hy, cfg.hh, {
      ...YESTERDAY_STYLE,
      dir: -1,
      wind,
      t: TT,
      pose: makePose('stand', { elF: [0.2, -0.66], haF: [0.36, -0.6] }),
      eyes: { turn: 1, glow: 1.3 },
      rimFlip: true,
    });
    threadsBetween(ctx, sp.chest, y.handF, threads, T, { scale: 1.2 });
    return;
  }

  // Seren kneeling, facing him
  const sp = humanoid(ctx, cfg.sx, H * (cfg.slab + 0.005), cfg.sh, {
    ...SEREN_STYLE,
    dir: 1,
    pose: makePose('kneel'),
    t: T,
    headTilt: 0.18,
    lean: -0.05 - threads * 0.12,
  });

  if (view === 'behind') {
    // Elias the observer stands to the left, translucent
    const reach = s.v('reach', 0);
    const ep = lerpPose(makePose('stand'), makePose('stand', 'reachFar'), reach);
    ghostElias(W * 0.24, H * 1.06, 980, { pose: ep, dir: 1 });
  }

  const reachPose = makePose('stand', { elF: [0.17, -0.72], haF: [0.3, -0.62] });
  const y = humanoid(ctx, cfg.hx, H * cfg.hy, cfg.hh, {
    ...YESTERDAY_STYLE,
    dir: -1,
    wind,
    t: TT,
    pose: view === 'wide' ? reachPose : lerpPose(reachPose, makePose('stand', { elF: [0.14, -0.66], haF: [0.22, -0.64] }), handGlow),
    eyes: view === 'behind' && turn < 0.05 ? null : { turn, glow: 1 },
    headTilt: freeze ? 0.15 * Math.sin(Math.min(1, t) * Math.PI) : 0,
  });
  if (handGlow > 0) additive(ctx, () => glow(ctx, y.handF[0], y.handF[1], 160 * handGlow, '#8ff3ff', 0.7 * handGlow));
  threadsBetween(ctx, sp.chest, y.handF, threads, T, { scale: view === 'wide' ? 0.5 : 1 });
  if (!freeze) drawRain(ctx, T, { up: true, count: 180, speed: 700, color: 'rgba(230,190,255,0.2)' });
  else drawRain(ctx, s.shotStart + 1, { up: true, count: 180, speed: 700, color: 'rgba(230,190,255,0.2)' });
}

// ── EYES (extreme close-up) ──────────────────────────────────────────────────
export function eyes(ctx, s) {
  const { T } = s;
  const z = s.v('push', 1);
  fillScreen(ctx, '#040205');
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(z, z);
  ctx.translate(-W / 2, -H / 2);
  // skin band lit from above by the magenta sky
  const g = ctx.createLinearGradient(0, 160, 0, 920);
  g.addColorStop(0, '#2a1230');
  g.addColorStop(0.35, '#140a16');
  g.addColorStop(1, '#050306');
  ctx.fillStyle = g;
  ctx.fillRect(0, 120, W, 840);
  // skin texture
  ctx.fillStyle = 'rgba(255,200,255,0.025)';
  for (let i = 0; i < 900; i++) ctx.fillRect(hash(i, 111) * W, 140 + hash(i, 112) * 800, 2, 2);
  for (const [ex, flip] of [[640, -1], [1280, 1]]) {
    const ey = 520;
    // brow
    ctx.fillStyle = '#060307';
    ctx.beginPath();
    ctx.moveTo(ex - 260, ey - 150);
    ctx.quadraticCurveTo(ex, ey - 240 - flip * 6, ex + 260, ey - 140);
    ctx.lineTo(ex + 250, ey - 105);
    ctx.quadraticCurveTo(ex, ey - 175, ex - 250, ey - 112);
    ctx.fill();
    // socket shadow
    const sg = ctx.createRadialGradient(ex, ey, 60, ex, ey, 300);
    sg.addColorStop(0, 'rgba(0,0,0,0)');
    sg.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = sg;
    ctx.fillRect(ex - 320, ey - 320, 640, 640);
    // eye white
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(ex - 220, ey);
    ctx.quadraticCurveTo(ex, ey - 130, ex + 220, ey);
    ctx.quadraticCurveTo(ex, ey + 110, ex - 220, ey);
    ctx.closePath();
    ctx.fillStyle = '#c9c2c7';
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = 'rgba(40,10,40,0.55)';
    ctx.fillRect(ex - 230, ey - 140, 460, 80);
    // iris with clock rings
    const ir = 96;
    const ig = ctx.createRadialGradient(ex, ey, 10, ex, ey, ir);
    ig.addColorStop(0, '#e9ffff');
    ig.addColorStop(0.3, '#8ff3ff');
    ig.addColorStop(0.8, '#1e6b7a');
    ig.addColorStop(1, '#0a2a33');
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.arc(ex, ey, ir, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(5,30,40,0.9)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU + T * 0.35 * flip;
      const l = i % 5 === 0 ? 22 : 10;
      ctx.beginPath();
      ctx.moveTo(ex + Math.cos(a) * (ir - l), ey + Math.sin(a) * (ir - l));
      ctx.lineTo(ex + Math.cos(a) * (ir - 2), ey + Math.sin(a) * (ir - 2));
      ctx.stroke();
    }
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU - T * 0.9 * flip;
      ctx.beginPath();
      ctx.moveTo(ex + Math.cos(a) * 40, ey + Math.sin(a) * 40);
      ctx.lineTo(ex + Math.cos(a) * 56, ey + Math.sin(a) * 56);
      ctx.stroke();
    }
    ctx.fillStyle = '#020607';
    ctx.beginPath();
    ctx.arc(ex, ey, 30 + Math.sin(T * 1.3) * 3, 0, TAU);
    ctx.fill();
    additive(ctx, () => {
      glow(ctx, ex, ey, 200, '#8ff3ff', 0.35);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.ellipse(ex + 34, ey - 38, 16, 10, -0.5, 0, TAU);
      ctx.fill();
      // reflected colliding sky
      ctx.fillStyle = 'rgba(255,90,220,0.35)';
      ctx.beginPath();
      ctx.arc(ex - 30, ey - 50, 40, Math.PI, TAU);
      ctx.fill();
    });
    ctx.restore();
    // lids
    ctx.strokeStyle = '#030103';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(ex - 230, ey + 4);
    ctx.quadraticCurveTo(ex, ey - 140, ex + 230, ey + 4);
    ctx.stroke();
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(ex - 220, ey + 2);
    ctx.quadraticCurveTo(ex, ey + 112, ex + 220, ey + 2);
    ctx.stroke();
  }
  // the scar across his left eye (viewer's right)
  ctx.strokeStyle = 'rgba(214,190,210,0.6)';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(1180, 250);
  ctx.lineTo(1260, 420);
  ctx.moveTo(1300, 600);
  ctx.lineTo(1350, 760);
  ctx.stroke();
  ctx.restore();
  additive(ctx, () => glow(ctx, W / 2, 0, 900, '#ff4fd8', 0.15));
}

// ── FACE (reveal, split frame, Seren's calculation) ──────────────────────────
export function face(ctx, s) {
  const { T } = s;
  const who = s.params.who;
  if (who === 'split') {
    const k = ease.outExpo(clamp(s.t / 0.6));
    // left: Elias, warm
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W / 2, H);
    ctx.clip();
    fillScreen(ctx, vGradient(ctx, 0, 0, 0, H, [[0, '#2a1606'], [1, '#0a0502']]));
    additive(ctx, () => glow(ctx, W * 0.42, H * 0.45, 700, '#ffb35c', 0.25));
    profilePortrait(ctx, W * 0.24 + (1 - k) * -200, H * 0.52, 470, { who: 'elias', dir: 1, light: 1, rim: '#ffc884' });
    ctx.restore();
    // right: Mister Yesterday, cold
    ctx.save();
    ctx.beginPath();
    ctx.rect(W / 2, 0, W / 2, H);
    ctx.clip();
    drawIncursionSky(ctx, T, { intensity: 0.6 });
    fillScreen(ctx, 'rgba(6,2,12,0.55)');
    profilePortrait(ctx, W * 0.76 + (1 - k) * 200, H * 0.52, 470, { who: 'yesterday', dir: -1, light: 1 });
    ctx.restore();
    // divider
    additive(ctx, () => {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(W / 2 - 2, 0, 4, H);
      glow(ctx, W / 2, H / 2, 300, '#ffffff', 0.2);
    });
    return;
  }
  if (who === 'seren') {
    fillScreen(ctx, vGradient(ctx, 0, 0, 0, H, [[0, '#120a1c'], [1, '#050208']]));
    additive(ctx, () => {
      glow(ctx, W * 0.2, H * 0.7, 900, '#9b5cff', 0.35 + 0.15 * Math.sin(T * 5));
      glow(ctx, W * 0.85, H * 0.3, 600, '#ffb35c', 0.12);
    });
    // Elias, out of focus, being pulled away in the foreground
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#020103';
    ctx.beginPath();
    ctx.ellipse(W * 0.12, H * 0.75, 340, 520, 0.1, 0, TAU);
    ctx.fill();
    ctx.restore();
    profilePortrait(ctx, W * 0.6, H * 0.5, 430 * (1 + s.p * 0.04), { who: 'seren', dir: -1, light: s.params.light ?? 0.7 });
    return;
  }
  // Mister Yesterday reveal
  drawIncursionSky(ctx, T, { intensity: 0.9 });
  fillScreen(ctx, 'rgba(6,2,12,0.5)');
  const sweep = s.v('sweep', 1);
  const size = s.params.close ? 640 : 520;
  const light = smoothstep(0, 0.6, sweep);
  profilePortrait(ctx, W * 0.6, H * (s.params.close ? 0.56 : 0.52), size * (1 + s.p * 0.03), { who: 'yesterday', dir: -1, light, sweep: s.params.sweep && Array.isArray(s.params.sweep) ? sweep : null });
  drawRain(ctx, T, { up: true, count: 120, speed: 650, color: 'rgba(230,190,255,0.15)' });
}

// ── KEY ──────────────────────────────────────────────────────────────────────
function keyPath(ctx, x, y, size) {
  const u = size;
  // bow
  ctx.moveTo(x - u * 0.62 + u * 0.3, y);
  ctx.arc(x - u * 0.62, y, u * 0.3, 0, TAU);
  // shaft
  ctx.rect(x - u * 0.34, y - u * 0.055, u * 0.95, u * 0.11);
  // bit + teeth
  ctx.rect(x + u * 0.42, y, u * 0.08, u * 0.26);
  ctx.rect(x + u * 0.52, y, u * 0.07, u * 0.19);
  ctx.rect(x + u * 0.33, y, u * 0.06, u * 0.15);
  ctx.rect(x + u * 0.56, y - u * 0.06, u * 0.06, u * 0.06);
}

export function drawKey(ctx, x, y, size, o = {}) {
  const T = o.T ?? 0;
  const a = o.alpha ?? 1;
  const glowAmt = o.glow ?? 1;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(x, y);
  ctx.rotate(o.rot ?? -0.12);
  ctx.translate(-x, -y);
  additive(ctx, () => glow(ctx, x, y, size * 1.4, '#9b5cff', 0.35 * glowAmt));
  ctx.beginPath();
  keyPath(ctx, x, y, size);
  ctx.fillStyle = vGradient(ctx, 0, y - size * 0.35, 0, y + size * 0.35, [[0, '#2b2236'], [0.45, '#07050b'], [1, '#141019']]);
  ctx.fill('evenodd');
  ctx.save();
  ctx.beginPath();
  keyPath(ctx, x, y, size);
  ctx.clip('evenodd');
  // inner hole of the bow (spindle cross)
  // veins of light inside the glass
  const rnd = mulberry32(7);
  additive(ctx, () => {
    for (let i = 0; i < 9; i++) {
      const sx = x - size * 0.85 + rnd() * size * 1.5;
      const pts = lightningPath(sx, y - size * 0.3, sx + (rnd() - 0.5) * size * 0.6, y + size * 0.3, i, 0.3, 4, rnd);
      strokeGlowPath(ctx, pts, i % 2 ? '#c58cff' : '#ff8ae8', 1.4 * (size / 300), 0.4 * glowAmt * (0.6 + 0.4 * Math.sin(T * 3 + i)));
    }
  });
  // specular
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(x - size, y - size * 0.06, size * 2, size * 0.02);
  ctx.restore();
  // spindle inside the bow
  ctx.strokeStyle = rgba('#c58cff', 0.7 * glowAmt);
  ctx.lineWidth = size * 0.02;
  ctx.beginPath();
  ctx.arc(x - size * 0.62, y, size * 0.17, 0, TAU);
  ctx.moveTo(x - size * 0.62, y - size * 0.17);
  ctx.lineTo(x - size * 0.62, y + size * 0.17);
  ctx.moveTo(x - size * 0.79, y);
  ctx.lineTo(x - size * 0.45, y);
  ctx.stroke();
  // crack
  if (o.crack > 0) {
    const c = o.crack;
    const pts = [[x - size * 0.95, y - size * 0.2], [x - size * 0.6, y - size * 0.05], [x - size * 0.3, y + size * 0.04], [x, y - size * 0.03], [x + size * 0.3, y + size * 0.05], [x + size * 0.62, y + size * 0.12]];
    const n = Math.max(2, Math.ceil(pts.length * c));
    strokeGlowPath(ctx, pts.slice(0, n), '#ffffff', size * 0.012, 0.8);
  }
  ctx.restore();
}

export function key(ctx, s) {
  const { T, t } = s;
  const mode = s.params.mode;
  if (mode === 'forming') {
    fillScreen(ctx, '#050208');
    additive(ctx, () => glow(ctx, W / 2, H / 2, 900, '#6b2a9a', 0.35));
    const form = s.v('form', 1);
    // threads spiralling in
    additive(ctx, () => {
      for (let i = 0; i < 40; i++) {
        const a0 = hash(i, 121) * TAU + T * (0.6 + hash(i, 122));
        const r = lerp(900, 40, form) * hashRange(i, 123, 0.6, 1.2);
        const col = i % 2 ? '#ffd38a' : '#c58cff';
        ctx.strokeStyle = rgba(col, 0.5 * (1 - form * 0.7));
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let k = 0; k < 24; k++) {
          const u = k / 23;
          const rr = r * (1 - u * 0.8);
          const aa = a0 + u * 2.4;
          const px = W / 2 + Math.cos(aa) * rr, py = H / 2 + Math.sin(aa) * rr * 0.6;
          k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.stroke();
      }
    });
    // the palm beneath
    ctx.fillStyle = '#030104';
    ctx.beginPath();
    smoothPath(ctx, [[560, 1100], [620, 820], [760, 760], [1200, 780], [1380, 860], [1460, 1100]], true, 0.4);
    ctx.fill();
    additive(ctx, () => glow(ctx, W / 2, 800, 400, '#8ff3ff', 0.25 * form));
    drawKey(ctx, W / 2 + 40, H * 0.47, 380, { alpha: smoothstep(0.2, 1, form), glow: 0.5 + form, crack: s.v('crack', 0), T, rot: -0.1 + (1 - form) * 0.4 });
    return;
  }
  if (mode === 'shattered' || mode === 'cooling') {
    // surface: desk (shattered) or floorboards (cooling)
    const floor = mode === 'cooling';
    fillScreen(ctx, floor ? '#0b0806' : '#120b07');
    ctx.strokeStyle = floor ? 'rgba(80,55,35,0.5)' : 'rgba(90,60,35,0.35)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 14; i++) {
      const y = i * 90 + 20;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y + (floor ? 0 : 30));
      ctx.stroke();
    }
    const glowAmt = floor ? lerp(1, 0.05, ease.outCubic(clamp(t / 3.2))) : 1 + 0.25 * Math.sin(T * 4);
    additive(ctx, () => glow(ctx, W / 2, H / 2, 700, '#9b5cff', 0.4 * glowAmt));
    if (!floor) {
      // cloth wrapping
      ctx.fillStyle = '#2a1e18';
      ctx.beginPath();
      smoothPath(ctx, [[480, 760], [700, 600], [1100, 640], [1450, 560], [1500, 820], [1100, 900], [600, 920]], true, 0.5);
      ctx.fill();
      // things in the shop leaning toward it
      const lean = s.v('lean', 0);
      for (let i = 0; i < 6; i++) {
        const left = i < 3;
        const bx = left ? 120 + i * 120 : W - 120 - (i - 3) * 120;
        ctx.save();
        ctx.translate(bx, 420);
        ctx.rotate((left ? 1 : -1) * lean * 0.12 * (1 + Math.sin(T * 30 + i) * 0.1));
        ctx.fillStyle = '#050302';
        ctx.fillRect(-40, -260, 80, 260);
        ctx.fillStyle = rgba('#9b5cff', 0.25 * lean);
        ctx.fillRect(left ? 36 : -40, -260, 4, 260);
        ctx.restore();
      }
    }
    // the key in fragments
    const pieces = [[-60, -10, -0.05], [20, 8, 0.04], [90, -4, 0.09]];
    pieces.forEach(([dx, dy, rot], i) => {
      ctx.save();
      ctx.beginPath();
      const x0 = W / 2 - 600 + i * 400;
      ctx.rect(x0 + (i === 0 ? -400 : 0), 0, i === 2 ? 1200 : 400, H);
      ctx.clip();
      ctx.translate(dx * 0.8, dy);
      drawKey(ctx, W / 2, H / 2, 420, { T, glow: glowAmt, rot: -0.12 + rot, crack: 1 });
      ctx.restore();
    });
    // smoke
    additive(ctx, () => {
      for (let i = 0; i < 18; i++) {
        const u = fract(T * 0.15 + hash(i, 131));
        const x = W / 2 + hashRange(i, 132, -400, 400) + Math.sin(T + i) * 40 * u;
        const y = H / 2 - u * 500;
        glow(ctx, x, y, 80 + u * 140, '#b8a6d6', 0.08 * (1 - u) * glowAmt);
      }
    });
  }
}

// ── WATCH ────────────────────────────────────────────────────────────────────
export function watch(ctx, s) {
  const { T, t } = s;
  const yesterday = s.params.mode === 'yesterday';
  if (yesterday) {
    drawIncursionSky(ctx, T, { intensity: 0.6 });
    fillScreen(ctx, 'rgba(5,1,8,0.72)');
  } else {
    fillScreen(ctx, vGradient(ctx, 0, 0, 0, H, [[0, '#2a1a0e'], [1, '#0e0804']]));
    additive(ctx, () => glow(ctx, W * 0.4, H * 0.2, 1100, '#ffcc88', 0.25));
  }
  const cx = W / 2, cy = H * 0.5;
  if (yesterday) {
    // scarred hand
    ctx.fillStyle = '#050206';
    ctx.beginPath();
    smoothPath(ctx, [[420, 1100], [520, 760], [760, 700], [1150, 720], [1320, 780], [1500, 1100]], true, 0.4);
    ctx.fill();
    ctx.strokeStyle = rgba('#c46bff', 0.5);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(200,170,210,0.35)';
    ctx.beginPath();
    ctx.moveTo(700, 860);
    ctx.lineTo(980, 930);
    ctx.stroke();
  } else {
    // velvet box
    ctx.fillStyle = '#3a0d14';
    ctx.fillRect(cx - 420, cy - 300, 840, 600);
    ctx.fillStyle = '#250609';
    ctx.fillRect(cx - 380, cy - 260, 760, 520);
  }
  const r = 230;
  // chain
  ctx.strokeStyle = yesterday ? '#6d6470' : '#c8a14a';
  ctx.lineWidth = 6;
  ctx.setLineDash([10, 6]);
  ctx.beginPath();
  ctx.moveTo(cx, cy - r - 40);
  ctx.bezierCurveTo(cx + 200, cy - r - 220, cx + 520, cy - 200, cx + 640, cy + 200);
  ctx.stroke();
  ctx.setLineDash([]);
  // case
  ctx.fillStyle = yesterday ? '#4d4552' : '#d6aa4c';
  ctx.beginPath();
  ctx.arc(cx, cy, r + 26, 0, TAU);
  ctx.fill();
  ctx.fillStyle = yesterday ? '#2b252f' : '#a9802f';
  ctx.beginPath();
  ctx.arc(cx, cy - r - 30, 34, 0, TAU);
  ctx.fill();
  // dial
  ctx.fillStyle = yesterday ? '#cfc6c0' : '#f4ead2';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fill();
  setFont(ctx, FONTS.serif, 46, 600);
  ctx.fillStyle = '#1d140c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const numerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  numerals.forEach((n, i) => {
    const a = (i / 12) * TAU;
    ctx.fillText(n, cx + Math.sin(a) * r * 0.78, cy - Math.cos(a) * r * 0.78);
  });
  // hands
  let minutes, hours;
  if (yesterday) {
    minutes = 58 - t * 40;
    hours = 11 - t * 40 / 60;
  } else {
    minutes = 14;
    hours = 9;
  }
  const ma = (minutes / 60) * TAU, ha = ((hours % 12) / 12) * TAU + (minutes / 720) * TAU;
  ctx.strokeStyle = '#120c08';
  ctx.lineCap = 'round';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(ha) * r * 0.48, cy - Math.cos(ha) * r * 0.48);
  ctx.stroke();
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(ma) * r * 0.74, cy - Math.cos(ma) * r * 0.74);
  ctx.stroke();
  if (yesterday) {
    const sa = -t * TAU * 0.8;
    ctx.strokeStyle = '#a3132b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(sa) * r * 0.85, cy - Math.cos(sa) * r * 0.85);
    ctx.stroke();
    // cracked crystal
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    poly(ctx, [[cx - r * 0.9, cy - r * 0.3], [cx - r * 0.2, cy - r * 0.1], [cx + r * 0.1, cy + r * 0.5], [cx + r * 0.6, cy + r * 0.7]], false);
    ctx.moveTo(cx - r * 0.2, cy - r * 0.1);
    ctx.lineTo(cx + r * 0.3, cy - r * 0.8);
    ctx.moveTo(cx + r * 0.1, cy + r * 0.5);
    ctx.lineTo(cx - r * 0.4, cy + r * 0.8);
    ctx.stroke();
    additive(ctx, () => glow(ctx, cx - 80, cy - 90, 260, '#ff5fd2', 0.25));
  } else {
    // engraved lid
    ctx.save();
    ctx.translate(cx - 560, cy - 20);
    ctx.fillStyle = '#c99c40';
    ctx.beginPath();
    ctx.ellipse(0, 0, 150, 240, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#e9c873';
    ctx.beginPath();
    ctx.ellipse(0, 0, 130, 218, 0, 0, TAU);
    ctx.fill();
    setFont(ctx, FONTS.serif, 32, 600, 'italic');
    ctx.fillStyle = '#5a3c10';
    ctx.fillText('For Odile', 0, -50);
    ctx.fillText('every second,', 0, 0);
    ctx.fillText('yours.', 0, 46);
    ctx.restore();
    additive(ctx, () => glow(ctx, cx + 60, cy - 120, 300, '#fff1c8', 0.3));
  }
  ctx.fillStyle = '#120c08';
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, TAU);
  ctx.fill();
}

// ── NUMBER (4,112) ───────────────────────────────────────────────────────────
export function number(ctx, s) {
  const { t, T } = s;
  fillScreen(ctx, vGradient(ctx, 0, 0, 0, H, [[0, '#14041c'], [1, '#050106']]));
  additive(ctx, () => glow(ctx, W / 2, H * 0.45, 900, '#8a2bd0', 0.3));
  const str = s.params.text || '4,112';
  setFont(ctx, FONTS.slam, 430, 400);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const total = ctx.measureText(str).width;
  let x = W / 2 - total / 2;
  [...str].forEach((ch, i) => {
    const at = i * 0.14;
    const k = clamp((t - at) / 0.16);
    const w = ctx.measureText(ch).width;
    if (k > 0) {
      const sc = lerp(2.2, 1, ease.outExpo(k));
      ctx.save();
      ctx.translate(x + w / 2, H * 0.43);
      ctx.scale(sc, sc);
      ctx.globalAlpha = k;
      ctx.fillStyle = '#f5ecff';
      ctx.shadowColor = '#c46bff';
      ctx.shadowBlur = 60;
      ctx.fillText(ch, -w / 2, 0);
      ctx.restore();
      // crack lines over each digit
      if (ch !== ',') {
        const rnd = mulberry32(i * 31 + 3);
        ctx.strokeStyle = 'rgba(20,4,28,0.95)';
        ctx.lineWidth = 6;
        const pts = lightningPath(x + w * 0.2, H * 0.43 - 170, x + w * 0.75, H * 0.43 + 170, i, 0.25, 4, rnd);
        const shown = pts.slice(0, Math.ceil(pts.length * clamp((t - at - 0.1) / 0.3)));
        if (shown.length > 1) {
          ctx.beginPath();
          poly(ctx, shown, false);
          ctx.stroke();
        }
      }
    }
    x += w;
  });
  // shards falling off
  for (let i = 0; i < 40; i++) {
    const at = hash(i, 141) * 0.8;
    const u = t - at;
    if (u < 0) continue;
    const px = W / 2 + hashRange(i, 142, -700, 700) + u * hashRange(i, 143, -80, 80);
    const py = H * 0.43 + hashRange(i, 144, -160, 160) + u * u * 260;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(u * hashRange(i, 145, -4, 4));
    ctx.fillStyle = rgba('#f5ecff', clamp(1 - u / 3));
    ctx.beginPath();
    poly(ctx, [[0, -8], [10, 4], [-6, 8]]);
    ctx.fill();
    ctx.restore();
  }
}
