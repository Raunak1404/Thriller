// Episode player. Renders the episode live in the browser, synced to the
// mixed soundtrack. `?render=1` switches to capture mode for tools/render-video.js.
import { buildTimeline } from '../src/engine/timeline.js';
import { createRenderer } from '../src/engine/renderer.js';
import { W, H } from '../src/engine/draw.js';

const ROOT = new URL('..', import.meta.url);
const qs = new URLSearchParams(location.search);
// A hosting page may preset options (the published preview uses this).
const CONFIG = window.__PLAYER_CONFIG__ || {};
const EPISODE = qs.get('episode') || CONFIG.episode || 'ep01';
const RENDER_MODE = qs.has('render');

async function loadFonts() {
  const faces = [
    '700 40px "Cinzel"', '500 40px "Cormorant Garamond"', 'italic 500 40px "Cormorant Garamond"',
    '600 40px "Inter"', '800 40px "Inter"', '700 40px "JetBrains Mono"', '400 40px "Special Elite"', '400 40px "Bebas Neue"',
  ];
  await Promise.all(faces.map((f) => document.fonts.load(f).catch(() => null)));
  await document.fonts.ready;
}

async function fetchJSON(path) {
  try {
    const r = await fetch(new URL(path, ROOT));
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

async function boot() {
  const [{ default: episode }] = await Promise.all([import(new URL(`episodes/${EPISODE}.js`, ROOT).href), loadFonts()]);
  const manifest = (await fetchJSON(`assets/voices/${EPISODE}/manifest.json`)) || {};
  const timeline = buildTimeline(episode, manifest);
  const canvas = document.getElementById('screen');

  if (RENDER_MODE) {
    const scale = parseFloat(qs.get('scale') || '1');
    canvas.width = Math.round(W * scale);
    canvas.height = Math.round(H * scale);
    document.body.classList.add('render');
    const failures = [];
    const r = createRenderer(canvas, timeline, { onError: (shot, t, e) => failures.push({ shot: shot.id, t, error: e.message }) });
    window.__episode = {
      check(from, to, fps = 24) {
        failures.length = 0;
        for (let f = Math.round(from * fps); f < Math.round(to * fps); f++) r.render(f / fps);
        return failures.slice(0, 50);
      },
      duration: timeline.duration,
      frame(t, type = 'image/jpeg', quality = 0.92) {
        r.render(t);
        return canvas.toDataURL(type, quality);
      },
      draw(t) {
        r.render(t);
      },
    };
    window.__ready = true;
    return;
  }

  const quality = parseFloat(qs.get('q') || (matchMedia('(max-width: 900px)').matches ? '0.5' : '0.75'));
  canvas.width = Math.round(W * quality);
  canvas.height = Math.round(H * quality);
  const renderer = createRenderer(canvas, timeline);

  const audio = document.getElementById('audio');
  const src = qs.get('audio') || CONFIG.audio || `build/${EPISODE}/soundtrack.m4a`;
  let hasAudio = false;
  if (CONFIG.audio) {
    audio.src = new URL(src, ROOT).href;
    hasAudio = true;
  } else {
    try {
      const head = await fetch(new URL(src, ROOT), { method: 'HEAD' });
      if (head.ok) {
        audio.src = new URL(src, ROOT).href;
        hasAudio = true;
      }
    } catch {}
  }
  document.getElementById('noaudio').hidden = hasAudio;

  // UI
  const ui = {
    play: document.getElementById('play'),
    time: document.getElementById('time'),
    bar: document.getElementById('bar'),
    fill: document.getElementById('fill'),
    chapters: document.getElementById('chapters'),
    shot: document.getElementById('shot'),
    title: document.getElementById('title'),
  };
  ui.title.textContent = `${episode.series} · Episode ${episode.number}: ${episode.title}`;
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  for (const seq of timeline.sequences) {
    const m = document.createElement('button');
    m.className = 'chapter';
    m.style.left = `${(seq.start / timeline.duration) * 100}%`;
    m.style.width = `${((seq.end - seq.start) / timeline.duration) * 100}%`;
    m.title = `${seq.title} (${fmt(seq.start)})`;
    m.addEventListener('click', (e) => {
      e.stopPropagation();
      seek(seq.start + 0.01);
    });
    ui.chapters.appendChild(m);
  }

  let T = parseFloat(qs.get('t') || '0');
  let playing = false;
  let last = performance.now();
  const clock = () => (hasAudio ? audio.currentTime : T);

  function seek(t) {
    T = Math.max(0, Math.min(timeline.duration - 0.05, t));
    if (hasAudio) audio.currentTime = T;
    draw();
  }
  let setPlaying = function (p) {
    playing = p;
    ui.play.textContent = p ? '❚❚' : '▶';
    ui.play.setAttribute('aria-label', p ? 'Pause' : 'Play');
    document.body.classList.toggle('playing', p);
    if (hasAudio) (p ? audio.play() : audio.pause())?.catch?.(() => {});
    last = performance.now();
  };
  function draw() {
    const shot = renderer.render(clock());
    const t = clock();
    ui.time.textContent = `${fmt(t)} / ${fmt(timeline.duration)}`;
    ui.fill.style.width = `${(t / timeline.duration) * 100}%`;
    ui.shot.textContent = `${shot.id} · ${shot.seqTitle}`;
  }
  function loop(now) {
    if (playing) {
      if (!hasAudio) T += (now - last) / 1000;
      last = now;
      if (clock() >= timeline.duration - 0.05) setPlaying(false);
      draw();
    }
    requestAnimationFrame(loop);
  }

  ui.play.addEventListener('click', () => setPlaying(!playing));
  canvas.addEventListener('click', () => setPlaying(!playing));
  // Poster: show a still from the title sequence until the first play.
  const poster = document.getElementById('poster');
  let started = !poster;
  const begin = () => {
    if (started) return;
    started = true;
    poster.hidden = true;
    seek(0);
    setPlaying(true);
  };
  if (poster) {
    document.getElementById('poster-play').addEventListener('click', begin);
    const chapters = document.getElementById('poster-chapters');
    for (const seq of timeline.sequences) {
      const b = document.createElement('button');
      b.textContent = `${fmt(seq.start)}  ${seq.title}`;
      b.addEventListener('click', () => {
        begin();
        seek(seq.start + 0.01);
      });
      chapters?.appendChild(b);
    }
    document.getElementById('poster-runtime').textContent = fmt(timeline.duration);
  }
  const wrapPlay = setPlaying;
  setPlaying = (p) => {
    if (!started) return begin();
    wrapPlay(p);
  };
  ui.bar.addEventListener('click', (e) => {
    const r = ui.bar.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * timeline.duration);
  });
  document.getElementById('fs').addEventListener('click', () => {
    const el = document.getElementById('stage');
    document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen?.();
  });
  addEventListener('keydown', (e) => {
    if (e.key === ' ') {
      e.preventDefault();
      setPlaying(!playing);
    } else if (e.key === 'ArrowRight') seek(clock() + 5);
    else if (e.key === 'ArrowLeft') seek(clock() - 5);
    else if (e.key === 'l') seek(clock() + 10);
    else if (e.key === 'j') seek(clock() - 10);
    else if (e.key === 'f') document.getElementById('fs').click();
    else if (/^[1-9]$/.test(e.key)) {
      const seq = timeline.sequences[+e.key - 1];
      if (seq) seek(seq.start + 0.01);
    }
  });
  if (hasAudio) audio.addEventListener('seeked', draw);
  document.getElementById('loading').remove();
  const posterAt = poster ? timeline.shots.find((x) => x.scene === 'title') : null;
  seek(posterAt ? posterAt.start + posterAt.dur * 0.62 : T);
  requestAnimationFrame(loop);
}

boot().catch((e) => {
  console.error(e);
  const l = document.getElementById('loading');
  if (l) l.textContent = `Failed to load: ${e.message}`;
});
