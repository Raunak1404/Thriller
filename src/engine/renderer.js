// The renderer: a pure function of time. render(T) draws the exact frame for
// second T of the episode, which makes scrubbing, live playback and offline
// frame-by-frame export all identical.
import { W, H, makeCanvas, val } from './draw.js';
import { shotAt } from './timeline.js';
import { SCENES } from './scenes/index.js';
import { drawDialogue, drawSuper, drawCountdown, drawRing } from './text.js';
import { ease, hash, noise1, clamp, smoothstep, mulberry32 } from './util.js';

const NO_DRIFT = new Set(['title', 'clock', 'credits', 'rules', 'tv', 'black', 'number']);

function grainTile() {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  const img = g.createImageData(256, 256);
  const rnd = mulberry32(99);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

export function createRenderer(canvas, timeline, { onError } = {}) {
  const ctx = canvas.getContext('2d');
  const errors = new Set();
  const scale = canvas.width / W;
  const buf = makeCanvas(canvas.width, canvas.height);
  const bctx = buf.getContext('2d');
  const bufR = makeCanvas(canvas.width, canvas.height);
  const rctx = bufR.getContext('2d');
  const grain = grainTile();
  const grainPattern = ctx.createPattern(grain, 'repeat');

  function impulses(shot, s, T) {
    let amp = 0, glitch = 0;
    const post = shot.post;
    const at = post.shakeAt;
    if (at != null) {
      const t0 = typeof at === 'number' ? at : s.events[at];
      if (t0 != null && s.t >= t0) amp += 42 * Math.exp(-(s.t - t0) * 3.2);
    }
    // the dialogue drives the camera: slammed words punch, screams quake
    for (const line of s.lines) {
      if (line.fx === 'slam') {
        for (const w of line.words) if (T >= w.t0 && T < w.t0 + 0.6) amp += 14 * Math.exp(-(T - w.t0) * 9);
      } else if (line.fx === 'scream' && T >= line.start && T <= line.end + 0.3) {
        amp += 26;
        glitch = Math.max(glitch, 0.6);
      } else if (line.fx === 'glitch' && T >= line.start && T <= line.start + 0.5) glitch = Math.max(glitch, 0.4);
    }
    return { amp, glitch };
  }

  function render(T) {
    T = clamp(T, 0, timeline.duration - 1e-3);
    const shot = shotAt(timeline, T);
    const t = T - shot.start;
    const post = shot.post || {};
    const lines = timeline.lines.filter((l) => l.shotId === shot.id);
    const s = {
      t,
      T,
      dur: shot.dur,
      p: clamp(t / shot.dur),
      params: shot.params,
      shot,
      shotStart: shot.start,
      lines,
      events: shot.events || {},
      v: (name, d = 0) => val(shot.params[name], t, ease.inOut, d),
    };
    const fr = Math.floor(T * 24);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // camera: drift, shake
    const imp = impulses(shot, s, T);
    const shakeAmp = (post.shake ?? 0) * 18 + imp.amp;
    const sx = noise1(T * 9, 1) * shakeAmp, sy = noise1(T * 9, 2) * shakeAmp, sr = noise1(T * 5, 3) * shakeAmp * 0.0006;
    const drift = NO_DRIFT.has(shot.scene) || shot.params.drift === false ? 1 : 1 + 0.035 * ease.inOut(s.p);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.translate(W / 2 + sx, H / 2 + sy);
    ctx.rotate(sr);
    ctx.scale(drift, drift);
    ctx.translate(-W / 2, -H / 2);
    const scene = SCENES[shot.scene];
    try {
      if (!scene) throw new Error(`unknown scene "${shot.scene}"`);
      scene(ctx, s);
    } catch (e) {
      // A drawing bug must never stop playback: log it once and keep going.
      if (!errors.has(shot.id)) {
        errors.add(shot.id);
        console.error(`[render] shot ${shot.id} at ${T.toFixed(2)}s: ${e.message}`);
      }
      onError?.(shot, T, e);
    }

    // pixel-space effects
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const chroma = Math.max(post.chroma ?? 0, imp.glitch * 0.8);
    if (chroma > 0.02) {
      const d = Math.max(1, Math.round(chroma * 7 * scale * (0.7 + 0.3 * Math.sin(T * 13))));
      bctx.globalCompositeOperation = 'source-over';
      bctx.drawImage(canvas, 0, 0);
      bctx.globalCompositeOperation = 'multiply';
      bctx.fillStyle = '#00ffff';
      bctx.fillRect(0, 0, buf.width, buf.height);
      rctx.globalCompositeOperation = 'source-over';
      rctx.drawImage(canvas, 0, 0);
      rctx.globalCompositeOperation = 'multiply';
      rctx.fillStyle = '#ff0000';
      rctx.fillRect(0, 0, buf.width, buf.height);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(bufR, -d, 0);
      ctx.drawImage(buf, d, 0);
      ctx.globalCompositeOperation = 'source-over';
    }
    const glitch = Math.max(post.glitch ?? 0, imp.glitch);
    if (glitch > 0.02 && hash(fr, 401) < 0.35 + glitch * 0.5) {
      bctx.globalCompositeOperation = 'source-over';
      bctx.drawImage(canvas, 0, 0);
      const n = 3 + Math.floor(glitch * 8);
      for (let i = 0; i < n; i++) {
        const y = Math.floor(hash(fr * 17 + i, 402) * canvas.height);
        const h = Math.floor((8 + hash(fr * 17 + i, 403) * 60) * scale);
        const dx = Math.floor((hash(fr * 17 + i, 404) - 0.5) * 120 * glitch * scale);
        ctx.drawImage(buf, 0, y, canvas.width, h, dx, y, canvas.width, h);
      }
    }

    // film finish
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const g = post.grain ?? 0.06;
    if (g > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = g * 1.6;
      const gf = Math.floor(T * 12); // grain refreshes at 12 fps, like old film stock
      ctx.translate(-hash(gf, 411) * 256, -hash(gf, 412) * 256);
      ctx.fillStyle = grainPattern;
      ctx.fillRect(0, 0, W + 512, H + 512);
      ctx.restore();
    }
    const vig = post.vignette ?? 0.5;
    if (vig > 0) {
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, `rgba(0,0,0,${vig})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    }
    const lb = post.letterbox ?? 0; // bar height per side, as a fraction of H
    if (lb > 0) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H * lb);
      ctx.fillRect(0, H - H * lb, W, H * lb);
    }

    // overlays: HUD, supers, kinetic dialogue (on top of the bars)
    for (const tr of timeline.tracks) {
      if (tr.type === 'countdown') drawCountdown(ctx, tr, T);
      else if (tr.type === 'ring') drawRing(ctx, tr, T);
    }
    for (const sup of shot.supers || []) drawSuper(ctx, sup, t);
    const near = timeline.lines.filter((l) => T >= l.start - 0.2 && T <= l.end + 3);
    drawDialogue(ctx, near, T);
    if (post.flash) {
      const [f0, fd] = post.flash;
      if (t >= f0 && t <= f0 + fd) {
        ctx.fillStyle = `rgba(255,255,255,${1 - ease.outCubic((t - f0) / fd)})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
    if (post.fadeIn && t < post.fadeIn) {
      ctx.fillStyle = `rgba(0,0,0,${1 - smoothstep(0, post.fadeIn, t)})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (post.fadeOut && t > shot.dur - post.fadeOut) {
      ctx.fillStyle = `rgba(0,0,0,${smoothstep(shot.dur - post.fadeOut, shot.dur, t)})`;
      ctx.fillRect(0, 0, W, H);
    }
    return shot;
  }

  return { render, timeline };
}
