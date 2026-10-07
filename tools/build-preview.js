#!/usr/bin/env node
// Stages a self-contained, shareable copy of the player in build/preview/:
// inline styles, Google Fonts, the engine modules, the voice manifest and a
// compact soundtrack (each published file must stay under 15 MB).
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, parseArgs, loadEpisode, buildDir, run } from './lib/env.js';

const args = parseArgs();
const EPISODE = args.episode || 'ep01';
const episode = await loadEpisode(EPISODE);
const out = path.join(ROOT, 'build', 'preview');
fs.rmSync(out, { recursive: true, force: true });

const copy = (rel) => {
  const dst = path.join(out, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(path.join(ROOT, rel), dst);
  return rel;
};
const files = [
  'player/player.js',
  'src/cast.js',
  ...fs.readdirSync(path.join(ROOT, 'src/engine')).filter((f) => f.endsWith('.js')).map((f) => `src/engine/${f}`),
  ...fs.readdirSync(path.join(ROOT, 'src/engine/scenes')).map((f) => `src/engine/scenes/${f}`),
  `episodes/${EPISODE}.js`,
  `assets/voices/${EPISODE}/manifest.json`,
].map(copy);

const audioRel = `audio/${EPISODE}.mp3`; // MP3 plays in every browser, including open-source Chromium
fs.mkdirSync(path.join(out, 'audio'), { recursive: true });
await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(buildDir(EPISODE), 'soundtrack.wav'), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=14', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '112k', path.join(out, audioRel)]);
files.push(audioRel);

const css = fs.readFileSync(path.join(ROOT, 'player/player.css'), 'utf8');
const html = `<title>${episode.series}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cinzel:wght@400;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&family=Special+Elite&display=block">
<style>
/* Single deliberate look: a dark screening room. */
${css}
:root { color-scheme: dark; }
html, body { height: 100%; background: var(--bg); }
#poster { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: flex-end; gap: 14px;
  padding: 24px 16px max(20px, env(safe-area-inset-bottom, 0px)); background: linear-gradient(180deg, rgba(5,3,7,0) 30%, rgba(5,3,7,0.88) 78%); }
#poster[hidden] { display: none; }
#poster .meta { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--accent); }
#poster h1 { margin: 0; font-family: "Cormorant Garamond", Georgia, serif; font-style: italic; font-weight: 500; font-size: clamp(26px, 4.4vw, 44px); line-height: 1.1; color: var(--ink); text-wrap: balance; }
#poster .row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
#poster-play { font: 600 15px Inter, system-ui, sans-serif; letter-spacing: 0.04em; color: #050307; background: var(--ink); border: 0; border-radius: 999px; padding: 12px 26px; cursor: pointer; }
#poster-play:hover, #poster-play:focus-visible { background: var(--accent); outline: none; }
#poster .hint { font-size: 13px; color: var(--muted); }
#poster details { max-width: 640px; }
#poster summary { cursor: pointer; font-size: 13px; color: var(--muted); }
#poster-chapters { display: grid; gap: 4px; margin-top: 8px; }
#poster-chapters button { text-align: left; background: none; border: 0; padding: 4px 0; color: var(--ink); font: 400 14px Inter, system-ui, sans-serif; cursor: pointer; font-variant-numeric: tabular-nums; white-space: pre; overflow: hidden; text-overflow: ellipsis; }
#poster-chapters button:hover, #poster-chapters button:focus-visible { color: var(--accent); outline: none; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>
<main id="stage">
  <canvas id="screen" width="1920" height="1080" aria-label="Episode playback"></canvas>
  <div id="loading">Loading episode…</div>
  <section id="poster" aria-label="Episode ${episode.number}">
    <div class="meta">Episode ${episode.number} · <span id="poster-runtime"></span> · ${episode.part}</div>
    <h1>${episode.title}</h1>
    <div class="row">
      <button id="poster-play">▶ Play episode</button>
      <span class="hint">Sound on. Headphones recommended.</span>
    </div>
    <details><summary>Chapters</summary><div id="poster-chapters"></div></details>
  </section>
</main>
<footer id="controls">
  <div id="bar" role="slider" aria-label="Seek"><div id="chapters"></div><div id="fill"></div></div>
  <div id="row">
    <button id="play" aria-label="Play">▶</button>
    <span id="time">0:00 / 0:00</span>
    <span id="shot"></span>
    <span id="title"></span>
    <span id="noaudio" hidden></span>
    <button id="fs" aria-label="Fullscreen">⛶</button>
  </div>
</footer>
<audio id="audio" preload="auto"></audio>
<script>window.__PLAYER_CONFIG__ = { episode: ${JSON.stringify(EPISODE)}, audio: ${JSON.stringify(audioRel)} };</script>
<script type="module" src="player/player.js"></script>
`;
fs.writeFileSync(path.join(out, 'index.html'), html);
fs.writeFileSync(path.join(out, 'files.json'), JSON.stringify(Object.fromEntries(files.map((f) => [f, `build/preview/${f}`])), null, 2));
const size = files.reduce((s, f) => s + fs.statSync(path.join(out, f)).size, 0);
console.log(`Preview staged in build/preview (${files.length} files, ${(size / 1e6).toFixed(1)} MB)`);
