// World-building layers: Merridale's skyline, planets, skies, weather, debris.
import { W, H, cached, glow, additive, vGradient, poly, lightningPath, strokeGlowPath, withAlpha, makeCanvas } from './draw.js';
import { hash, hashRange, mulberry32, fbm2, noise1, clamp, lerp, rgba, fract, smoothstep, TAU } from './util.js';

// ── Merridale skyline ────────────────────────────────────────────────────────
const CLOCK_X = 1180;

function skylineData(seed = 7) {
  const rnd = mulberry32(seed);
  const b = [];
  let x = -320;
  while (x < W + 320) {
    const w = 46 + rnd() * 120;
    const near = Math.abs(x + w / 2 - CLOCK_X) < 140;
    if (near) {
      x += 40;
      continue;
    }
    const h = 110 + Math.pow(rnd(), 1.6) * 330;
    const roof = ['flat', 'gable', 'gable', 'spire', 'dome', 'flat', 'step'][Math.floor(rnd() * 7)];
    b.push({ x, w, h, roof, seed: Math.floor(rnd() * 1e6), chimney: rnd() < 0.35 });
    x += w + (rnd() < 0.3 ? rnd() * 18 : 0);
  }
  return b;
}
const SKYLINE = skylineData();

function buildingPath(ctx, b, baseY) {
  const { x, w, h, roof } = b;
  const top = baseY - h;
  ctx.moveTo(x, baseY);
  ctx.lineTo(x, top);
  if (roof === 'gable') ctx.lineTo(x + w / 2, top - w * 0.42);
  else if (roof === 'spire') {
    ctx.lineTo(x + w * 0.38, top);
    ctx.lineTo(x + w / 2, top - w * 1.4);
    ctx.lineTo(x + w * 0.62, top);
  } else if (roof === 'dome') ctx.arc(x + w / 2, top, w / 2, Math.PI, 0);
  else if (roof === 'step') {
    ctx.lineTo(x + w * 0.2, top);
    ctx.lineTo(x + w * 0.2, top - 26);
    ctx.lineTo(x + w * 0.8, top - 26);
    ctx.lineTo(x + w * 0.8, top);
  }
  ctx.lineTo(x + w, top);
  ctx.lineTo(x + w, baseY);
  ctx.closePath();
  if (b.chimney) ctx.rect(x + w * 0.7, top - 34, 12, 36);
}

function clocktowerPath(ctx, baseY, broken) {
  const x = CLOCK_X, w = 104;
  const top = baseY - 640;
  ctx.moveTo(x - w / 2, baseY);
  ctx.lineTo(x - w / 2, top + 120);
  ctx.lineTo(x - w / 2 - 10, top + 112);
  ctx.lineTo(x - w / 2 - 10, top);
  ctx.lineTo(x + w / 2 + 10, top);
  ctx.lineTo(x + w / 2 + 10, top + 112);
  ctx.lineTo(x + w / 2, top + 120);
  ctx.lineTo(x + w / 2, baseY);
  ctx.closePath();
  // belfry + spire
  ctx.moveTo(x - 44, top);
  ctx.lineTo(x - 44, top - 70);
  if (broken) {
    ctx.lineTo(x - 20, top - 120);
    ctx.lineTo(x - 4, top - 96);
    ctx.lineTo(x + 8, top - 150);
  } else {
    ctx.lineTo(x, top - 250);
  }
  ctx.lineTo(x + 44, top - 70);
  ctx.lineTo(x + 44, top);
  ctx.closePath();
}

export function drawClockFace(ctx, cx, cy, r, hours, minutes, opts = {}) {
  const { face = '#e8dcc0', ink = '#1b140c', glowColor = null, glowAlpha = 0, cracked = false } = opts;
  if (glowColor) glow(ctx, cx, cy, r * 3, glowColor, glowAlpha);
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = r * 0.08;
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    ctx.lineWidth = r * 0.05;
    ctx.beginPath();
    ctx.moveTo(cx + Math.sin(a) * r * 0.78, cy - Math.cos(a) * r * 0.78);
    ctx.lineTo(cx + Math.sin(a) * r * 0.9, cy - Math.cos(a) * r * 0.9);
    ctx.stroke();
  }
  const ha = ((hours % 12) / 12 + minutes / 720) * TAU, ma = (minutes / 60) * TAU;
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.09;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(ha) * r * 0.5, cy - Math.cos(ha) * r * 0.5);
  ctx.stroke();
  ctx.lineWidth = r * 0.06;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(ma) * r * 0.75, cy - Math.cos(ma) * r * 0.75);
  ctx.stroke();
  if (cracked) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = r * 0.03;
    ctx.beginPath();
    poly(ctx, [[cx - r * 0.9, cy - r * 0.2], [cx - r * 0.3, cy - r * 0.05], [cx - r * 0.1, cy + r * 0.4], [cx + r * 0.25, cy + r * 0.6], [cx + r * 0.5, cy + r * 0.85]], false);
    ctx.moveTo(cx - r * 0.3, cy - r * 0.05);
    ctx.lineTo(cx + r * 0.2, cy - r * 0.5);
    ctx.stroke();
  }
}

// opts: baseY, fill (top colour), fillBottom, rim, ruin 0..1, t, windows 0..1, windowColor,
//       broken, clock {h, m, glowColor}, flip (draw inverted ghost), alpha
export function drawSkyline(ctx, o = {}) {
  const baseY = o.baseY ?? H * 0.86;
  const ruin = o.ruin ?? 0;
  const t = o.t ?? 0;
  ctx.save();
  if (o.flip) {
    ctx.translate(0, o.flipY ?? 0);
    ctx.scale(1, -1);
  }
  ctx.globalAlpha *= o.alpha ?? 1;
  const grad = vGradient(ctx, 0, baseY - 600, 0, baseY + 40, [
    [0, o.fill || '#1a1020'],
    [1, o.fillBottom || '#05030a'],
  ]);
  // distant layer
  if (o.farLayer !== false) {
    ctx.save();
    ctx.globalAlpha *= 0.55;
    ctx.fillStyle = o.farFill || o.fill || '#241830';
    ctx.beginPath();
    for (const b of SKYLINE) {
      const s = 0.6;
      const bb = { ...b, x: b.x * 0.9 + 90 + (hash(b.seed, 3) - 0.5) * 60, w: b.w * s, h: b.h * 0.7 };
      buildingPath(ctx, bb, baseY - 30);
    }
    ctx.fill();
    ctx.restore();
  }
  for (const b of SKYLINE) {
    const lift = ruin > 0 && hash(b.seed, 11) < ruin * 0.42 ? 1 : 0;
    const tilt = (hash(b.seed, 5) - 0.5) * 0.35 * ruin;
    let dy = 0;
    if (lift) dy = -Math.pow(fract(t * hashRange(b.seed, 13, 0.02, 0.06) + hash(b.seed, 17)), 1.3) * 900 * ruin;
    ctx.save();
    ctx.translate(b.x + b.w / 2, baseY + dy);
    ctx.rotate(tilt + (lift ? Math.sin(t * 0.3 + b.seed) * 0.4 : 0));
    ctx.translate(-(b.x + b.w / 2), -baseY);
    if (o.rim) {
      ctx.save();
      ctx.translate(o.rimDx ?? 0, o.rimDy ?? -3);
      ctx.fillStyle = o.rim;
      ctx.beginPath();
      buildingPath(ctx, b, baseY);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    buildingPath(ctx, b, baseY);
    ctx.fill();
    // windows
    const win = o.windows ?? 0;
    if (win > 0 && !lift) {
      ctx.fillStyle = o.windowColor || '#ffc76b';
      const cols = Math.max(1, Math.floor(b.w / 22));
      const rows = Math.floor(b.h / 34);
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const k = b.seed + r * 31 + c * 7;
          if (hash(k, 9) > win) continue;
          const flick = o.flicker ? (hash(k + Math.floor(t * 6), 4) > 0.15 ? 1 : 0.3) : 1;
          ctx.globalAlpha = (o.alpha ?? 1) * 0.75 * flick;
          ctx.fillRect(b.x + 8 + c * (b.w - 12) / cols, baseY - b.h + 18 + r * 34, 7, 11);
        }
      ctx.globalAlpha = o.alpha ?? 1;
    }
    ctx.restore();
  }
  // clocktower
  ctx.save();
  if (ruin > 0) {
    ctx.translate(CLOCK_X, baseY);
    ctx.rotate(-0.04 * ruin);
    ctx.translate(-CLOCK_X, -baseY);
  }
  if (o.rim) {
    ctx.save();
    ctx.translate(o.rimDx ?? 0, o.rimDy ?? -3);
    ctx.fillStyle = o.rim;
    ctx.beginPath();
    clocktowerPath(ctx, baseY, o.broken);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  clocktowerPath(ctx, baseY, o.broken);
  ctx.fill();
  const c = o.clock || { h: 11, m: 58 };
  drawClockFace(ctx, CLOCK_X, baseY - 640 + 56, 40, c.h, c.m, {
    face: c.face || '#d8c9a3',
    ink: '#120c08',
    glowColor: c.glowColor,
    glowAlpha: c.glowAlpha ?? 0.25,
    cracked: o.broken,
  });
  ctx.restore();
  // ground
  ctx.fillStyle = o.fillBottom || '#05030a';
  ctx.fillRect(-200, baseY - 1, W + 400, H);
  ctx.restore();
}
export const CLOCKTOWER = { x: CLOCK_X, topOffset: 640 };

// ── Planets ──────────────────────────────────────────────────────────────────
function earthTexture(seed, palette) {
  const size = 640;
  return cached(`earth-${seed}-${palette}`, size, size, (ctx) => {
    const img = ctx.createImageData(size, size);
    const d = img.data;
    const pal =
      palette === 'pale'
        ? { deep: [70, 78, 110], shallow: [110, 120, 150], land: [140, 130, 150], high: [180, 170, 185], cloud: [235, 230, 245] }
        : { deep: [10, 34, 60], shallow: [22, 74, 96], land: [58, 66, 40], high: [104, 92, 64], cloud: [235, 228, 240] };
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const dx = (x / size) * 2 - 1, dy = (y / size) * 2 - 1;
        const r2 = dx * dx + dy * dy;
        if (r2 > 1) {
          d[i + 3] = 0;
          continue;
        }
        const z = Math.sqrt(1 - r2);
        const u = dx / (z + 0.6) * 1.6, v = dy / (z + 0.6) * 1.6;
        const n = fbm2(u * 2.2 + 3, v * 2.2 + 7, seed, 5);
        const cl = fbm2(u * 3.5 + 11, v * 6 + 2, seed + 50, 4);
        let col;
        if (n > 0.08) col = n > 0.3 ? pal.high : pal.land;
        else col = n > -0.05 ? pal.shallow : pal.deep;
        const cloud = smoothstep(0.05, 0.45, cl) * 0.85;
        const shade = 0.35 + 0.65 * z;
        for (let k = 0; k < 3; k++) d[i + k] = lerp(col[k], pal.cloud[k], cloud) * shade;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });
}

// opts: rot (radians), atmo (#hex), atmoAlpha, palette ('earth'|'pale'), alpha, light {x,y} direction
export function drawEarth(ctx, cx, cy, r, o = {}) {
  const tex = earthTexture(o.seed ?? 3, o.palette || 'earth');
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  if (o.atmo) {
    const g = ctx.createRadialGradient(cx, cy, r * 0.92, cx, cy, r * 1.18);
    g.addColorStop(0, rgba(o.atmo, 0));
    g.addColorStop(0.35, rgba(o.atmo, (o.atmoAlpha ?? 0.8) * 0.9));
    g.addColorStop(1, rgba(o.atmo, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.18, 0, TAU);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(o.rot ?? 0);
  ctx.drawImage(tex, -r, -r, r * 2, r * 2);
  ctx.rotate(-(o.rot ?? 0));
  // terminator / tint
  const lx = o.light?.x ?? 0.3, ly = o.light?.y ?? -0.6;
  const g2 = ctx.createRadialGradient(lx * r, ly * r, r * 0.1, lx * r * 0.3, ly * r * 0.3, r * 1.6);
  g2.addColorStop(0, 'rgba(0,0,0,0)');
  g2.addColorStop(0.7, 'rgba(0,0,0,0.25)');
  g2.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = g2;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  if (o.tint) {
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = o.tint;
    ctx.fillRect(-r, -r, r * 2, r * 2);
  }
  ctx.restore();
  if (o.atmo) {
    ctx.save();
    ctx.globalAlpha *= (o.alpha ?? 1) * 0.9;
    ctx.strokeStyle = rgba(o.atmo, 0.55);
    ctx.lineWidth = r * 0.012;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.002, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

// ── Incursion sky ────────────────────────────────────────────────────────────
// The upside-down second Earth fills the upper sky; the friction band crawls with lightning.
export function drawIncursionSky(ctx, t, o = {}) {
  const intensity = o.intensity ?? 1;
  ctx.fillStyle = vGradient(ctx, 0, 0, 0, H, [
    [0, '#120018'],
    [0.45, '#3a0a4a'],
    [0.75, '#7a1a6e'],
    [1, '#2a0820'],
  ]);
  ctx.fillRect(-W, -H, W * 3, H * 3);
  const r = o.r ?? 1500;
  const cx = W * 0.5 + (o.dx ?? 0), cy = (o.cy ?? -1080) + (o.dy ?? 0);
  // glow of the friction band
  additive(ctx, () => {
    glow(ctx, cx, cy + r, r * 0.9, '#ff3ad0', 0.35 * intensity);
    glow(ctx, cx - 500, cy + r * 0.98, 700, '#8a5bff', 0.35 * intensity);
  });
  drawEarth(ctx, cx, cy, r, { rot: Math.PI + t * 0.004, atmo: '#ff4fd8', atmoAlpha: 0.9, light: { x: 0, y: 0.9 }, seed: 5, tint: '#b04bff' });
  // friction band
  additive(ctx, () => {
    ctx.save();
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = rgba(k === 1 ? '#ff7ae6' : '#a070ff', (0.18 + 0.1 * Math.sin(t * 3 + k)) * intensity);
      ctx.lineWidth = 60 - k * 18;
      ctx.beginPath();
      ctx.arc(cx, cy, r * (1.02 + k * 0.012), Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
    ctx.restore();
  });
  // lightning crawling along the band
  const slot = Math.floor(t * 9);
  const count = Math.round(4 * intensity + 2);
  for (let i = 0; i < count; i++) {
    const k = slot * 13 + i;
    if (hash(k, 77) > 0.55 + 0.2 * (1 - intensity)) continue;
    const a = Math.PI * hashRange(k, 2, 0.22, 0.78);
    const x0 = cx + Math.cos(a) * r * 1.02, y0 = cy + Math.sin(a) * r * 1.02;
    const rand = mulberry32(k * 991 + 5);
    const len = hashRange(k, 4, 120, 420);
    const ang = a + hashRange(k, 6, -0.6, 0.6);
    const pts = lightningPath(x0, y0, x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len * 0.8, k, 0.22, 5, rand);
    strokeGlowPath(ctx, pts, hash(k, 8) > 0.5 ? '#ffd0ff' : '#b88cff', 2.2, 0.5);
  }
}

// ── Weather & particles ──────────────────────────────────────────────────────
export function drawRain(ctx, t, o = {}) {
  const n = o.count ?? 260;
  const up = o.up ? -1 : 1;
  const speed = o.speed ?? 1400;
  const slant = o.slant ?? 0.12;
  ctx.save();
  ctx.strokeStyle = o.color || 'rgba(190,200,255,0.28)';
  ctx.lineWidth = o.width ?? 1.6;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const sp = speed * hashRange(i, 21, 0.7, 1.3);
    const len = hashRange(i, 22, 18, 52) * (speed / 1400);
    const x0 = hash(i, 23) * (W + 400) - 200;
    let y = fract(hash(i, 24) + (t * sp) / (H + 200)) * (H + 200) - 100;
    if (up < 0) y = H - y;
    const x = x0 + y * slant * up;
    ctx.moveTo(x, y);
    ctx.lineTo(x - len * slant * up, y - len * up);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawDebris(ctx, t, o = {}) {
  const n = o.count ?? 46;
  for (let i = 0; i < n; i++) {
    const size = hashRange(i, 31, 6, 46) * (o.scale ?? 1);
    const speed = hashRange(i, 32, 30, 120);
    const x = hash(i, 33) * W + Math.sin(t * 0.4 + i) * 30;
    const y = H + 60 - fract(hash(i, 34) + (t * speed) / (H + 200)) * (H + 300);
    const rot = t * hashRange(i, 35, -1.4, 1.4) + i;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const pts = [];
    const m = 5 + Math.floor(hash(i, 36) * 3);
    for (let k = 0; k < m; k++) {
      const a = (k / m) * TAU;
      const rr = size * hashRange(i * 7 + k, 37, 0.55, 1);
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    ctx.fillStyle = o.rim || '#c45cff';
    ctx.beginPath();
    poly(ctx, pts.map(([a, b]) => [a + 1.5, b - 2]));
    ctx.fill();
    ctx.fillStyle = o.fill || '#0b0410';
    ctx.beginPath();
    poly(ctx, pts);
    ctx.fill();
    ctx.restore();
  }
}

export function drawDust(ctx, t, o = {}) {
  const n = o.count ?? 90;
  const frozen = o.frozen ?? 0;
  const tt = lerp(t, o.freezeAt ?? t, frozen);
  ctx.save();
  additive(ctx, () => {
    for (let i = 0; i < n; i++) {
      const x = (o.x ?? 0) + (hash(i, 41) * (o.w ?? W) + Math.sin(tt * 0.3 + i) * 40 + tt * 6) % (o.w ?? W);
      const y = (o.y ?? 0) + ((hash(i, 42) * (o.h ?? H) - tt * hashRange(i, 43, 3, 12)) % (o.h ?? H) + (o.h ?? H)) % (o.h ?? H);
      const tw = 0.5 + 0.5 * Math.sin(tt * 2 + i * 1.7);
      ctx.fillStyle = rgba(o.color || '#ffe2a8', (o.alpha ?? 0.5) * tw * hashRange(i, 44, 0.3, 1));
      const r = hashRange(i, 45, 0.8, 2.6);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
  });
  ctx.restore();
}

export function drawBirds(ctx, t, o = {}) {
  const n = o.count ?? 18;
  const frozen = o.frozen ?? 0;
  ctx.save();
  ctx.strokeStyle = o.color || '#1a1414';
  ctx.lineWidth = o.width ?? 2.4;
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const tt = frozen ? (o.freezeAt ?? 0) : t;
    const x = ((o.x ?? 300) + hash(i, 51) * (o.spread ?? 500) + tt * hashRange(i, 52, 40, 70)) % (W + 200) - 100;
    const y = (o.y ?? 260) + hash(i, 53) * (o.spreadY ?? 160) + Math.sin(tt * 0.8 + i) * 8;
    const flap = frozen ? 0.4 : Math.sin(tt * 9 + i * 2);
    const s = hashRange(i, 54, 6, 12) * (o.scale ?? 1);
    ctx.beginPath();
    ctx.moveTo(x - s, y - flap * s * 0.6);
    ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.2, x, y);
    ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.2, x + s, y - flap * s * 0.6);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawStars(ctx, t, o = {}) {
  const n = o.count ?? 220;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const x = hash(i, 61) * W, y = hash(i, 62) * (o.h ?? H * 0.7);
    const tw = 0.6 + 0.4 * Math.sin(t * hashRange(i, 63, 0.5, 3) + i);
    ctx.fillStyle = `rgba(230,225,255,${(o.alpha ?? 0.8) * tw * hash(i, 64)})`;
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  ctx.restore();
}

// Purple "ink in water" bleeding down from the zenith. amount 0..1.
export function drawBruise(ctx, t, amount, o = {}) {
  if (amount <= 0) return;
  const blobs = o.blobs ?? 26;
  ctx.save();
  for (let i = 0; i < blobs; i++) {
    const delay = hash(i, 71) * 0.45;
    const k = clamp((amount - delay) / (1 - delay));
    if (k <= 0) continue;
    const x = hash(i, 72) * W * 1.2 - W * 0.1 + noise1(t * 0.3 + i, 5) * 40;
    const y = -80 + hash(i, 73) * 220 * k + k * k * hash(i, 74) * (o.reach ?? 520);
    const r = (120 + hash(i, 75) * 380) * (0.3 + k);
    const col = i % 3 === 0 ? '#6b1f7a' : i % 3 === 1 ? '#3e1258' : '#8a2a6a';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(col, 0.75 * k));
    g.addColorStop(0.6, rgba(col, 0.35 * k));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // veil
  ctx.fillStyle = vGradient(ctx, 0, 0, 0, H * 0.8, [
    [0, rgba('#2a0838', 0.85 * amount)],
    [1, rgba('#2a0838', 0)],
  ]);
  ctx.fillRect(-W, -H, W * 3, H * 1.8);
  ctx.restore();
}

// Small masked figure standing on a floating shard (blink-and-miss cameo).
export function drawMaskedOnShard(ctx, x, y, s, t) {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 2) * 4);
  ctx.fillStyle = '#0a0410';
  ctx.beginPath();
  poly(ctx, [[-60 * s, 0], [70 * s, -6 * s], [40 * s, 30 * s], [-10 * s, 50 * s], [-50 * s, 26 * s]]);
  ctx.fill();
  ctx.beginPath();
  poly(ctx, [[-10 * s, 0], [-14 * s, -70 * s], [-6 * s, -96 * s], [6 * s, -96 * s], [14 * s, -70 * s], [12 * s, 0]]);
  ctx.fill();
  ctx.fillStyle = '#f4ecdc';
  ctx.beginPath();
  ctx.ellipse(0, -88 * s, 6 * s, 8 * s, 0, 0, TAU);
  ctx.fill();
  glow(ctx, 0, -88 * s, 30 * s, '#f4ecdc', 0.35);
  ctx.restore();
}
