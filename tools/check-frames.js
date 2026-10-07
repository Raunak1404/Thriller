#!/usr/bin/env node
// Draws every frame of the episode at low resolution and reports any frame
// whose scene throws. Run before a long render.   npm run check
import { parseArgs } from './lib/env.js';
import { openEpisode } from './lib/browser.js';

const args = parseArgs();
const ep = await openEpisode({ episode: args.episode || 'ep01', scale: 0.1 });
const fps = +(args.fps || 24);
const started = Date.now();
const failures = [];
for (let t = 0; t < ep.duration; t += 60) {
  const res = await ep.page.evaluate(([a, b, f]) => window.__episode.check(a, b, f), [t, Math.min(ep.duration, t + 60), fps]);
  failures.push(...res);
}
await ep.close();
const byShot = new Map();
for (const f of failures) if (!byShot.has(f.shot)) byShot.set(f.shot, f);
console.log(`Checked ${Math.round(ep.duration * fps)} frames in ${((Date.now() - started) / 1000).toFixed(1)}s: ${failures.length} failing frame(s)`);
for (const f of byShot.values()) console.log(`  ${f.shot} @ ${f.t.toFixed(2)}s  ${f.error}`);
process.exitCode = failures.length ? 1 : 0;
