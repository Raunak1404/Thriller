// Kinetic typography for dialogue + on-screen supers + HUD overlays.
// Dialogue delivery is the show's special effect: how a line lands on screen
// mirrors how it is performed.
import { W, H, FONTS, setFont, glow, additive, withAlpha } from './draw.js';
import { clamp, ease, hash, hashRange, rgba, smoothstep, formatClock, TAU, lerp } from './util.js';
import { speaker } from '../cast.js';

const GLYPHS = '!<>-_\\/[]{}—=+*^?#ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function lineAlpha(line, T, fadeIn = 0.12, hold = 0.9, fadeOut = 0.35) {
  const a = smoothstep(line.start - 0.05, line.start + fadeIn, T);
  const cut = line.cut ?? Infinity;
  const b = line.end + hold + fadeOut > cut
    ? 1 - smoothstep(cut - 0.14, cut - 0.02, T)
    : 1 - smoothstep(line.end + hold, line.end + hold + fadeOut, T);
  return Math.min(a, b);
}

function wrapWords(ctx, words, maxW) {
  const rows = [[]];
  let w = 0;
  const space = ctx.measureText(' ').width;
  for (const word of words) {
    const ww = ctx.measureText(word.w).width;
    if (w + ww > maxW && rows[rows.length - 1].length) {
      rows.push([]);
      w = 0;
    }
    rows[rows.length - 1].push({ ...word, width: ww });
    w += ww + space;
  }
  return rows.map((r) => ({ words: r, width: r.reduce((s, x) => s + x.width, 0) + space * (r.length - 1) }));
}

// Standard cinematic subtitle with per-word reveal.
function drawSub(ctx, line, T, col, o) {
  const a = lineAlpha(line, T);
  if (a <= 0) return;
  const size = o.size ?? 44;
  setFont(ctx, FONTS.sans, size, 600);
  const rows = wrapWords(ctx, line.words, 1400);
  const lh = size * 1.32;
  const baseY = (o.y ?? H * 0.86) - (rows.length - 1) * lh;
  const space = ctx.measureText(' ').width;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  rows.forEach((row, ri) => {
    let x = W / 2 - row.width / 2;
    const y = baseY + ri * lh;
    for (const w of row.words) {
      const k = smoothstep(w.t0 - 0.08, w.t0 + 0.1, T);
      const emph = line.emph?.includes(w.w);
      ctx.save();
      ctx.globalAlpha = a * lerp(0.28, 1, k);
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 14;
      ctx.fillStyle = emph ? '#ffffff' : col;
      setFont(ctx, FONTS.sans, size, emph ? 800 : 600);
      ctx.fillText(w.w, x, y + (1 - k) * 6);
      ctx.restore();
      x += w.width + space;
    }
  });
  if (line.os || line.vo) {
    ctx.save();
    ctx.globalAlpha = a * 0.55;
    setFont(ctx, FONTS.mono, 18, 500);
    ctx.textAlign = 'center';
    ctx.fillStyle = col;
    ctx.fillText(`${speaker(line.who).name.toUpperCase()} (${line.vo ? 'V.O.' : 'O.S.'})`, W / 2, baseY - lh * 0.95);
    ctx.restore();
  }
}

// Whisper: small italic serif letters that drift up and dissolve.
function drawWhisper(ctx, line, T, col, o) {
  const a = lineAlpha(line, T, 0.2, 1.1, 0.8);
  if (a <= 0) return;
  const size = o.size ?? 54;
  setFont(ctx, FONTS.serif, size, 500, 'italic');
  const rows = wrapWords(ctx, line.words, 1300);
  const lh = size * 1.25;
  const baseY = (o.y ?? H * 0.83) - (rows.length - 1) * lh;
  const space = ctx.measureText(' ').width;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  rows.forEach((row, ri) => {
    let x = W / 2 - row.width / 2;
    const y = baseY + ri * lh;
    for (const w of row.words) {
      const chars = [...w.w];
      let cx = x;
      chars.forEach((ch, ci) => {
        const ct = w.t0 + ((w.t1 - w.t0) * ci) / chars.length;
        const k = smoothstep(ct - 0.05, ct + 0.35, T);
        const drift = (1 - k) * 12 + Math.max(0, T - line.end) * 10;
        const cw = ctx.measureText(ch).width;
        ctx.save();
        ctx.globalAlpha = a * k;
        ctx.fillStyle = col;
        ctx.shadowColor = rgba('#000000', 0.9);
        ctx.shadowBlur = 16;
        ctx.fillText(ch, cx, y - drift + Math.sin(T * 2 + ci) * 1.5);
        ctx.restore();
        cx += cw;
      });
      x += w.width + space;
    }
  });
}

// Slam: words stamped big in the centre, each with an impact.
function drawSlam(ctx, line, T, col, o) {
  const a = lineAlpha(line, T, 0.05, 0.6, 0.4);
  if (a <= 0) return;
  const size = o.size ?? (line.words.length <= 2 ? 190 : line.words.length <= 4 ? 150 : 110);
  setFont(ctx, FONTS.slam, size, 400);
  const rows = wrapWords(ctx, line.words, 1600);
  const lh = size * 0.95;
  const baseY = (o.y ?? H * 0.5) - ((rows.length - 1) * lh) / 2;
  const space = ctx.measureText(' ').width;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  rows.forEach((row, ri) => {
    let x = W / 2 - row.width / 2;
    const y = baseY + ri * lh;
    for (const w of row.words) {
      const k = clamp((T - w.t0 + 0.04) / 0.18);
      if (k > 0) {
        const s = lerp(1.7, 1, ease.outExpo(k));
        ctx.save();
        ctx.translate(x + w.width / 2, y);
        ctx.scale(s, s);
        ctx.globalAlpha = a * k;
        // ghost trail
        ctx.fillStyle = rgba(col, 0.25);
        ctx.fillText(w.w, -w.width / 2 + 6, 4);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = rgba(col, 0.9);
        ctx.shadowBlur = 40;
        ctx.fillText(w.w, -w.width / 2, 0);
        ctx.restore();
      }
      x += w.width + space;
    }
  });
}

// Scream: huge, jittering, RGB-split letters.
function drawScream(ctx, line, T, col, o) {
  const a = lineAlpha(line, T, 0.03, 0.5, 0.3);
  if (a <= 0) return;
  const size = o.size ?? 230;
  setFont(ctx, FONTS.slam, size, 400);
  const str = line.text.toUpperCase();
  const tw = ctx.measureText(str).width;
  const fit = Math.min(1, 1750 / tw);
  const fr = Math.floor(T * 30);
  ctx.save();
  ctx.translate(W / 2, o.y ?? H * 0.5);
  ctx.scale(fit * (1 + 0.04 * Math.sin(T * 40)), fit);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const jx = (hash(fr, 1) - 0.5) * 18, jy = (hash(fr, 2) - 0.5) * 14;
  ctx.globalAlpha = a;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255,40,80,0.8)';
  ctx.fillText(str, jx - 10, jy);
  ctx.fillStyle = 'rgba(40,200,255,0.8)';
  ctx.fillText(str, jx + 10, jy + 2);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(str, jx, jy);
  ctx.restore();
}

// Glitch: characters scramble, then resolve.
function drawGlitch(ctx, line, T, col, o) {
  const a = lineAlpha(line, T, 0.05, 0.8, 0.4);
  if (a <= 0) return;
  const size = o.size ?? 82;
  const str = line.text;
  const fr = Math.floor(T * 24);
  const progress = clamp((T - line.start) / Math.max(0.3, line.dur * 0.75));
  let shown = '';
  [...str].forEach((ch, i) => {
    const resolveAt = (i / str.length) * 0.9;
    shown += ch === ' ' || progress > resolveAt + 0.1 ? ch : GLYPHS[Math.floor(hash(fr * 31 + i, 9) * GLYPHS.length)];
  });
  setFont(ctx, FONTS.mono, size, 700);
  const fit = Math.min(1, 1700 / ctx.measureText(shown).width);
  ctx.save();
  ctx.translate(W / 2, o.y ?? H * 0.5);
  ctx.scale(fit, fit);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = a;
  const off = (1 - progress) * 14 + 3;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rgba('#ff2a6d', 0.7);
  ctx.fillText(shown, -off, 0);
  ctx.fillStyle = rgba('#2af0ff', 0.7);
  ctx.fillText(shown, off, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = col;
  ctx.fillText(shown, 0, 0);
  // slice displacement
  if (hash(fr, 5) > 0.6) {
    ctx.fillStyle = rgba(col, 0.5);
    ctx.fillRect(-900, hashRange(fr, 6, -40, 40), 1800, 3);
  }
  ctx.restore();
}

// Typewriter (voice-over narration).
function drawType(ctx, line, T, col, o) {
  const a = lineAlpha(line, T, 0.05, 1.4, 0.5);
  if (a <= 0) return;
  const size = o.size ?? 46;
  const chars = [...line.text];
  const span = Math.max(0.2, line.dur * 0.92);
  const n = Math.floor(clamp((T - line.start) / span) * chars.length);
  const shown = chars.slice(0, n).join('');
  setFont(ctx, FONTS.type, size, 400);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const full = ctx.measureText(line.text).width;
  const x = Math.max(120, W / 2 - full / 2);
  const y = o.y ?? H * 0.86;
  ctx.shadowColor = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = col;
  ctx.fillText(shown, x, y);
  if (n < chars.length && Math.floor(T * 3) % 2 === 0) ctx.fillRect(x + ctx.measureText(shown).width + 4, y - size * 0.4, size * 0.45, size * 0.8);
  ctx.restore();
}

// Echo: layered, delayed copies (Atropos).
function drawEcho(ctx, line, T, col, o) {
  const size = o.size ?? 72;
  setFont(ctx, FONTS.title, size, 400);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let k = 3; k >= 0; k--) {
    const lag = k * 0.18;
    const a = lineAlpha({ ...line, start: line.start + lag, end: line.end + lag, cut: (line.cut ?? Infinity) + lag }, T, 0.4, 1.4, 1.0) * (k === 0 ? 1 : 0.22);
    if (a <= 0) continue;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = k === 0 ? col : rgba(col, 0.6);
    ctx.shadowColor = rgba('#ffcf5a', 0.6);
    ctx.shadowBlur = k === 0 ? 24 : 0;
    const spread = (1 + k * 0.04);
    ctx.translate(W / 2 + k * 6, (o.y ?? H * 0.78) - k * 4);
    ctx.scale(spread, spread);
    ctx.fillText(line.text, 0, 0);
    ctx.restore();
  }
}

const MODES = { sub: drawSub, whisper: drawWhisper, slam: drawSlam, scream: drawScream, glitch: drawGlitch, type: drawType, echo: drawEcho };

export function drawDialogue(ctx, lines, T, opts = {}) {
  for (const line of lines) {
    if (line.fx === 'none' || line.sub === false) continue;
    if (T < line.start - 0.2 || T > line.end + 3) continue;
    const fn = MODES[line.fx] || drawSub;
    const col = speaker(line.who).color;
    fn(ctx, line, T, col, { ...opts, ...(line.textOpts || {}) });
  }
}

// ── Supers (titles typed / glitched onto the screen) ─────────────────────────
export function drawSuper(ctx, sup, t) {
  const lt = t - sup.at;
  if (lt < 0 || lt > sup.dur) return;
  const a = Math.min(smoothstep(0, 0.15, lt), 1 - smoothstep(sup.dur - 0.4, sup.dur, lt));
  const y = (sup.y ?? 0.5) * H;
  if (sup.style === 'hud-ghost') {
    const flick = hash(Math.floor(t * 30), 3) > 0.35 ? 1 : 0;
    drawHudBox(ctx, 'IMPACT', sup.text.replace(/^IMPACT\s*/, ''), a * flick * 0.8, t);
    return;
  }
  if (sup.style === 'glitch') {
    drawGlitch(ctx, { text: sup.text, start: sup.at, end: sup.at + sup.dur * 0.5, dur: 0.6 }, t, '#ffffff', { y, size: 64 });
    return;
  }
  const chars = [...sup.text];
  const n = Math.min(chars.length, Math.floor(lt / 0.07) + 1);
  setFont(ctx, FONTS.type, sup.size ?? 52, 400);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = sup.color || '#f2ead8';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 20;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '8px';
  ctx.fillText(chars.slice(0, n).join(''), W / 2, y);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.restore();
}

// ── HUD ──────────────────────────────────────────────────────────────────────
function drawHudBox(ctx, label, value, a, t, critical = false) {
  if (a <= 0) return;
  const x = W - 96, y = 120;
  ctx.save();
  ctx.globalAlpha = a;
  const col = critical ? '#ff3b5c' : '#ff5fd2';
  const fr = Math.floor(t * 24);
  const jx = hash(fr, 8) > 0.92 ? (hash(fr, 9) - 0.5) * 16 : 0;
  ctx.translate(jx, 0);
  setFont(ctx, FONTS.mono, 22, 500);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = rgba(col, 0.85);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
  ctx.fillText(label, x, y - 62);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  setFont(ctx, FONTS.mono, 76, 700);
  ctx.shadowColor = col;
  ctx.shadowBlur = 24;
  ctx.fillStyle = critical && Math.floor(t * 4) % 2 ? '#ffffff' : col;
  ctx.fillText(value, x, y + 8);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = rgba(col, 0.6);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 330, y + 26);
  ctx.lineTo(x, y + 26);
  ctx.stroke();
  // tick bar
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = rgba(col, i < (t * 30) % 30 ? 0.7 : 0.15);
    ctx.fillRect(x - 330 + i * 11, y + 34, 7, 6);
  }
  ctx.restore();
}

export function drawCountdown(ctx, track, T) {
  const k = track.keys;
  const t0 = k[0][0], t1 = k[k.length - 1][0] + (track.hold ?? 0);
  if (T < t0 || T > t1) return;
  let v = k[k.length - 1][1];
  for (let i = 1; i < k.length; i++) {
    if (T <= k[i][0]) {
      const f = (T - k[i - 1][0]) / Math.max(1e-6, k[i][0] - k[i - 1][0]);
      v = lerp(k[i - 1][1], k[i][1], f);
      break;
    }
  }
  const a = Math.min(smoothstep(t0, t0 + 0.5, T), 1);
  drawHudBox(ctx, track.label || 'IMPACT', formatClock(v), a, T, v <= 10);
}

// Retrospection ring timer around the frame.
export function drawRing(ctx, track, T) {
  const k = track.keys;
  const t0 = k[0][0], t1 = k[k.length - 1][0];
  if (T < t0 || T > t1) return;
  const f = (T - t0) / Math.max(1e-6, t1 - t0);
  const remaining = lerp(k[0][1], k[k.length - 1][1], f) / 180;
  const a = Math.min(smoothstep(t0, t0 + 0.6, T), 1 - smoothstep(t1 - 0.3, t1, T));
  const col = track.color === 'violet' ? '#b678ff' : '#ffd27a';
  const cx = W / 2, cy = H / 2, r = H * 0.62;
  ctx.save();
  ctx.globalAlpha = a * 0.9;
  ctx.translate(cx, cy);
  ctx.scale(W / H * 0.92, 1);
  additive(ctx, () => {
    ctx.strokeStyle = rgba(col, 0.18);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = rgba(col, 0.75);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + TAU * remaining);
    ctx.stroke();
    for (let i = 0; i < 60; i++) {
      const ang = (i / 60) * TAU - Math.PI / 2;
      const l = i % 5 === 0 ? 18 : 8;
      ctx.strokeStyle = rgba(col, i / 60 < remaining ? 0.6 : 0.15);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * (r - l), Math.sin(ang) * (r - l));
      ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
      ctx.stroke();
    }
  });
  if (track.cracked) {
    ctx.strokeStyle = rgba('#ffffff', 0.6);
    ctx.lineWidth = 2;
    for (let c = 0; c < 5; c++) {
      const ang = hash(c, 81) * TAU;
      ctx.beginPath();
      let px = Math.cos(ang) * r, py = Math.sin(ang) * r;
      ctx.moveTo(px, py);
      for (let s = 0; s < 6; s++) {
        px += hashRange(c * 10 + s, 82, -40, 40) - Math.cos(ang) * 30;
        py += hashRange(c * 10 + s, 83, -40, 40) - Math.sin(ang) * 30;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}
