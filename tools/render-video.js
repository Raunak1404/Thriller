#!/usr/bin/env node
// Renders the episode to MP4: deterministic frames from headless Chromium,
// encoded with ffmpeg and muxed with the soundtrack.
//   npm run render                              # full episode, 1080p24
//   npm run render -- --scale 0.6667            # 720p
//   npm run render -- --from 13 --to 60 --out build/ep01/coldopen.mp4
//   npm run render -- --workers 4
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import os from 'node:os';
import { parseArgs, buildDir, run, fmtTime } from './lib/env.js';
import { openEpisode } from './lib/browser.js';

const args = parseArgs();
const EPISODE = args.episode || 'ep01';
const FPS = +(args.fps || 24);
const SCALE = parseFloat(args.scale || '1');
const WORKERS = +(args.workers || Math.max(1, Math.min(4, os.cpus().length - 1)));
const outDir = buildDir(EPISODE);
const OUT = path.resolve(args.out || path.join(outDir, `${EPISODE}${SCALE === 1 ? '' : `-${Math.round(1080 * SCALE)}p`}.mp4`));
const soundtrack = path.join(outDir, 'soundtrack.wav');

const probe = await openEpisode({ episode: EPISODE, scale: 0.1 });
const duration = probe.duration;
await probe.close();
const from = +(args.from || 0);
const to = Math.min(duration, +(args.to || duration));
const total = Math.round((to - from) * FPS);
console.log(`Rendering ${EPISODE} ${fmtTime(from)}–${fmtTime(to)}: ${total} frames @ ${FPS}fps, ${Math.round(1920 * SCALE)}×${Math.round(1080 * SCALE)}, ${WORKERS} workers`);

const tmp = path.join(outDir, 'segments');
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });

const started = Date.now();
let done = 0;
const per = Math.ceil(total / WORKERS);
const tick = setInterval(() => {
  const el = (Date.now() - started) / 1000;
  const eta = done ? (el / done) * (total - done) : 0;
  process.stdout.write(`\r  ${done}/${total} frames  ${(done / el).toFixed(1)} fps  ETA ${fmtTime(eta)}   `);
}, 2000);

async function worker(w) {
  const f0 = w * per, f1 = Math.min(total, f0 + per);
  if (f0 >= f1) return null;
  const file = path.join(tmp, `seg${String(w).padStart(2, '0')}.mp4`);
  const ep = await openEpisode({ episode: EPISODE, scale: SCALE });
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', args.preset || 'medium', '-crf', String(args.crf || 19), '-pix_fmt', 'yuv420p', '-tune', 'animation', file,
  ], { stdio: ['pipe', 'ignore', 'inherit'] });
  const closed = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))));
  for (let f = f0; f < f1; f++) {
    const jpg = await ep.frame(from + f / FPS, 'image/jpeg', 0.93);
    if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
    done++;
  }
  ff.stdin.end();
  await closed;
  await ep.close();
  return file;
}

const segs = (await Promise.all(Array.from({ length: WORKERS }, (_, w) => worker(w)))).filter(Boolean);
clearInterval(tick);
console.log(`\n  frames done in ${fmtTime((Date.now() - started) / 1000)}`);

const list = path.join(tmp, 'list.txt');
fs.writeFileSync(list, segs.map((s) => `file '${s}'`).join('\n'));
const muxArgs = ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list];
if (fs.existsSync(soundtrack) && !args['no-audio']) {
  muxArgs.push('-ss', String(from), '-t', String(to - from), '-i', soundtrack, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=14', '-ar', '48000');
} else if (!args['no-audio']) console.log('  (no soundtrack.wav: run `npm run soundtrack` for sound)');
muxArgs.push('-c:v', 'copy', '-movflags', '+faststart', '-shortest', OUT);
await run('ffmpeg', muxArgs);
fs.rmSync(tmp, { recursive: true, force: true });
const mb = fs.statSync(OUT).size / 1e6;
console.log(`Done → ${path.relative(process.cwd(), OUT)} (${mb.toFixed(1)} MB) in ${fmtTime((Date.now() - started) / 1000)}`);
