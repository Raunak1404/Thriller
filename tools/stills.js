#!/usr/bin/env node
// Renders stills for visual QA.
//   npm run stills                      # middle frame of every shot → contact sheet
//   npm run stills -- --shots C04,C18   # only these shots
//   npm run stills -- --at 12.5,90      # specific times (seconds)
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, loadEpisode, readManifest, buildDir, run } from './lib/env.js';
import { buildTimeline } from '../src/engine/timeline.js';
import { openEpisode } from './lib/browser.js';

const args = parseArgs();
const EPISODE = args.episode || 'ep01';
const scale = parseFloat(args.scale || '0.5');

const episode = await loadEpisode(EPISODE);
const timeline = buildTimeline(episode, readManifest(EPISODE));
let picks;
if (args.at) picks = String(args.at).split(',').map((t) => ({ id: `t${t}`, t: +t }));
else {
  const only = args.shots ? new Set(String(args.shots).split(',')) : null;
  picks = timeline.shots
    .filter((s) => !only || only.has(s.id))
    .map((s) => ({ id: s.id, t: s.start + s.dur * parseFloat(args.frac || '0.6') }));
}
const out = path.join(buildDir(EPISODE), 'stills');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const ep = await openEpisode({ episode: EPISODE, scale });
const started = Date.now();
for (const [i, p] of picks.entries()) {
  const buf = await ep.frame(p.t);
  fs.writeFileSync(path.join(out, `${String(i).padStart(3, '0')}_${p.id}.jpg`), buf);
}
await ep.close();
console.log(`${picks.length} stills in ${((Date.now() - started) / 1000).toFixed(1)}s → ${path.relative(process.cwd(), out)}`);

if (picks.length > 1) {
  const cols = +(args.cols || 6);
  const sheet = path.join(buildDir(EPISODE), `contact-sheet${args.shots ? '-' + args.shots.replace(/,/g, '_').slice(0, 40) : ''}.jpg`);
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-pattern_type', 'glob', '-i', path.join(out, '*.jpg'), '-vf', `scale=480:-1,tile=${cols}x${Math.ceil(picks.length / cols)}:padding=4:color=black`, '-frames:v', '1', '-q:v', '3', sheet]);
  console.log(`contact sheet → ${path.relative(process.cwd(), sheet)}`);
}
