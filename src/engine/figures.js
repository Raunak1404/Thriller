// Character silhouettes: a posable skeleton rig + costumes, and portrait heads.
// Style: rim-lit silhouette noir. Bodies are near-black; a coloured rim on the
// light side gives them shape. Detail lives in eyes, hands and glows.
import { glow, additive, poly, smoothPath, limb } from './draw.js';
import { lerp, clamp, rgba, TAU, smoothstep } from './util.js';

// Normalised joints: facing right, feet at (0,0), head ≈ -0.9 (unit = body height).
export const POSES = {
  stand: {
    head: [0.02, -0.905], neck: [0.0, -0.83], shF: [0.07, -0.8], shB: [-0.07, -0.8],
    elF: [0.1, -0.63], haF: [0.11, -0.47], elB: [-0.1, -0.63], haB: [-0.11, -0.47],
    hip: [0, -0.5], knF: [0.03, -0.26], ftF: [0.05, 0], knB: [-0.03, -0.26], ftB: [-0.05, 0],
  },
  kneel: {
    head: [0.03, -0.6], neck: [0.01, -0.53], shF: [0.06, -0.5], shB: [-0.05, -0.51],
    elF: [0.11, -0.4], haF: [0.07, -0.43], elB: [-0.07, -0.38], haB: [-0.05, -0.27],
    hip: [-0.05, -0.2], knF: [0.15, -0.05], ftF: [-0.13, -0.01], knB: [0.13, -0.035], ftB: [-0.15, 0],
  },
  seated: {
    head: [0.11, -0.67], neck: [0.06, -0.6], shF: [0.1, -0.57], shB: [0.0, -0.58],
    elF: [0.15, -0.42], haF: [0.27, -0.44], elB: [0.07, -0.43], haB: [0.21, -0.45],
    hip: [-0.05, -0.3], knF: [0.14, -0.31], ftF: [0.14, -0.02], knB: [0.11, -0.3], ftB: [0.1, -0.01],
  },
  floor: {
    head: [-0.2, -0.4], neck: [-0.17, -0.33], shF: [-0.12, -0.3], shB: [-0.22, -0.3],
    elF: [-0.05, -0.22], haF: [0.02, -0.18], elB: [-0.3, -0.15], haB: [-0.3, -0.01],
    hip: [0, -0.08], knF: [0.25, -0.1], ftF: [0.45, -0.02], knB: [0.22, -0.06], ftB: [0.42, 0],
  },
};
const ARMS = {
  reach: { elF: [0.2, -0.7], haF: [0.34, -0.62] },
  reachFar: { elF: [0.24, -0.76], haF: [0.42, -0.74] },
  clutch: { elF: [0.13, -0.79], haF: [0.05, -0.93], elB: [-0.1, -0.8], haB: [-0.03, -0.94] },
  backing: { elF: [0.11, -0.68], haF: [0.17, -0.79], elB: [-0.01, -0.68], haB: [0.07, -0.81] },
  cast: { elF: [0.17, -0.76], haF: [0.31, -0.84], elB: [0.12, -0.73], haB: [0.27, -0.77] },
  hold: { elF: [0.11, -0.6], haF: [0.09, -0.69] },
  holdBoth: { elF: [0.11, -0.6], haF: [0.12, -0.66], elB: [0.03, -0.6], haB: [0.09, -0.65] },
  side: { elB: [-0.09, -0.62], haB: [-0.03, -0.56] },
  watch: { elF: [0.12, -0.66], haF: [0.1, -0.77] },
  phone: { elF: [0.12, -0.7], haF: [0.08, -0.86] },
  pointUp: { elF: [0.14, -0.86], haF: [0.2, -1.0] },
  hands: { elF: [0.12, -0.6], haF: [0.18, -0.62], elB: [0.03, -0.6], haB: [0.13, -0.6] },
};

export function makePose(base = 'stand', arms = null, over = {}) {
  const p = { ...(typeof base === 'string' ? POSES[base] : base) };
  if (arms) Object.assign(p, typeof arms === 'string' ? ARMS[arms] : arms);
  return Object.assign(p, over);
}

export function lerpPose(a, b, k) {
  const out = {};
  for (const key of Object.keys(a)) out[key] = [lerp(a[key][0], b[key][0], k), lerp(a[key][1], b[key][1], k)];
  return out;
}

function rotAround(p, c, a) {
  const s = Math.sin(a), co = Math.cos(a);
  const dx = p[0] - c[0], dy = p[1] - c[1];
  return [c[0] + dx * co - dy * s, c[1] + dx * s + dy * co];
}

// Costume presets. hem: coat length (height above the feet; 0 = floor-length, null = no coat)
export const COSTUMES = {
  elias: { hem: 0.4, flare: 0.05, hair: 'short', gloves: true, glasses: true, width: 0.95 },
  yesterday: { hem: 0.1, flare: 0.1, hair: 'grey', width: 1.08, collar: true },
  seren: { hem: 0.18, flare: 0.08, hair: 'long', width: 0.9, sigil: true },
  altSeren: { hem: 0.2, flare: 0.08, hair: 'long', width: 0.9 },
  pemberton: { hem: 0.14, flare: 0.07, hair: 'hat', width: 0.95 },
  henry: { hem: null, hair: 'short', width: 0.95 },
  abernathy: { hem: 0.34, flare: 0.06, hair: 'bald', width: 1.15, loupe: true },
  person: { hem: 0.3, flare: 0.05, hair: 'short', width: 1 },
  personAlt: { hem: 0.18, flare: 0.07, hair: 'bob', width: 0.92 },
  child: { hem: 0.3, flare: 0.07, hair: 'bob', width: 1.1 },
  robe: { hem: 0, flare: 0.16, hair: 'hood', width: 1.1 },
};

// Tapered limb: a quad strip through three joints with per-joint widths.
function taper(ctx, pts, widths) {
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0];
    const l = Math.hypot(nx, ny) || 1;
    nx /= l;
    ny /= l;
    const w = widths[i] / 2;
    L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
    R.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  ctx.moveTo(L[0][0], L[0][1]);
  for (const p of L.slice(1)) ctx.lineTo(p[0], p[1]);
  for (const p of R.reverse()) ctx.lineTo(p[0], p[1]);
  ctx.closePath();
  for (const [i, p] of [[0, pts[0]], [pts.length - 1, pts[pts.length - 1]]]) {
    ctx.moveTo(p[0] + widths[i] / 2, p[1]);
    ctx.arc(p[0], p[1], widths[i] / 2, 0, TAU);
  }
}

// Head outline (relative to head centre, unit = body height), facing right.
const HEAD_PROFILE = [
  [-0.052, 0.0], [-0.04, -0.045], [-0.008, -0.066], [0.03, -0.055], [0.046, -0.03], [0.05, -0.012],
  [0.066, 0.008], [0.05, 0.018], [0.052, 0.03], [0.044, 0.052], [0.015, 0.066], [-0.022, 0.048], [-0.046, 0.03],
];
const HEAD_FRONT = HEAD_PROFILE.map((_, i, a) => {
  const ang = (i / a.length) * TAU + Math.PI;
  return [Math.cos(ang) * 0.046, Math.sin(ang) * 0.064 + (Math.sin(ang) > 0 ? 0.004 : 0)];
});

// Draw a figure. o: { pose, dir (1 right / -1 left), body, rim, rimDx, rimDy, costume (name|obj),
//   t, wind, hairUp, headTilt, lean, ghost (0..1 translucent), bare (no gloves), eyes: {color, glow, turn} }
export function humanoid(ctx, x, y, h, o = {}) {
  const dir = o.dir ?? 1;
  const cos = typeof o.costume === 'string' ? COSTUMES[o.costume] : o.costume || COSTUMES.person;
  let J = o.pose ? { ...o.pose } : { ...POSES.stand };
  const t = o.t ?? 0;
  const wind = o.wind ?? 0;
  if (o.lean) for (const k of ['head', 'neck', 'shF', 'shB', 'elF', 'haF', 'elB', 'haB']) J[k] = rotAround(J[k], J.hip, o.lean);
  const S = (p) => [x + p[0] * h * dir, y + p[1] * h];
  const wd = cos.width ?? 1;
  const flap = (Math.sin(t * 3.1) * 0.02 + Math.sin(t * 7.3 + 1) * 0.01) * wind;
  const turn = o.eyes?.turn ?? 0;
  const bent = J.knF[1] - J.hip[1] > -0.12; // kneeling / seated: thighs roughly horizontal
  const u = h;

  const draw = (color) => {
    ctx.fillStyle = color;
    // back limbs
    ctx.beginPath();
    taper(ctx, [S(J.shB), S(J.elB), S(J.haB)], [0.05 * u * wd, 0.04 * u * wd, 0.03 * u]);
    taper(ctx, [S(J.hip), S(J.knB), S(J.ftB)], [0.065 * u * wd, 0.045 * u, 0.032 * u]);
    ctx.fill();
    // torso
    const sw = 0.075 * wd;
    const mid = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
    const chest = mid(J.shF, J.hip, 0.3), waist = mid(J.shF, J.hip, 0.75);
    const back = mid(J.shB, J.hip, 0.35);
    ctx.beginPath();
    smoothPath(ctx, [
      [J.neck[0] + 0.02, J.neck[1] + 0.005],
      [J.shF[0] + 0.01, J.shF[1] + 0.005],
      [chest[0] + 0.04 * wd, chest[1]],
      [waist[0] + 0.045 * wd, waist[1]],
      [J.hip[0] + 0.06 * wd, J.hip[1] + 0.03],
      [J.hip[0] - 0.06 * wd, J.hip[1] + 0.03],
      [back[0] - 0.05 * wd, back[1]],
      [J.shB[0] - 0.015, J.shB[1] + 0.01],
      [J.neck[0] - 0.025, J.neck[1] + 0.005],
    ].map(S), true, 0.45);
    ctx.fill();
    // coat
    if (cos.hem != null) {
      const tail = wind * 0.06 + flap;
      const fl = cos.flare ?? 0.06;
      ctx.beginPath();
      if (bent) {
        smoothPath(ctx, [
          [J.hip[0] - 0.07 * wd, J.hip[1] - 0.06],
          [J.hip[0] + 0.065 * wd, J.hip[1] - 0.06],
          [J.knF[0] + 0.01, J.knF[1] - 0.03],
          [J.knF[0] - 0.03, J.knF[1] + 0.025],
          [J.hip[0] - 0.02, Math.min(-0.01, J.hip[1] + 0.28)],
          [J.hip[0] - 0.13 * wd - tail, Math.min(-0.005, J.hip[1] + 0.3)],
          [J.hip[0] - 0.1 * wd, J.hip[1] + 0.05],
        ].map(S), true, 0.35);
      } else {
        const hemY = Math.max(J.hip[1] + 0.08, -cos.hem);
        smoothPath(ctx, [
          [J.shB[0] - 0.01, J.shB[1] + 0.02],
          [J.shF[0] + 0.015, J.shF[1] + 0.02],
          [chest[0] + 0.05 * wd, chest[1] + 0.02],
          [J.hip[0] + 0.07 * wd, J.hip[1]],
          [J.hip[0] + (0.07 + fl) * wd + flap * 0.5, hemY],
          [J.hip[0] + 0.0, hemY + 0.012],
          [J.hip[0] - (0.075 + fl) * wd - tail, hemY - tail * 0.5],
          [J.hip[0] - 0.075 * wd - tail * 0.4, J.hip[1] + 0.02],
          [back[0] - 0.055 * wd, back[1]],
        ].map(S), true, 0.4);
      }
      ctx.fill();
    }
    // front leg + shoe
    ctx.beginPath();
    taper(ctx, [S(J.hip), S(J.knF), S(J.ftF)], [0.065 * u * wd, 0.045 * u, 0.032 * u]);
    for (const f of [J.ftF, J.ftB]) {
      const p = S([f[0] + 0.022, f[1] - 0.008]);
      ctx.moveTo(p[0] + 0.03 * u, p[1]);
      ctx.ellipse(p[0], p[1], 0.032 * u, 0.012 * u, 0, 0, TAU);
    }
    ctx.fill();
    // neck
    ctx.beginPath();
    taper(ctx, [S(J.neck), S([J.head[0] - 0.005, J.head[1] + 0.045])], [0.04 * u, 0.034 * u]);
    ctx.fill();
    // head
    const hc = S(J.head);
    ctx.save();
    ctx.translate(hc[0], hc[1]);
    ctx.rotate((o.headTilt ?? 0) * dir);
    ctx.beginPath();
    smoothPath(ctx, HEAD_PROFILE.map((p, i) => [lerp(p[0], HEAD_FRONT[i][0], turn) * u * dir, lerp(p[1], HEAD_FRONT[i][1], turn) * u]), true, 0.5);
    ctx.fill();
    drawHair(ctx, cos.hair, u, dir, t, o.hairUp ?? 0, wind, turn);
    ctx.restore();
    // collar
    if (cos.collar) {
      const n = S(J.neck);
      ctx.beginPath();
      ctx.moveTo(n[0] - 0.055 * u * dir, n[1] + 0.035 * u);
      ctx.lineTo(n[0] - 0.045 * u * dir, n[1] - 0.055 * u);
      ctx.lineTo(n[0] + 0.0 * u * dir, n[1] + 0.02 * u);
      ctx.lineTo(n[0] + 0.035 * u * dir, n[1] - 0.045 * u);
      ctx.lineTo(n[0] + 0.05 * u * dir, n[1] + 0.035 * u);
      ctx.closePath();
      ctx.fill();
    }
    // front arm + hand
    ctx.beginPath();
    taper(ctx, [S(J.shF), S(J.elF), S(J.haF)], [0.052 * u * wd, 0.04 * u * wd, 0.03 * u]);
    ctx.fill();
  };

  ctx.save();
  if (o.ghost) ctx.globalAlpha *= 1 - o.ghost * 0.7;
  if (o.rim) {
    ctx.save();
    ctx.translate((o.rimDx ?? 3) * dir * (o.rimFlip ? -1 : 1), o.rimDy ?? -2);
    draw(o.rim);
    ctx.restore();
  }
  draw(o.body || '#07040b');
  // hands (gloves are white: the series' motif)
  const handCol = cos.gloves && !o.bare ? '#efe9dc' : o.body || '#07040b';
  for (const k of ['haB', 'haF']) {
    if (k === 'haB' && o.hideBackHand) continue;
    const p = S(J[k]);
    ctx.fillStyle = handCol;
    ctx.beginPath();
    ctx.ellipse(p[0], p[1], 0.022 * u, 0.026 * u, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  const head = S(J.head);
  const out = { joints: Object.fromEntries(Object.entries(J).map(([k, v]) => [k, S(v)])), head };
  if (cos.glasses && !o.ghost) {
    const g = [head[0] + 0.035 * u * dir, head[1] - 0.01 * u];
    additive(ctx, () => glow(ctx, g[0], g[1], 0.028 * u, '#fff2d0', 0.55));
  }
  if (o.eyes) {
    const e1 = [head[0] + lerp(0.036, 0.018, turn) * u * dir, head[1] - 0.014 * u];
    const e2 = [head[0] + lerp(0.026, -0.018, turn) * u * dir, head[1] - 0.014 * u];
    const col = o.eyes.color || '#8ff3ff';
    const g = o.eyes.glow ?? 1;
    additive(ctx, () => {
      glow(ctx, e1[0], e1[1], 0.05 * u * g, col, 0.8);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(e1[0], e1[1], 0.006 * u, 0, TAU);
      ctx.fill();
      const a2 = smoothstep(0.25, 0.9, turn);
      if (a2 > 0) {
        glow(ctx, e2[0], e2[1], 0.05 * u * g * a2, col, 0.8 * a2);
        ctx.globalAlpha = a2;
        ctx.beginPath();
        ctx.arc(e2[0], e2[1], 0.006 * u, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });
    out.eyes = [e1, e2];
  }
  if (cos.sigil && o.sigil !== false) {
    const p = S([J.haF[0] - 0.02, J.haF[1] + 0.02]);
    additive(ctx, () => glow(ctx, p[0], p[1], 0.05 * u * (o.sigil ?? 0.6), '#c49bff', 0.9));
  }
  if (cos.loupe) {
    const p = [head[0] + 0.045 * u * dir, head[1] - 0.012 * u];
    additive(ctx, () => glow(ctx, p[0], p[1], 0.04 * u, '#fff0c0', 0.8));
  }
  out.handF = S(J.haF);
  out.handB = S(J.haB);
  out.chest = S([lerp(J.shF[0], J.hip[0], 0.3) + 0.04, lerp(J.shF[1], J.hip[1], 0.3)]);
  return out;
}

// Hair, drawn in the head's local space (already rotated by head tilt).
function drawHair(ctx, style, u, dir, t, hairUp, wind, turn) {
  const P = (x, y) => [x * u * dir, y * u];
  const sway = Math.sin(t * 2.2) * 0.01 * (wind + hairUp);
  ctx.beginPath();
  if (style === 'short') {
    smoothPath(ctx, [P(0.042, -0.042), P(0.01, -0.074), P(-0.035, -0.066), P(-0.058, -0.035), P(-0.056, 0.0), P(-0.045, 0.022), P(-0.035, -0.01), P(-0.01, -0.04), P(0.025, -0.04)], true, 0.5);
  } else if (style === 'grey') {
    const w = wind * 0.03 + sway;
    smoothPath(ctx, [P(0.042, -0.05), P(0.012, -0.08), P(-0.035, -0.078), P(-0.064, -0.056), P(-0.077 - w, -0.03), P(-0.068 - w, -0.008), P(-0.074 - w * 1.3, 0.018), P(-0.054, 0.03), P(-0.045, 0.0), P(-0.02, -0.035), P(0.02, -0.046)], true, 0.5);
  } else if (style === 'long') {
    // a ribbon of hair from the crown, falling down the back or floating up
    const tipX = lerp(-0.07, -0.12, hairUp) - wind * 0.04 + sway, tipY = lerp(0.24, -0.16, hairUp);
    const midX = lerp(-0.075, -0.1, hairUp) - wind * 0.02, midY = lerp(0.1, -0.06, hairUp);
    smoothPath(ctx, [P(0.042, -0.042), P(0.008, -0.075), P(-0.04, -0.07), P(-0.064, -0.035), P(midX - 0.03, midY), P(tipX, tipY), P(midX + 0.02, midY + 0.01), P(-0.03, 0.03), P(-0.035, -0.01), P(-0.005, -0.045), P(0.03, -0.045)], true, 0.5);
    if (turn > 0.5) {
      // framing the face when seen from the front
      ctx.moveTo(...P(0.04, -0.03));
      smoothPath(ctx, [P(0.048, -0.04), P(0.06, 0.02), P(0.058, 0.09), P(0.045, 0.06), P(0.04, 0.0)], true, 0.5);
    }
  } else if (style === 'bob') {
    smoothPath(ctx, [P(0.045, -0.04), P(0.01, -0.075), P(-0.045, -0.065), P(-0.062, -0.01), P(-0.055, 0.045), P(-0.03, 0.04), P(-0.03, -0.01), P(0.0, -0.045), P(0.03, -0.045)], true, 0.5);
  } else if (style === 'hat') {
    ctx.ellipse(-0.004 * u * dir, -0.044 * u, 0.058 * u, 0.034 * u, 0, Math.PI, TAU);
    ctx.rect(-0.078 * u, -0.05 * u, 0.156 * u, 0.012 * u);
  } else if (style === 'hood') {
    smoothPath(ctx, [P(0.07, 0.07), P(0.075, -0.05), P(0.0, -0.1), P(-0.08, -0.06), P(-0.085, 0.07)], true, 0.5);
  }
  ctx.fill();
}

// ── Profile portrait (facing right when dir=1) ──────────────────────────────
// who: 'elias' | 'yesterday' | 'seren'. light: rim strength 0..1. sweep: 0..1 light band position.
const PROFILE = [
  [-0.45, -0.55], [-0.12, -0.72], [0.22, -0.62], [0.35, -0.38], [0.39, -0.17], [0.36, -0.08], [0.41, 0.0],
  [0.55, 0.16], [0.44, 0.22], [0.45, 0.3], [0.41, 0.35], [0.44, 0.4], [0.38, 0.47], [0.4, 0.58], [0.28, 0.66],
  [0.18, 0.9], [0.22, 1.35], [-0.35, 1.35], [-0.3, 0.6], [-0.52, 0.12],
];

export function profilePortrait(ctx, cx, cy, s, o = {}) {
  const dir = o.dir ?? 1;
  const who = o.who || 'elias';
  const rimCol = o.rim || (who === 'yesterday' ? '#8ff3ff' : who === 'seren' ? '#c9a2ff' : '#ffc884');
  const light = o.light ?? 1;
  const P = (p) => [cx + p[0] * s * dir, cy + p[1] * s];
  const face = (c) => smoothPath(c, PROFILE.map(P), true, 0.5);

  ctx.save();
  // rim crescent: shape in rim colour, then the body shifted back
  ctx.fillStyle = rgba(rimCol, 0.95 * light);
  ctx.beginPath();
  face(ctx);
  ctx.fill();
  ctx.save();
  ctx.translate(-0.022 * s * dir, 0.006 * s);
  ctx.fillStyle = o.body || '#07050a';
  ctx.beginPath();
  face(ctx);
  ctx.fill();
  ctx.restore();
  // soft fill light inside the face
  ctx.save();
  ctx.beginPath();
  face(ctx);
  ctx.clip();
  const fx = cx + 0.25 * s * dir;
  const g = ctx.createRadialGradient(fx, cy, 0, fx, cy, s * 0.6);
  g.addColorStop(0, rgba(rimCol, 0.13 * light));
  g.addColorStop(1, rgba(rimCol, 0));
  ctx.fillStyle = g;
  ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
  if (o.sweep != null) {
    const sx = cx + lerp(-0.7, 0.8, o.sweep) * s * dir;
    const lg = ctx.createLinearGradient(sx - 0.25 * s, 0, sx + 0.25 * s, 0);
    lg.addColorStop(0, rgba(rimCol, 0));
    lg.addColorStop(0.5, rgba(rimCol, 0.4));
    lg.addColorStop(1, rgba(rimCol, 0));
    additive(ctx, () => {
      ctx.fillStyle = lg;
      ctx.fillRect(cx - s * 1.5, cy - s * 1.5, s * 3, s * 3);
    });
  }
  // cheek hollow / age for the elder
  if (who === 'yesterday') {
    ctx.strokeStyle = rgba(rimCol, 0.35 * light);
    ctx.lineWidth = s * 0.008;
    ctx.beginPath();
    ctx.moveTo(...P([0.3, 0.12]));
    ctx.quadraticCurveTo(...P([0.25, 0.3]), ...P([0.3, 0.42]));
    ctx.moveTo(...P([0.2, -0.02]));
    ctx.lineTo(...P([0.12, 0.02]));
    ctx.moveTo(...P([0.21, 0.02]));
    ctx.lineTo(...P([0.13, 0.07]));
    ctx.stroke();
    // stubble
    ctx.fillStyle = rgba(rimCol, 0.25 * light);
    for (let i = 0; i < 40; i++) {
      const a = i * 2.39;
      const p = P([0.2 + (i % 7) * 0.025 + Math.sin(a) * 0.01, 0.42 + Math.floor(i / 7) * 0.035]);
      ctx.fillRect(p[0], p[1], s * 0.004, s * 0.004);
    }
  }
  ctx.restore();
  // ear
  ctx.strokeStyle = rgba(rimCol, 0.25 * light);
  ctx.lineWidth = s * 0.012;
  ctx.beginPath();
  ctx.ellipse(...P([-0.08, 0.05]), s * 0.06, s * 0.1, 0, -1.2, 1.9);
  ctx.stroke();
  // hair
  ctx.fillStyle = o.body || '#07050a';
  ctx.beginPath();
  if (who === 'seren') {
    smoothPath(ctx, [[-0.6, -0.4], [-0.15, -0.8], [0.3, -0.62], [0.2, -0.45], [-0.1, -0.5], [-0.2, -0.1], [-0.25, 0.6], [-0.3, 1.3], [-0.7, 1.4], [-0.7, 0.4]].map(P), true, 0.5);
  } else if (who === 'yesterday') {
    const pts = [[-0.58, -0.3], [-0.42, -0.74], [-0.05, -0.86], [0.3, -0.7], [0.18, -0.6], [-0.1, -0.62], [-0.2, -0.3], [-0.38, 0.1], [-0.62, 0.15]];
    smoothPath(ctx, pts.map(P), true, 0.5);
  } else {
    smoothPath(ctx, [[-0.55, -0.35], [-0.3, -0.78], [0.15, -0.8], [0.32, -0.6], [0.2, -0.55], [-0.1, -0.58], [-0.25, -0.3], [-0.45, 0.05]].map(P), true, 0.5);
  }
  ctx.fill();
  // hair: rim light along its outline, plus grey streaks following the flow for the elder
  ctx.save();
  ctx.strokeStyle = rgba(rimCol, 0.55 * light);
  ctx.lineWidth = s * 0.009;
  ctx.stroke();
  if (who === 'yesterday') {
    ctx.clip();
    ctx.strokeStyle = rgba('#c9d6dc', 0.35 * light);
    ctx.lineWidth = s * 0.014;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(...P([0.12 - i * 0.05, -0.74 + i * 0.02]));
      ctx.quadraticCurveTo(...P([-0.2 - i * 0.04, -0.72 + i * 0.05]), ...P([-0.48 - i * 0.02, -0.3 + i * 0.1]));
      ctx.stroke();
    }
  }
  ctx.restore();

  // eye
  const eye = P([0.3, -0.07]);
  if (who === 'yesterday') {
    const col = '#8ff3ff';
    additive(ctx, () => {
      glow(ctx, eye[0], eye[1], s * 0.28 * light, col, 0.55);
      ctx.strokeStyle = rgba(col, 0.9);
      ctx.lineWidth = s * 0.006;
      ctx.beginPath();
      ctx.ellipse(eye[0], eye[1], s * 0.035, s * 0.045, 0, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(eye[0], eye[1], s * 0.014, 0, TAU);
      ctx.fill();
    });
    // the scar through the left eye
    ctx.strokeStyle = rgba('#d8eef5', 0.75 * light);
    ctx.lineWidth = s * 0.012;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(...P([0.2, -0.3]));
    ctx.lineTo(...P([0.27, -0.13]));
    ctx.moveTo(...P([0.31, -0.02]));
    ctx.lineTo(...P([0.36, 0.13]));
    ctx.stroke();
  } else if (who === 'elias') {
    ctx.strokeStyle = rgba('#ffe2b0', 0.75 * light);
    ctx.lineWidth = s * 0.012;
    ctx.beginPath();
    ctx.ellipse(eye[0] + 0.015 * s * dir, eye[1], s * 0.07, s * 0.055, 0, 0, TAU);
    ctx.moveTo(eye[0] - 0.055 * s * dir, eye[1] - 0.01 * s);
    ctx.lineTo(...P([-0.07, -0.02]));
    ctx.stroke();
    additive(ctx, () => glow(ctx, eye[0] + 0.03 * s * dir, eye[1] - 0.02 * s, s * 0.06, '#fff4dc', 0.7 * light));
    ctx.fillStyle = rgba('#ffe7c2', 0.85 * light);
    ctx.beginPath();
    ctx.arc(eye[0] + 0.01 * s * dir, eye[1], s * 0.012, 0, TAU);
    ctx.fill();
    if (o.blood) {
      ctx.strokeStyle = '#b3121b';
      ctx.lineWidth = s * 0.01;
      ctx.beginPath();
      ctx.moveTo(...P([0.45, 0.21]));
      ctx.lineTo(...P([0.44, 0.33]));
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = rgba('#efe2ff', 0.9 * light);
    ctx.beginPath();
    ctx.ellipse(eye[0] + 0.01 * s * dir, eye[1], s * 0.02, s * 0.012, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(rimCol, 0.6 * light);
    ctx.lineWidth = s * 0.008;
    ctx.beginPath();
    ctx.moveTo(...P([0.24, -0.11]));
    ctx.quadraticCurveTo(...P([0.31, -0.13]), ...P([0.36, -0.1]));
    ctx.stroke();
  }
  ctx.restore();
  return { eye };
}

// ── Front portrait (for Seren of the dying world) ────────────────────────────
// gaze: -1..1 horizontal iris offset (0 = looking straight down the lens)
export function frontPortrait(ctx, cx, cy, s, o = {}) {
  const t = o.t ?? 0;
  const under = o.underlight || '#b06cff';
  const hairUp = o.hairUp ?? 0.6;
  ctx.save();
  // shoulders + neck
  ctx.fillStyle = '#060309';
  ctx.beginPath();
  smoothPath(ctx, [[cx - s * 1.1, cy + s * 1.6], [cx - s * 0.9, cy + s * 0.95], [cx - s * 0.2, cy + s * 0.7], [cx + s * 0.2, cy + s * 0.7], [cx + s * 0.9, cy + s * 0.95], [cx + s * 1.1, cy + s * 1.6]], false);
  ctx.lineTo(cx + s * 1.1, cy + s * 2);
  ctx.lineTo(cx - s * 1.1, cy + s * 2);
  ctx.fill();
  // wound light
  additive(ctx, () => glow(ctx, cx + s * 0.1, cy + s * 1.35, s * 0.9, '#ffc36b', 0.35 * (o.wound ?? 1)));
  additive(ctx, () => glow(ctx, cx + s * 0.1, cy + s * 1.35, s * 0.5, under, 0.45 * (o.wound ?? 1)));
  // hair back mass (floating upward)
  ctx.fillStyle = '#0a0610';
  ctx.beginPath();
  const hs = [];
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI + (i / 14) * Math.PI;
    const wob = Math.sin(t * 1.4 + i * 1.3) * 0.05;
    const r = 0.62 + (Math.abs(i - 7) < 5 ? hairUp * 0.35 : 0.08) + wob;
    hs.push([cx + Math.cos(a) * s * r * 1.05, cy - 0.05 * s + Math.sin(a) * s * r * 1.15]);
  }
  hs.push([cx + s * 0.62, cy + s * 0.75], [cx - s * 0.62, cy + s * 0.75]);
  smoothPath(ctx, hs, true, 0.5);
  ctx.fill();
  // face
  const facePath = (c) =>
    smoothPath(c, [[cx, cy - s * 0.62], [cx + s * 0.4, cy - s * 0.45], [cx + s * 0.44, cy - s * 0.05], [cx + s * 0.32, cy + s * 0.4], [cx, cy + s * 0.62], [cx - s * 0.32, cy + s * 0.4], [cx - s * 0.44, cy - s * 0.05], [cx - s * 0.4, cy - s * 0.45]], true, 0.5);
  ctx.fillStyle = '#0d0912';
  ctx.beginPath();
  facePath(ctx);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  facePath(ctx);
  ctx.clip();
  const ug = ctx.createLinearGradient(0, cy + s * 0.65, 0, cy - s * 0.3);
  ug.addColorStop(0, rgba(under, 0.55));
  ug.addColorStop(0.5, rgba(under, 0.12));
  ug.addColorStop(1, rgba(under, 0));
  ctx.fillStyle = ug;
  ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
  // side rims
  const rg = ctx.createRadialGradient(cx + s * 0.6, cy - s * 0.1, s * 0.2, cx + s * 0.6, cy - s * 0.1, s * 0.5);
  rg.addColorStop(0, rgba('#ff6be0', 0.35));
  rg.addColorStop(1, rgba('#ff6be0', 0));
  ctx.fillStyle = rg;
  ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
  // nose + lips
  ctx.strokeStyle = rgba(under, 0.45);
  ctx.lineWidth = s * 0.012;
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.02, cy + s * 0.02);
  ctx.quadraticCurveTo(cx + s * 0.06, cy + s * 0.15, cx, cy + s * 0.2);
  ctx.stroke();
  const mouthOpen = o.speaking ? 0.02 + 0.02 * Math.abs(Math.sin(t * 14)) : 0.006;
  ctx.fillStyle = rgba('#3a0d1c', 0.95);
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.34, s * 0.1, s * mouthOpen + s * 0.012, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = rgba('#ff9fbf', 0.45);
  ctx.lineWidth = s * 0.008;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.1, cy + s * 0.34);
  ctx.quadraticCurveTo(cx, cy + s * (0.38 + mouthOpen), cx + s * 0.1, cy + s * 0.34);
  ctx.stroke();
  // blood at the lip
  ctx.strokeStyle = '#b0101e';
  ctx.lineWidth = s * 0.012;
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.08, cy + s * 0.36);
  ctx.quadraticCurveTo(cx + s * 0.09, cy + s * 0.45, cx + s * 0.07, cy + s * 0.55);
  ctx.stroke();
  // brows
  ctx.strokeStyle = rgba('#000000', 0.8);
  ctx.lineWidth = s * 0.03;
  ctx.lineCap = 'round';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * s * 0.07, cy - s * 0.2);
    ctx.quadraticCurveTo(cx + sx * s * 0.18, cy - s * 0.26 - (o.pain ?? 0.3) * s * 0.03 * -sx, cx + sx * s * 0.3, cy - s * 0.2);
    ctx.stroke();
  }
  ctx.restore();
  // eyes
  const gaze = o.gaze ?? 0;
  const gy = o.gazeY ?? 0;
  for (const sx of [-1, 1]) {
    const ex = cx + sx * s * 0.18, ey = cy - s * 0.08;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(ex, ey, s * 0.1, s * 0.045 * (o.lids ?? 1), 0, 0, TAU);
    ctx.clip();
    ctx.fillStyle = 'rgba(210,200,225,0.55)';
    ctx.fillRect(ex - s * 0.12, ey - s * 0.06, s * 0.24, s * 0.12);
    const ix = ex + gaze * s * 0.055, iy = ey + gy * s * 0.02;
    ctx.fillStyle = '#3b2550';
    ctx.beginPath();
    ctx.arc(ix, iy, s * 0.042, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#05020a';
    ctx.beginPath();
    ctx.arc(ix, iy, s * 0.02, 0, TAU);
    ctx.fill();
    ctx.restore();
    additive(ctx, () => {
      ctx.fillStyle = 'rgba(255,240,255,0.9)';
      ctx.beginPath();
      ctx.arc(ex + gaze * s * 0.055 + s * 0.015, ey - s * 0.012, s * 0.01, 0, TAU);
      ctx.fill();
      if (o.tears) glow(ctx, ex, ey + s * 0.05, s * 0.06, '#d8c8ff', 0.4);
    });
  }
  // front hair strands framing the face
  ctx.strokeStyle = '#0a0610';
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const sx = i < 3 ? -1 : 1;
    const k = i % 3;
    ctx.lineWidth = s * (0.05 - k * 0.012);
    ctx.beginPath();
    ctx.moveTo(cx + sx * s * (0.1 + k * 0.08), cy - s * 0.6);
    ctx.quadraticCurveTo(cx + sx * s * (0.48 + k * 0.05), cy - s * 0.3, cx + sx * s * (0.5 + k * 0.08 + Math.sin(t * 2 + i) * 0.03), cy + s * (0.45 - hairUp * 0.9 + k * 0.1));
    ctx.stroke();
  }
  ctx.restore();
}

// Hooded figure with a porcelain kintsugi mask (Atropos).
export function maskedFigure(ctx, x, y, h, o = {}) {
  const t = o.t ?? 0;
  const P = (u, v) => [x + u * h, y + v * h];
  ctx.save();
  // robe
  ctx.fillStyle = '#05030a';
  ctx.beginPath();
  smoothPath(ctx, [P(-0.05, -0.86), P(0.12, -0.8), P(0.2, -0.4), P(0.26, 0), P(-0.28, 0), P(-0.2, -0.4), P(-0.13, -0.8)], true, 0.4);
  ctx.fill();
  // hood rim
  ctx.strokeStyle = rgba('#e6d5a8', 0.25);
  ctx.lineWidth = h * 0.006;
  ctx.beginPath();
  ctx.arc(...P(0, -0.86), h * 0.1, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  ctx.fillStyle = '#05030a';
  ctx.beginPath();
  ctx.ellipse(...P(0, -0.86), h * 0.1, h * 0.12, 0, 0, TAU);
  ctx.fill();
  // mask
  const m = P(0.005, -0.85);
  additive(ctx, () => glow(ctx, m[0], m[1], h * 0.18, '#f6ead0', 0.25));
  ctx.fillStyle = '#efe6d6';
  ctx.beginPath();
  ctx.ellipse(m[0], m[1], h * 0.058, h * 0.078, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#05030a';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(m[0] + sx * h * 0.022, m[1] - h * 0.012, h * 0.014, h * 0.007, sx * 0.25, 0, TAU);
    ctx.fill();
  }
  // kintsugi crack
  ctx.strokeStyle = '#ffcf5a';
  ctx.lineWidth = h * 0.004;
  ctx.beginPath();
  poly(ctx, [[m[0] - h * 0.02, m[1] - h * 0.078], [m[0] - h * 0.005, m[1] - h * 0.035], [m[0] - h * 0.018, m[1] + h * 0.005], [m[0] + h * 0.006, m[1] + h * 0.04], [m[0] - h * 0.004, m[1] + h * 0.078]], false);
  ctx.stroke();
  additive(ctx, () => glow(ctx, m[0] - h * 0.006, m[1], h * 0.05, '#ffcf5a', 0.35 + 0.15 * Math.sin(t * 3)));
  // reaching arm
  const reach = o.reach ?? 0.5;
  const sh = P(0.08, -0.72), hand = P(lerp(0.16, 0.34, reach), lerp(-0.5, -0.66, reach));
  limb(ctx, [sh, P(lerp(0.18, 0.24, reach), -0.6), hand], h * 0.04, '#05030a');
  ctx.fillStyle = '#e9e0d0';
  ctx.beginPath();
  ctx.arc(hand[0], hand[1], h * 0.016, 0, TAU);
  ctx.fill();
  ctx.restore();
  return { hand, mask: m };
}
