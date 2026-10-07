// Low-level drawing primitives for the 1920×1080 virtual canvas.
import { keyframes, ease, rgba, clamp } from './util.js';

export const W = 1920;
export const H = 1080;

export const FONTS = {
  title: '"Cinzel", "Times New Roman", serif',
  serif: '"Cormorant Garamond", Georgia, serif',
  sans: '"Inter", "Helvetica Neue", Arial, sans-serif',
  mono: '"JetBrains Mono", "Courier New", monospace',
  type: '"Special Elite", "Courier New", monospace',
  slam: '"Bebas Neue", "Impact", "Arial Narrow", sans-serif',
};

export function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

const caches = new Map();
export function cached(key, w, h, paint) {
  let c = caches.get(key);
  if (!c) {
    c = makeCanvas(w, h);
    paint(c.getContext('2d'), w, h);
    caches.set(key, c);
  }
  return c;
}

// A param may be a constant or keyframes [[t, v], ...] in shot-local seconds.
export function val(v, t, easing = ease.inOut, dflt = 0) {
  if (Array.isArray(v) && Array.isArray(v[0])) return keyframes(v, t, easing);
  if (v === true) return 1;
  if (v === false || v == null) return dflt;
  return v;
}

export function glow(ctx, x, y, r, color, alpha = 1) {
  if (r <= 0 || alpha <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.25, rgba(color, alpha * 0.45));
  g.addColorStop(0.6, rgba(color, alpha * 0.12));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

export function additive(ctx, fn) {
  const op = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  fn();
  ctx.globalCompositeOperation = op;
}

export function withAlpha(ctx, a, fn) {
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * clamp(a);
  fn();
  ctx.globalAlpha = prev;
}

export function vGradient(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

export function fillScreen(ctx, style) {
  ctx.fillStyle = style;
  ctx.fillRect(-W, -H, W * 3, H * 3);
}

export function skyGradient(ctx, stops, y0 = 0, y1 = H) {
  fillScreen(ctx, vGradient(ctx, 0, y0, 0, y1, stops));
}

// Smooth closed/open path through points using Catmull-Rom → Bézier.
export function smoothPath(ctx, pts, closed = true, tension = 0.5) {
  const n = pts.length;
  if (n < 2) return;
  const P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  ctx.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const k = tension / 3;
    ctx.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) * k,
      p1[1] + (p2[1] - p0[1]) * k,
      p2[0] - (p3[0] - p1[0]) * k,
      p2[1] - (p3[1] - p1[1]) * k,
      p2[0],
      p2[1],
    );
  }
  if (closed) ctx.closePath();
}

export function poly(ctx, pts, close = true) {
  if (!pts.length) return;
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}

// Draw a shape with a rim light: the shape in the rim colour offset toward the
// light, then the shape in the body colour on top.
export function rimLit(ctx, pathFn, body, rim, dx, dy, rimAlpha = 1) {
  if (rim && rimAlpha > 0) {
    ctx.save();
    ctx.translate(dx, dy);
    ctx.globalAlpha *= rimAlpha;
    ctx.fillStyle = rim;
    ctx.beginPath();
    pathFn(ctx);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = body;
  ctx.beginPath();
  pathFn(ctx);
  ctx.fill();
}

export function limb(ctx, pts, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (pts.length === 3) {
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
  } else poly(ctx, pts, false);
  ctx.stroke();
}

export function setFont(ctx, family, size, weight = 400, style = 'normal') {
  ctx.font = `${style} ${weight} ${Math.round(size)}px ${family}`;
}

export function text(ctx, str, x, y, { family = FONTS.sans, size = 40, weight = 400, style = 'normal', color = '#fff', align = 'center', baseline = 'middle', alpha = 1, spacing = 0 } = {}) {
  setFont(ctx, family, size, weight, style);
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillStyle = color;
  withAlpha(ctx, alpha, () => {
    if (spacing && 'letterSpacing' in ctx) {
      ctx.letterSpacing = `${spacing}px`;
      ctx.fillText(str, x, y);
      ctx.letterSpacing = '0px';
    } else ctx.fillText(str, x, y);
  });
}

// Deterministic jagged lightning bolt between two points.
export function lightningPath(x0, y0, x1, y1, seed, rough = 0.18, depth = 6, rand) {
  let pts = [[x0, y0], [x1, y1]];
  let amp = Math.hypot(x1 - x0, y1 - y0) * rough;
  for (let d = 0; d < depth; d++) {
    const next = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      const nx = -(by - ay), ny = bx - ax;
      const l = Math.hypot(nx, ny) || 1;
      const off = (rand() * 2 - 1) * amp;
      next.push([mx + (nx / l) * off, my + (ny / l) * off], pts[i + 1]);
    }
    pts = next;
    amp *= 0.55;
  }
  return pts;
}

export function strokeGlowPath(ctx, pts, color, width, glowAlpha = 0.35) {
  additive(ctx, () => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [w, a] of [[width * 7, glowAlpha * 0.25], [width * 3, glowAlpha * 0.6], [width, 1]]) {
      ctx.strokeStyle = rgba(color, a);
      ctx.lineWidth = w;
      ctx.beginPath();
      poly(ctx, pts, false);
      ctx.stroke();
    }
  });
}
