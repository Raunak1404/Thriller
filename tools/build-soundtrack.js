#!/usr/bin/env node
// Mixes the episode soundtrack: synthesized score + sound design + voices.
//   npm run soundtrack                 → build/ep01/soundtrack.wav + soundtrack.m4a
//   npm run soundtrack -- --no-voices  → music & effects only
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, loadEpisode, readManifest, voiceDir, buildDir, run, fmtTime } from './lib/env.js';
import { buildTimeline } from '../src/engine/timeline.js';
import { SR, Bus, Biquad, reverb, limit, writeWav16 } from '../src/audio/dsp.js';
import { CAST } from '../src/cast.js';
import { renderCue } from '../src/audio/cues.js';

const args = parseArgs();
const EPISODE = args.episode || 'ep01';
const started = Date.now();

// How much room each sequence has: rooftops are vast, the shop is close, V.O. is dry.
const ROOM = { F: 0.55, C: 0.6, T: 0.4, A1: 0.24, A2: 0.26, A3: 0.26, A4: 0.6, G: 0.24, S: 0.65 };
// Per-delivery loudness targets (relative): whispers lifted, screams held back.
const LEVEL = { whisper: 0.95, scream: 0.62, slam: 1.0, echo: 0.9, glitch: 0.7, none: 0.8 };
// Per-character trims (the dying Seren is breathy and needs lifting).
const TRIM = { ALT_SEREN: 1.6, RECEPTIONIST: 0.85 };

const episode = await loadEpisode(EPISODE);
const manifest = args['no-voices'] ? {} : readManifest(EPISODE);
const timeline = buildTimeline(episode, manifest);
const n = Math.ceil((timeline.duration + 2) * SR);
console.log(`Mixing ${EPISODE}: ${fmtTime(timeline.duration)}, ${timeline.audio.length} cues, ${timeline.lines.length} lines`);

const m = { n, music: new Bus(n), sfx: new Bus(n), send: new Float32Array(n) };
for (const cue of timeline.audio) renderCue(m, cue);
console.log(`  score + effects synthesized (${((Date.now() - started) / 1000).toFixed(1)}s)`);

// voices
const voice = new Float32Array(n);
const decoded = new Map();
// Decode a raw take, apply the character's effect chain, then dialogue EQ
// (rumble cut, low-mid dip, presence lift) and loudness-normalise it.
async function decode(file, who, fx) {
  const key = `${file}|${fx}`;
  if (!decoded.has(key)) {
    const post = CAST[who]?.post;
    const af = [post, `aresample=${SR}`].filter(Boolean).join(',');
    const buf = await run('ffmpeg', ['-loglevel', 'error', '-i', path.join(voiceDir(EPISODE), file), '-af', af, '-f', 'f32le', '-ac', '1', 'pipe:1']);
    const pcm = Float32Array.from(new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4)));
    const hp = new Biquad('hp', 90, 0.7), dip = new Biquad('peak', 300, 1.0, -3.5), pres = new Biquad('peak', 3200, 0.9, 2.5), ess = new Biquad('peak', 7200, 1.6, -5);
    let ss = 0, c = 0;
    for (let i = 0; i < pcm.length; i++) {
      pcm[i] = ess.run(pres.run(dip.run(hp.run(pcm[i]))));
      if (Math.abs(pcm[i]) > 0.01) (ss += pcm[i] * pcm[i]), c++;
    }
    const rms = c ? Math.sqrt(ss / c) : 0.1;
    const g = (0.12 * (LEVEL[fx] ?? 1) * (TRIM[who] ?? 1)) / Math.max(rms, 1e-4);
    for (let i = 0; i < pcm.length; i++) pcm[i] *= g;
    decoded.set(key, pcm);
  }
  return decoded.get(key);
}
const seqOf = new Map(timeline.shots.map((s) => [s.id, s.seqId]));
let placed = 0;
for (const line of timeline.lines) {
  if (!line.audio) continue;
  const pcm = await decode(line.audio, line.who, line.fx);
  const i0 = Math.round(line.start * SR);
  const room = line.vo ? 0.05 : ROOM[seqOf.get(line.shotId)] ?? 0.15;
  const gain = line.who === 'RECEPTIONIST' ? 0.8 : 1;
  for (let k = 0; k < pcm.length && i0 + k < n; k++) {
    const v = pcm[k] * gain;
    voice[i0 + k] += v;
    m.send[i0 + k] += v * room;
  }
  placed++;
}
console.log(`  ${placed} voice lines placed`);

// sidechain ducking: score dips under dialogue, effects dip a little
const env = new Float32Array(n);
const kA = Math.exp(-1 / (0.012 * SR)), kR = Math.exp(-1 / (0.6 * SR));
let e = 0;
for (let i = 0; i < n; i++) {
  const a = Math.abs(voice[i]);
  e = a > e ? kA * e + (1 - kA) * a : kR * e + (1 - kR) * a;
  env[i] = Math.min(1, e * 8);
}

const [revL, revR] = reverb(m.send, n, { room: 0.88, damp: 0.3 });
console.log(`  reverb done (${((Date.now() - started) / 1000).toFixed(1)}s)`);

const L = new Float32Array(n), R = new Float32Array(n);
for (let i = 0; i < n; i++) {
  const dm = 1 - 0.78 * env[i], ds = 1 - 0.45 * env[i];
  L[i] = m.music.L[i] * dm + m.sfx.L[i] * ds + voice[i] + revL[i] * 0.7;
  R[i] = m.music.R[i] * dm + m.sfx.R[i] * ds + voice[i] + revR[i] * 0.7;
  if (!Number.isFinite(L[i])) L[i] = 0;
  if (!Number.isFinite(R[i])) R[i] = 0;
}
// Gain staging is anchored to the dialogue: speech sits around -20 dBFS RMS,
// and anything louder (impacts, the roar) is soft-clipped rather than allowed
// to push the whole mix down.
let vs = 0, vc = 0;
for (let i = 0; i < n; i++) if (Math.abs(voice[i]) > 0.003) (vs += voice[i] * voice[i]), vc++;
const vrms = vc ? Math.sqrt(vs / vc) : 0.1;
const gain = 0.1 / vrms;
for (let i = 0; i < n; i++) {
  L[i] *= gain;
  R[i] *= gain;
}
limit(L, R, 0.89);
console.log(`  dialogue RMS ${(20 * Math.log10(vrms)).toFixed(1)} dBFS → gain ${gain.toFixed(2)}`);

const out = buildDir(EPISODE);
fs.mkdirSync(out, { recursive: true });
const wav = path.join(out, 'soundtrack.wav');
writeWav16(wav, L, R, fs);
await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=14', '-ar', String(SR), '-c:a', 'aac', '-b:a', '192k', path.join(out, 'soundtrack.m4a')]);
fs.writeFileSync(path.join(out, 'timeline.json'), JSON.stringify(timeline, null, 1));
console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s → ${path.relative(process.cwd(), out)}/soundtrack.{wav,m4a}`);
