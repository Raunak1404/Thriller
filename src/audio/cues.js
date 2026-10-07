// Score + sound design, synthesized in code. Every cue in the episode script
// (audio: [{ cue: 'grind', ... }]) maps to one of these functions.
// Each writes into the mix: m.music / m.sfx (stereo buses) and m.send (reverb send).
import { SR, midi, rng, Biquad, OnePole, adsr, expDecay, fsin } from './dsp.js';

const TAU = Math.PI * 2;
const span = (m, at, dur) => {
  const i0 = Math.max(0, Math.floor(at * SR));
  const i1 = Math.min(m.n, Math.floor((at + dur) * SR));
  return [i0, i1];
};
const noiseGen = (seed) => {
  const r = rng(seed);
  return () => r() * 2 - 1;
};
const seedOf = (c) => Math.floor(c.at * 1000) + 7;

// ── tonal building blocks ────────────────────────────────────────────────────
function bellNote(m, bus, at, freq, vol, { decay = 1.4, partials = [[1, 1], [2.76, 0.4], [5.4, 0.18], [8.93, 0.08]], pan = 0, send = 0.3, wobble = 0 } = {}) {
  const dur = decay * 5;
  const [i0, i1] = span(m, at, dur);
  const ph = partials.map(() => 0);
  for (let i = i0; i < i1; i++) {
    const t = (i - i0) / SR;
    const w = wobble ? 1 + wobble * 0.012 * Math.sin(TAU * 0.7 * t + freq) : 1;
    let v = 0;
    for (let k = 0; k < partials.length; k++) {
      const [mult, amp] = partials[k];
      ph[k] += (TAU * freq * mult * w) / SR;
      v += Math.sin(ph[k]) * amp * Math.exp(-t / (decay / (1 + k * 0.6)));
    }
    v *= vol * Math.min(1, t / 0.003);
    m[bus].add(i, v, pan);
    m.send[i] += v * send;
  }
}

function pianoNote(m, at, freq, vol, dur = 2.5, pan = 0) {
  const [i0, i1] = span(m, at, dur + 0.3);
  let p1 = 0, p2 = 0, p3 = 0;
  for (let i = i0; i < i1; i++) {
    const t = (i - i0) / SR;
    p1 += (TAU * freq) / SR;
    p2 += (TAU * freq * 2.001) / SR;
    p3 += (TAU * freq * 3.003) / SR;
    const env = Math.min(1, t / 0.006) * Math.exp(-t / 1.1) * adsr(t, dur + 0.3, 0, 0.3);
    const v = (Math.sin(p1) + 0.35 * Math.sin(p2) * Math.exp(-t / 0.5) + 0.12 * Math.sin(p3) * Math.exp(-t / 0.3)) * env * vol;
    m.music.add(i, v, pan);
    m.send[i] += v * 0.25;
  }
}

function padVoice(m, at, dur, freq, vol, { fadeIn = 2, fadeOut = 2, harmonics = 6, detune = 0.004, pan = 0, cutoff = 1, lfo = 0.07, bus = 'music', send = 0.35 } = {}) {
  const [i0, i1] = span(m, at, dur);
  const oscs = [-1, 0, 1].map((d) => ({ f: freq * (1 + d * detune), ph: d + 1 }));
  const hw = Array.from({ length: harmonics + 1 }, (_, h) => (h ? (1 / Math.pow(h, 1.5)) * (h > 3 ? cutoff : 1) : 0));
  for (let i = i0; i < i1; i++) {
    const t = (i - i0) / SR;
    const env = adsr(t, dur, fadeIn, fadeOut) * (0.75 + 0.25 * Math.sin(TAU * lfo * t + freq));
    let v = 0;
    for (const o of oscs) {
      o.ph += (TAU * o.f) / SR;
      if (o.ph > TAU * 1e4) o.ph -= TAU * 1e4;
      for (let h = 1; h <= harmonics; h++) v += fsin(o.ph * h) * hw[h];
    }
    v *= (env * vol) / 3;
    m[bus].add(i, v, pan);
    m.send[i] += v * send;
  }
}

// ── cues ─────────────────────────────────────────────────────────────────────
export const CUES = {
  tick(m, c) {
    const n = noiseGen(seedOf(c));
    const [i0, i1] = span(m, c.at, 0.06);
    const bp = new Biquad('bp', c.tock ? 1500 : 1900, 4);
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / SR;
      const v = bp.run(n() * expDecay(t, 0.004)) * 2.0 * (c.vol ?? 0.7) + Math.sin(TAU * (c.tock ? 1500 : 1900) * t) * expDecay(t, 0.01) * 0.1 * (c.vol ?? 0.7);
      m.sfx.add(i, v, 0);
      m.send[i] += v * 0.2;
    }
  },

  ticking(m, c) {
    const rate = Math.abs(c.rate ?? 1), reverse = (c.rate ?? 1) < 0;
    for (let k = 0, t = 0; t < c.dur; k++, t = k / rate) {
      const fade = Math.min(1, (c.dur - t) / 1.2, (t + 0.3) / 0.6);
      if (!reverse) CUES.tick(m, { at: c.at + t, vol: (c.vol ?? 0.3) * (k % 2 ? 0.7 : 1) * fade, tock: k % 2 });
      else {
        // backwards ticks: swell in, cut off
        const n = noiseGen(k + 99);
        const [i0, i1] = span(m, c.at + t, 0.12);
        const bp = new Biquad('bp', k % 2 ? 1400 : 1800, 4);
        for (let i = i0; i < i1; i++) {
          const u = (i - i0) / SR;
          const v = bp.run(n()) * Math.pow(u / 0.12, 3) * (c.vol ?? 0.3) * 1.6 * fade;
          m.sfx.add(i, v, 0);
          m.send[i] += v * 0.3;
        }
      }
    }
  },

  drone(m, c) {
    const note = c.note ?? 38, vol = (c.vol ?? 0.4) * 0.22;
    const opts = { fadeIn: c.fadeIn ?? 2, fadeOut: c.fadeOut ?? 1.5, harmonics: 7, detune: 0.003, cutoff: 0.5, lfo: 0.05 };
    padVoice(m, c.at, c.dur, midi(note - 12), vol * 0.75, { ...opts, pan: 0 });
    padVoice(m, c.at, c.dur, midi(note), vol, { ...opts, pan: -0.4, lfo: 0.06 });
    padVoice(m, c.at, c.dur, midi(note + 7), vol * 0.6, { ...opts, pan: 0.4, lfo: 0.043 });
    padVoice(m, c.at, c.dur, midi(note + 15), vol * 0.25, { ...opts, pan: 0.1, lfo: 0.031, harmonics: 3 });
  },

  boom(m, c) {
    const n = noiseGen(seedOf(c));
    const dur = c.far ? 3 : 2.2;
    const [i0, i1] = span(m, c.at, dur);
    const lp = new Biquad('lp', c.far ? 180 : 420, 0.8);
    let ph = 0;
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / SR;
      const f = 34 + 50 * Math.exp(-t * 3);
      ph += (TAU * f) / SR;
      const v = (Math.sin(ph) * expDecay(t, 0.7) * 0.9 + lp.run(n()) * expDecay(t, 0.35) * 1.4) * (c.vol ?? 0.6);
      m.sfx.add(i, v, 0);
      m.send[i] += v * (c.far ? 0.6 : 0.3);
    }
  },

  impact(m, c) {
    const vol = (c.vol ?? 0.8) * 0.75;
    CUES.boom(m, { at: c.at, vol: vol * 0.9 });
    const n = noiseGen(seedOf(c) + 1);
    const dur = c.huge ? 5 : 2.5;
    const [i0, i1] = span(m, c.at, dur);
    const hp = new Biquad('hp', 1800, 0.7);
    const parts = [97, 141, 223, 311, 457, 619].map((f) => ({ f, ph: 0 }));
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / SR;
      let v = hp.run(n()) * expDecay(t, 0.05) * 0.8;
      for (const p of parts) {
        p.ph += (TAU * p.f) / SR;
        v += Math.sin(p.ph) * expDecay(t, c.huge ? 1.8 : 0.9) * 0.12;
      }
      v *= vol;
      m.sfx.add(i, v, 0);
      m.send[i] += v * (c.huge ? 0.9 : 0.5);
    }
  },

  sub(m, c) {
    const [i0, i1] = span(m, c.at, 2);
    let ph = 0;
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / SR;
      ph += (TAU * (42 + 30 * Math.exp(-t * 6))) / SR;
      const v = Math.sin(ph) * expDecay(t, 0.55) * Math.min(1, t / 0.005) * (c.vol ?? 0.6) * 0.9;
      m.sfx.add(i, v, 0);
    }
  },

  riser(m, c) {
    const n = noiseGen(seedOf(c));
    const [i0, i1] = span(m, c.at, c.dur);
    const bp = new Biquad('bp', 300, 2);
    const lp = new Biquad('lp', 3000, 0.7);
    let ph = 0;
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / SR, u = t / c.dur;
      if ((i - i0) % 64 === 0) bp.set(250 + 2600 * u * u, 1.6);
      ph += (TAU * (180 + 900 * u * u)) / SR;
      const trem = 0.6 + 0.4 * Math.sin(TAU * (2 + 14 * u) * t);
      const env = Math.pow(u, 2.2);
      const v = lp.run(bp.run(n()) * 0.6 + Math.sin(ph) * 0.13 * trem) * env * (c.vol ?? 0.5);
      m.sfx.add(i, v, Math.sin(t * 3) * 0.4);
      m.send[i] += v * 0.3;
    }
  },

  reverse(m, c) {
    const n = noiseGen(seedOf(c));
    const dur = c.dur ?? 2;
    const [i0, i1] = span(m, c.at, dur);
    const hp = new Biquad('hp', 2500, 0.7);
    for (let i = i0; i < i1; i++) {
      const u = (i - i0) / SR / dur;
      const v = hp.run(n()) * Math.pow(u, 3.5) * (c.vol ?? 0.5) * 0.9;
      m.sfx.add(i, v, 0);
      m.send[i] += v * 0.4;
    }
  },

  whoosh(m, c) {
    const n = noiseGen(seedOf(c));
    const dur = c.dur ?? 1.2;
    const [i0, i1] = span(m, c.at, dur);
    const bp = new Biquad('bp', 400, 1.2);
    for (let i = i0; i < i1; i++) {
      const u = (i - i0) / SR / dur;
      if ((i - i0) % 64 === 0) bp.set(300 + 2400 * Math.sin(Math.PI * u), 1.2);
      const v = bp.run(n()) * Math.sin(Math.PI * u) ** 2 * (c.vol ?? 0.5) * 1.6;
      m.sfx.add(i, v, -0.8 + 1.6 * u);
    }
  },

  grind(m, c) {
    const n = noiseGen(seedOf(c));
    const [i0, i1] = span(m, c.at, c.dur);
    const lp = new Biquad('lp', 110, 0.9);
    const bp = new Biquad('bp', 380, 1.6);
    const am = new OnePole(3);
    const r = rng(seedOf(c) + 3);
    let p1 = 0, p2 = 0, target = 0;
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / SR, u = t / c.dur;
      if ((i - i0) % 2400 === 0) target = r();
      const mod = am.run(target);
      p1 += (TAU * 41) / SR;
      p2 += (TAU * 43.6) / SR;
      const rise = 1 + (c.rise ?? 0) * u;
      const env = adsr(t, c.dur, 1.2, 0.8) * rise;
      const v = (lp.run(n()) * 2.2 + bp.run(n()) * 0.32 * mod + (Math.sin(p1) + Math.sin(p2)) * 0.22) * env * (c.vol ?? 0.5) * 0.5;
      m.sfx.addLR(i, v * (0.9 + 0.1 * Math.sin(t * 0.7)), v * (0.9 + 0.1 * Math.cos(t * 0.6)));
      m.send[i] += v * 0.15;
    }
  },

  wind(m, c) {
    const nL = noiseGen(seedOf(c)), nR = noiseGen(seedOf(c) + 1);
    const [i0, i1] = span(m, c.at, c.dur);
    const fl = new Biquad('bp', 500, 0.8), fr = new Biquad('bp', 600, 0.8);
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / SR;
      if ((i - i0) % 128 === 0) {
        fl.set(350 + 250 * Math.sin(t * 0.37) + 120 * Math.sin(t * 1.3), 0.8);
        fr.set(380 + 260 * Math.sin(t * 0.41 + 1) + 110 * Math.sin(t * 1.1), 0.8);
      }
      const env = adsr(t, c.dur, 1.5, 1.5) * (c.vol ?? 0.3) * 0.45 * (0.7 + 0.3 * Math.sin(t * 0.5));
      m.sfx.addLR(i, fl.run(nL()) * env, fr.run(nR()) * env);
    }
  },

  thunder(m, c) {
    const n = noiseGen(seedOf(c));
    const dur = 4.5;
    const [i0, i1] = span(m, c.at, dur);
    const lp = new Biquad('lp', c.far ? 300 : 900, 0.7);
    const r = rng(seedOf(c) + 9);
    const am = new OnePole(8);
    let target = 1;
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / SR;
      if ((i - i0) % 1800 === 0) target = 0.3 + r();
      const crack = c.far ? 0 : n() * expDecay(t, 0.03) * 0.45;
      const v = (lp.run(n()) * am.run(target) * expDecay(t, 1.4) * Math.min(1, t / 0.05) * 1.6 + crack) * (c.vol ?? 0.5);
      m.sfx.add(i, v, 0.2);
      m.send[i] += v * 0.4;
    }
  },

  lullaby(m, c) {
    // The Anchor theme: four descending notes, a music box with a warped memory.
    const vol = (c.vol ?? 0.4) * 0.5;
    const motif = [69, 77, 76, 74]; // A4 F5 E5 D5
    let seq;
    if (c.variant === 'full') seq = [...motif, null, 69, 77, 76, 74, 72, 74, null, 65, 69, 72, 74, 72, 69, 74];
    else seq = motif;
    const step = c.variant === 'low' ? 0.75 : c.variant === 'full' ? 0.55 : 0.6;
    const shift = c.variant === 'low' ? -12 : 0;
    seq.forEach((note, k) => {
      if (note == null) return;
      const det = (c.detune ?? 0) * Math.sin(k * 2.1) * 0.6;
      bellNote(m, 'music', c.at + k * step, midi(note + shift + det), vol, {
        decay: 1.1,
        partials: [[1, 1], [3.01, 0.22], [5.4, 0.08], [7.1, 0.04]],
        pan: Math.sin(k) * 0.3,
        send: 0.45,
        wobble: c.detune ?? 0,
      });
    });
  },

  warm(m, c) {
    // Elias's world: a quiet arpeggiated piano (F – C – Dm – B♭).
    const chords = [
      [53, 60, 65, 69], [48, 55, 64, 67], [50, 57, 62, 65], [46, 53, 62, 65],
    ];
    const tender = c.variant === 'tender';
    const beat = tender ? 0.55 : 0.42;
    const vol = (c.vol ?? 0.4) * 0.16;
    let t = 0, k = 0;
    while (t < c.dur - 1) {
      const ch = chords[Math.floor(k / 8) % chords.length];
      const idx = [0, 1, 2, 3, 2, 1, 2, 3][k % 8];
      const note = ch[idx] + (tender ? 12 : 0);
      const fade = Math.min(1, t / 2, (c.dur - t) / 2);
      pianoNote(m, c.at + t, midi(note), vol * fade * (idx === 0 ? 1.2 : 0.8), beat * 3, (idx - 1.5) * 0.25);
      t += beat;
      k++;
    }
  },

  shimmer(m, c) {
    const notes = c.cold ? [86, 87, 93, 98] : [81, 85, 88, 93];
    notes.forEach((nn, k) =>
      padVoice(m, c.at, c.dur, midi(nn), (c.vol ?? 0.3) * 0.05, { fadeIn: Math.min(1.5, c.dur / 3), fadeOut: Math.min(2, c.dur / 3), harmonics: 2, lfo: 0.3 + k * 0.17, pan: (k - 1.5) * 0.4, send: 0.6 }),
    );
  },

  title(m, c) {
    [26, 38, 45, 50, 53, 57, 64].forEach((nn, k) =>
      padVoice(m, c.at, c.dur, midi(nn), (c.vol ?? 0.7) * 0.07 * (k === 0 ? 1.5 : 1), { fadeIn: 0.05, fadeOut: c.dur * 0.7, harmonics: 8, cutoff: 0.6, pan: (k - 3) * 0.2, send: 0.5 }),
    );
    CUES.impact(m, { at: c.at, vol: (c.vol ?? 0.7) * 0.8, huge: true });
  },

  tension(m, c) {
    const bpm = c.bpm ?? 60;
    const step = 60 / bpm / 2;
    for (let t = 0, k = 0; t < c.dur; t += step, k++) {
      const f = midi(k % 8 === 7 ? 39 : 38);
      const [i0, i1] = span(m, c.at + t, 0.4);
      const lp = new Biquad('lp', 400, 1.5);
      let ph = 0;
      const fade = Math.min(1, t / 3, (c.dur - t) / 2);
      for (let i = i0; i < i1; i++) {
        const u = (i - i0) / SR;
        ph += (TAU * f) / SR;
        const saw = ((ph / TAU) % 1) * 2 - 1;
        const v = lp.run(saw) * expDecay(u, 0.12) * (c.vol ?? 0.3) * 0.5 * fade * (k % 2 ? 0.6 : 1);
        m.music.add(i, v, 0);
      }
    }
  },

  heartbeat(m, c) {
    const beat = 60 / (c.bpm ?? 60);
    for (let t = 0; t < c.dur; t += beat) {
      for (const [off, amp] of [[0, 1], [0.22, 0.6]]) {
        const [i0, i1] = span(m, c.at + t + off, 0.3);
        let ph = 0;
        for (let i = i0; i < i1; i++) {
          const u = (i - i0) / SR;
          ph += (TAU * (55 - 15 * u)) / SR;
          m.sfx.add(i, Math.sin(ph) * expDecay(u, 0.07) * amp * (c.vol ?? 0.4) * 1.2, 0);
        }
      }
    }
  },

  threads(m, c) {
    // Aether: a choir of pure harmonics, gently beating.
    [55, 62, 67, 74, 79, 86].forEach((nn, k) =>
      padVoice(m, c.at, c.dur, midi(nn) * (1 + 0.002 * k), (c.vol ?? 0.4) * 0.05, { fadeIn: Math.min(1.2, c.dur / 3), fadeOut: Math.min(1.5, c.dur / 3), harmonics: 2, lfo: 0.4 + k * 0.23, pan: Math.sin(k * 1.7) * 0.6, send: 0.55 }),
    );
  },

  roar(m, c) {
    const n = noiseGen(seedOf(c));
    const [i0, i1] = span(m, c.at, c.dur);
    const lp = new Biquad('lp', 600, 0.7);
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / SR;
      const env = adsr(t, c.dur, 0.25, 0.6);
      const v = Math.tanh(lp.run(n()) * 3) * env * (c.vol ?? 0.6) * 0.7;
      m.sfx.addLR(i, v, v * 0.95);
      m.send[i] += v * 0.3;
    }
  },

  crystal(m, c) {
    const dur = c.dur ?? 3;
    const [i0, i1] = span(m, c.at, dur);
    const ps = [880, 884, 1318, 1760].map((f) => ({ f, ph: 0 }));
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / SR, u = t / dur;
      const env = c.fade ? (1 - u) * Math.min(1, t / 0.05) : adsr(t, dur, 0.4, 0.3);
      let v = 0;
      for (const p of ps) {
        p.ph += (TAU * p.f * (c.shriek ? 1 + u * 0.25 : 1)) / SR;
        v += Math.sin(p.ph);
      }
      v *= env * (c.vol ?? 0.4) * 0.045;
      m.sfx.add(i, v, Math.sin(t * 2) * 0.3);
      m.send[i] += v * 0.5;
    }
  },

  shatter(m, c) {
    const r = rng(seedOf(c));
    const n = noiseGen(seedOf(c) + 1);
    const [i0, i1] = span(m, c.at, 0.4);
    const hp = new Biquad('hp', 3000, 0.7);
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / SR;
      const v = hp.run(n()) * expDecay(t, 0.06) * (c.vol ?? 0.6) * 1.2;
      m.sfx.add(i, v, 0);
      m.send[i] += v * 0.4;
    }
    const count = c.small ? 10 : 34;
    for (let k = 0; k < count; k++) {
      bellNote(m, 'sfx', c.at + r() * (c.small ? 0.25 : 0.7), 1800 + r() * 3200, (c.vol ?? 0.6) * 0.09, { decay: 0.08 + r() * 0.1, partials: [[1, 1], [1.5, 0.4]], pan: r() * 2 - 1, send: 0.4 });
    }
  },

  stamp(m, c) {
    const n = noiseGen(seedOf(c));
    const [i0, i1] = span(m, c.at, 0.5);
    let ph = 0;
    const lp = new Biquad('lp', 1200, 0.7);
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / SR;
      ph += (TAU * ((c.deep ? 55 : 90) + 60 * Math.exp(-t * 30))) / SR;
      const v = (Math.sin(ph) * expDecay(t, c.deep ? 0.18 : 0.08) + lp.run(n()) * expDecay(t, 0.01) * 0.6) * (c.vol ?? 0.5) * 1.2;
      m.sfx.add(i, v, 0);
      m.send[i] += v * (c.deep ? 0.4 : 0.1);
    }
  },

  glitch(m, c) {
    const r = rng(seedOf(c));
    const n = noiseGen(seedOf(c) + 2);
    const dur = c.dur ?? 1;
    const [i0, i1] = span(m, c.at, dur);
    const lp = new Biquad('lp', 3200, 0.7);
    let gate = 1, f = 400, ph = 0;
    for (let i = i0; i < i1; i++) {
      if ((i - i0) % 1500 === 0) {
        gate = r() > 0.35 ? 1 : 0;
        f = 80 + r() * 2000;
      }
      ph += (TAU * f) / SR;
      const sq = Math.sign(Math.sin(ph));
      const v = lp.run((sq * 0.25 + n() * 0.5) * gate) * (c.vol ?? 0.4) * 0.45;
      m.sfx.add(i, v, r() > 0.5 ? 0.6 : -0.6);
    }
  },

  whispers(m, c) {
    const r = rng(seedOf(c));
    const count = Math.floor(c.dur * 9);
    for (let k = 0; k < count; k++) {
      const at = c.at + r() * c.dur;
      const dur = 0.4 + r() * 1.1;
      const n = noiseGen(k * 31 + 5);
      const bp = new Biquad('bp', 1200 + r() * 2600, 2.5);
      const [i0, i1] = span(m, at, dur);
      const syl = 4 + r() * 5, pan = r() * 2 - 1;
      const ramp = Math.min(1, (at - c.at) / (c.dur * 0.6));
      for (let i = i0; i < i1; i++) {
        const t = (i - i0) / SR;
        const env = Math.sin((Math.PI * t) / dur) * (0.5 + 0.5 * Math.sin(TAU * syl * t)) ** 2;
        const v = bp.run(n()) * env * (c.vol ?? 0.5) * 0.9 * (0.4 + 0.6 * ramp);
        m.sfx.add(i, v, pan);
        m.send[i] += v * 0.4;
      }
    }
  },

  rain(m, c) {
    const nL = noiseGen(seedOf(c)), nR = noiseGen(seedOf(c) + 1);
    const [i0, i1] = span(m, c.at, c.dur);
    const hl = new Biquad('hp', 600, 0.5), hr = new Biquad('hp', 650, 0.5);
    const ll = new Biquad('lp', 4200, 0.5), lr = new Biquad('lp', 4000, 0.5);
    const r = rng(seedOf(c) + 5);
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / SR;
      const env = adsr(t, c.dur, 1, 1.2) * (c.vol ?? 0.4) * 0.3;
      let dl = 0;
      if (r() < 0.0009) dl = (r() - 0.5) * 3;
      m.sfx.addLR(i, ll.run(hl.run(nL())) * env + dl * env, lr.run(hr.run(nR())) * env);
    }
  },

  crowd(m, c) {
    const nL = noiseGen(seedOf(c)), nR = noiseGen(seedOf(c) + 1);
    const [i0, i1] = span(m, c.at, c.dur);
    const bl = new Biquad('bp', 600, 0.9), br = new Biquad('bp', 700, 0.9);
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / SR;
      const env = adsr(t, c.dur, 1, 1) * (c.vol ?? 0.3) * 0.5 * (0.7 + 0.3 * Math.sin(TAU * 2.3 * t) * Math.sin(TAU * 0.4 * t));
      m.sfx.addLR(i, bl.run(nL()) * env, br.run(nR()) * env);
    }
  },

  birds(m, c) {
    const r = rng(seedOf(c));
    const count = Math.floor(c.dur * 2.5);
    for (let k = 0; k < count; k++) {
      const at = c.at + r() * c.dur;
      const f0 = 2500 + r() * 2500;
      const [i0, i1] = span(m, at, 0.12);
      let ph = 0;
      const pan = r() * 2 - 1;
      for (let i = i0; i < i1; i++) {
        const t = (i - i0) / SR;
        ph += (TAU * (f0 + 1500 * Math.sin(TAU * 18 * t))) / SR;
        m.sfx.add(i, Math.sin(ph) * Math.sin((Math.PI * t) / 0.12) * (c.vol ?? 0.3) * 0.12, pan);
      }
    }
  },

  clockChime(m, c) {
    [64, 60, 62, 55].forEach((nn, k) => bellNote(m, 'sfx', c.at + k * 1.1, midi(nn - 12), (c.vol ?? 0.3) * 0.5, { decay: 2.4, send: 0.6, pan: 0.3 }));
  },

  bell(m, c) {
    for (const off of [0, 0.16]) bellNote(m, 'sfx', c.at + off, 2093, (c.vol ?? 0.5) * 0.35, { decay: 0.5, partials: [[1, 1], [1.48, 0.5], [2.1, 0.3], [2.9, 0.2]], send: 0.15 });
  },

  bellShriek(m, c) {
    for (let k = 0; k < 10; k++) bellNote(m, 'sfx', c.at + k * 0.07, 2093 * (1 + (k % 2) * 0.03), (c.vol ?? 0.6) * 0.3 * (1 - k / 12), { decay: 0.4, partials: [[1, 1], [1.48, 0.5], [2.1, 0.3]], send: 0.15 });
  },

  doorBang(m, c) {
    CUES.stamp(m, { at: c.at, vol: (c.vol ?? 0.8) * 0.65, deep: true });
    CUES.rattle(m, { at: c.at + 0.02, dur: 0.4, vol: 0.5 });
  },

  phoneBuzz(m, c) {
    const [i0, i1] = span(m, c.at, 0.8);
    const lp = new Biquad('lp', 900, 0.7);
    let ph = 0;
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / SR;
      ph += (TAU * 150) / SR;
      const v = lp.run(Math.sign(Math.sin(ph))) * (0.5 + 0.5 * Math.sign(Math.sin(TAU * 12 * t))) * adsr(t, 0.8, 0.02, 0.05) * (c.vol ?? 0.5) * 0.08;
      m.sfx.add(i, v, 0.2);
    }
  },

  beep(m, c) {
    const [i0, i1] = span(m, c.at, 0.25);
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / SR;
      m.sfx.add(i, Math.sin(TAU * (c.low ? 520 : 760) * t) * adsr(t, 0.25, 0.01, 0.05) * (c.vol ?? 0.4) * 0.14, 0.2);
    }
  },

  cloth(m, c) {
    const n = noiseGen(seedOf(c));
    const [i0, i1] = span(m, c.at, 0.35);
    const bp = new Biquad('bp', 1500, 0.8);
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / SR;
      m.sfx.add(i, bp.run(n()) * Math.sin((Math.PI * t) / 0.35) ** 2 * (c.vol ?? 0.4) * 0.8, 0);
    }
  },

  rattle(m, c) {
    const r = rng(seedOf(c));
    for (let k = 0; k < (c.dur ?? 2) * 14; k++) {
      bellNote(m, 'sfx', c.at + r() * (c.dur ?? 2), 1800 + r() * 2600, (c.vol ?? 0.4) * 0.06, { decay: 0.05, partials: [[1, 1], [2.3, 0.4]], pan: r() * 2 - 1, send: 0.1 });
    }
  },

  jingle(m, c) {
    const notes = [72, 76, 79, 84, 79, 84];
    notes.forEach((nn, k) => {
      const [i0, i1] = span(m, c.at + k * 0.18, 0.4);
      let ph = 0;
      const bp = new Biquad('bp', 1400, 0.7);
      for (let i = i0; i < i1; i++) {
        const t = (i - i0) / SR;
        ph += (TAU * midi(nn)) / SR;
        const v = bp.run(Math.sign(Math.sin(ph))) * expDecay(t, 0.15) * (c.vol ?? 0.35) * 0.4;
        m.music.add(i, v, 0.3);
      }
    });
  },

  static(m, c) {
    const n = noiseGen(seedOf(c));
    const [i0, i1] = span(m, c.at, c.dur);
    const bp = new Biquad('bp', 2000, 0.6);
    const r = rng(seedOf(c) + 1);
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / SR;
      const crackle = r() < 0.002 ? 2 : 1;
      m.sfx.add(i, bp.run(n()) * crackle * adsr(t, c.dur, 0.05, 0.1) * (c.vol ?? 0.3) * 0.5, 0.3);
    }
  },

  hum(m, c) {
    const [i0, i1] = span(m, c.at, c.dur);
    let ph = 0;
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / SR, u = t / c.dur;
      ph += (TAU * (60 + 4 * u)) / SR;
      const v = (Math.sin(ph) + 0.5 * Math.sin(ph * 2) + 0.3 * Math.sin(ph * 3.01)) * adsr(t, c.dur, 2, 0.4) * (0.4 + 0.6 * u) * (0.8 + 0.2 * Math.sin(TAU * 5 * t)) * (c.vol ?? 0.3) * 0.25;
      m.sfx.add(i, v, 0);
    }
  },

  buzzSign(m, c) {
    const [i0, i1] = span(m, c.at, c.dur);
    const r = rng(seedOf(c));
    let gate = 1;
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / SR;
      if ((i - i0) % 2000 === 0) gate = r() > 0.15 ? 1 : 0.2;
      const v = Math.sign(Math.sin(TAU * 120 * t)) * gate * adsr(t, c.dur, 0.3, 0.5) * (c.vol ?? 0.2) * 0.04;
      m.sfx.add(i, v, -0.3);
    }
  },

  tvSting(m, c) {
    [62, 66, 69, 74].forEach((nn) => padVoice(m, c.at, 1.2, midi(nn), (c.vol ?? 0.3) * 0.08, { fadeIn: 0.02, fadeOut: 0.8, harmonics: 8, cutoff: 1, send: 0.1 }));
  },

  room(m, c) {
    // interior room tone: dark air + faint mains hum, so silence is never digital black
    const n = noiseGen(seedOf(c));
    const [i0, i1] = span(m, c.at, c.dur);
    const lp = new Biquad('lp', 260, 0.6);
    let ph = 0;
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / SR;
      ph += (TAU * 50) / SR;
      const v = (lp.run(n()) * 1.4 + Math.sin(ph) * 0.02 + Math.sin(ph * 3) * 0.008) * adsr(t, c.dur, 1.5, 1.5) * (c.vol ?? 0.25) * 0.5;
      m.sfx.addLR(i, v, v * 0.97);
    }
  },

  snap(m, c) {
    const n = noiseGen(seedOf(c));
    const [i0, i1] = span(m, c.at, 0.3);
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / SR;
      const v = n() * expDecay(t, 0.015) * (c.vol ?? 0.7) * 1.4;
      m.sfx.add(i, v, 0);
      m.send[i] += v * 0.5;
    }
    CUES.sub(m, { at: c.at, vol: (c.vol ?? 0.7) * 0.6 });
  },

  snip(m, c) {
    for (const off of [0, 0.05]) {
      const n = noiseGen(seedOf(c) + off * 100);
      const [i0, i1] = span(m, c.at + off, 0.08);
      const hp = new Biquad('hp', 4000, 1);
      for (let i = i0; i < i1; i++) {
        const t = (i - i0) / SR;
        m.sfx.add(i, hp.run(n()) * expDecay(t, 0.008) * (c.vol ?? 0.7) * 1.5, 0.2);
      }
    }
    bellNote(m, 'sfx', c.at + 0.05, 4200, (c.vol ?? 0.7) * 0.12, { decay: 0.9, partials: [[1, 1], [1.41, 0.5]], send: 0.6, pan: 0.2 });
  },
};

export function renderCue(m, c) {
  const fn = CUES[c.cue];
  if (!fn) {
    console.warn(`  (no synth for cue "${c.cue}" at ${c.at.toFixed(2)}s)`);
    return;
  }
  fn(m, { ...c, dur: c.dur ?? 1 });
}
