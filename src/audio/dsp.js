// Small DSP toolkit for the synthesized score and sound design (Node).
export const SR = 48000;
export const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Fast table sine for additive pads (phase in radians, any magnitude ≥ 0).
const TABLE = 8192;
const SIN = new Float32Array(TABLE + 1);
for (let i = 0; i <= TABLE; i++) SIN[i] = Math.sin((i / TABLE) * Math.PI * 2);
const K = TABLE / (Math.PI * 2);
export function fsin(ph) {
  const x = ph * K;
  const i = Math.floor(x);
  const f = x - i;
  const j = i & (TABLE - 1);
  return SIN[j] + (SIN[j + 1] - SIN[j]) * f;
}

export function rng(seed) {
  let a = (seed * 2654435761) >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// RBJ biquad
export class Biquad {
  constructor(type, freq, q = 0.707, gainDb = 0) {
    this.type = type;
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
    this.set(freq, q, gainDb);
  }
  set(freq, q = this.q, gainDb = 0) {
    this.q = q;
    // clamp: a swept filter must never reach 0 Hz or Nyquist, or it goes unstable
    const w = (2 * Math.PI * Math.max(20, Math.min(freq, SR * 0.45))) / SR;
    const cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * q);
    let b0, b1, b2, a0, a1, a2;
    if (this.type === 'lp') {
      b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al;
    } else if (this.type === 'hp') {
      b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al;
    } else if (this.type === 'bp') {
      b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al;
    } else {
      // peaking
      const A = Math.pow(10, gainDb / 40);
      b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A;
    }
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

export class OnePole {
  constructor(freq) {
    this.y = 0;
    this.set(freq);
  }
  set(freq) {
    this.a = Math.exp((-2 * Math.PI * freq) / SR);
  }
  run(x) {
    this.y = x + (this.y - x) * this.a;
    return this.y;
  }
}

// Envelope helpers (t in seconds within the cue)
export const adsr = (t, dur, a = 0.01, r = 0.1) => {
  if (t < 0 || t > dur) return 0;
  const att = a > 0 ? Math.min(1, t / a) : 1;
  const rel = r > 0 ? Math.min(1, (dur - t) / r) : 1;
  return Math.max(0, Math.min(att, rel));
};
export const expDecay = (t, tau) => (t < 0 ? 0 : Math.exp(-t / tau));

// Stereo bus pair with helpers.
export class Bus {
  constructor(samples) {
    this.L = new Float32Array(samples);
    this.R = new Float32Array(samples);
    this.n = samples;
  }
  add(i, v, pan = 0) {
    if (i < 0 || i >= this.n) return;
    const p = (pan + 1) * 0.25 * Math.PI;
    this.L[i] += v * Math.cos(p);
    this.R[i] += v * Math.sin(p);
  }
  addLR(i, l, r) {
    if (i < 0 || i >= this.n) return;
    this.L[i] += l;
    this.R[i] += r;
  }
}

// Freeverb-style reverb: mono in → stereo out.
export function reverb(input, n, { room = 0.86, damp = 0.35, wet = 1 } = {}) {
  const outL = new Float32Array(n), outR = new Float32Array(n);
  const combs = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map((d) => Math.round((d * SR) / 44100));
  const aps = [556, 441, 341, 225].map((d) => Math.round((d * SR) / 44100));
  const spread = Math.round((23 * SR) / 44100);
  for (const [out, off] of [[outL, 0], [outR, spread]]) {
    const cb = combs.map((d) => ({ buf: new Float32Array(d + off), i: 0, store: 0 }));
    const ab = aps.map((d) => ({ buf: new Float32Array(d + off), i: 0 }));
    for (let s = 0; s < n; s++) {
      const x = input[s] * 0.04;
      let acc = 0;
      for (const c of cb) {
        const y = c.buf[c.i];
        c.store = y * (1 - damp) + c.store * damp;
        c.buf[c.i] = x + c.store * room;
        c.i = (c.i + 1) % c.buf.length;
        acc += y;
      }
      for (const a of ab) {
        const b = a.buf[a.i];
        const y = -acc + b;
        a.buf[a.i] = acc + b * 0.5;
        a.i = (a.i + 1) % a.buf.length;
        acc = y;
      }
      out[s] = acc * wet;
    }
  }
  return [outL, outR];
}

export function writeWav16(file, L, R, fs) {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 4, 40);
  let o = 44;
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), o);
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))), o + 2);
    o += 4;
  }
  fs.writeFileSync(file, buf);
}

// Look-ahead peak limiter (in place). Gain drops before a peak arrives and
// recovers smoothly, so loud moments get quieter instead of distorting.
export function limit(L, R, ceiling = 0.89, lookaheadMs = 6, releaseMs = 160) {
  const n = L.length;
  const la = Math.round((lookaheadMs / 1000) * SR);
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = Math.max(Math.abs(L[i]), Math.abs(R[i]));
    need[i] = p > ceiling ? ceiling / p : 1;
  }
  // sliding minimum of required gain over the look-ahead window (block approach)
  const minAhead = new Float32Array(n);
  let cur = 1, until = -1;
  for (let i = n - 1; i >= 0; i--) {
    if (need[i] <= cur || i + la < until) {
      cur = need[i];
      until = i;
    }
    minAhead[i] = cur;
    if (i + la < until) cur = 1;
  }
  const rel = 1 - Math.exp(-1 / ((releaseMs / 1000) * SR));
  let g = 1;
  for (let i = 0; i < n; i++) {
    const target = minAhead[i];
    g = target < g ? target : g + (target - g) * rel;
    L[i] *= g;
    R[i] *= g;
  }
}
