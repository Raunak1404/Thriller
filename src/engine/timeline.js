// Builds an absolute timeline from an episode script.
// Shared by the browser renderer and the Node audio mixer so picture and
// sound always agree. When real voice audio exists (voice manifest), line
// durations come from the audio files; otherwise they are estimated.

const PACE_WPS = { slow: 1.8, normal: 2.55, fast: 3.3 };
const DEFAULT_PACE = { whisper: 'slow', slam: 'slow', echo: 'slow', type: 'normal', scream: 'fast' };

export function estimateLineDuration(line) {
  const text = line.text || '';
  const words = text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  const pace = line.pace || DEFAULT_PACE[line.fx] || 'normal';
  let d = Math.max(1, words) / PACE_WPS[pace];
  d += (text.match(/\.\.\.|…/g) || []).length * 0.45;
  d += (text.match(/[.!?](?=\s)/g) || []).length * 0.28;
  d += (text.match(/[,;:](?=\s)|\s[—–-]\s|—(?=\s|$)/g) || []).length * 0.14;
  return Math.max(0.55, d + 0.2);
}

// Split a line's duration into per-word timings, weighted by word length and
// trailing punctuation, so kinetic typography can land on each word.
export function wordTimings(text, start, dur) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const weights = words.map((w) => {
    let k = w.replace(/[^\p{L}\p{N}]/gu, '').length + 2.2;
    if (/[.!?]$/.test(w)) k += 3.5;
    if (/(\.\.\.|…)$/.test(w)) k += 4;
    if (/[,;:]$/.test(w)) k += 1.8;
    if (/[—–-]$/.test(w)) k += 2.4;
    return k;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  const lead = Math.min(0.12, dur * 0.05);
  const span = Math.max(0.1, dur - lead - Math.min(0.25, dur * 0.1));
  let t = start + lead;
  return words.map((w, i) => {
    const d = (weights[i] / total) * span;
    const out = { w, t0: t, t1: t + d };
    t += d;
    return out;
  });
}

function parseAt(spec, shot, lineTimes) {
  if (spec == null) return shot.start;
  if (typeof spec === 'number') return shot.start + spec;
  const s = String(spec).trim();
  let m;
  if ((m = s.match(/^L(\d+)(e?)\s*([+-]\s*[\d.]+)?$/))) {
    const lt = lineTimes[+m[1]];
    if (!lt) return shot.start;
    return (m[2] ? lt.end : lt.start) + (m[3] ? parseFloat(m[3].replace(/\s/g, '')) : 0);
  }
  if ((m = s.match(/^end\s*([+-]\s*[\d.]+)?$/))) return shot.end + (m[1] ? parseFloat(m[1].replace(/\s/g, '')) : 0);
  if ((m = s.match(/^p([\d.]+)$/))) return shot.start + parseFloat(m[1]) * shot.dur;
  return shot.start + parseFloat(s);
}

function mergePost(...objs) {
  const out = {};
  for (const o of objs) if (o) Object.assign(out, o);
  return out;
}

export function buildTimeline(episode, manifest = {}) {
  const shots = [];
  const lines = [];
  const lineById = new Map();
  const sequences = [];
  let cursor = 0;

  // Pass 1: lay out shots and lines.
  for (const seq of episode.sequences) {
    const seqStart = cursor;
    for (const raw of seq.shots) {
      const shot = {
        ...raw,
        seqId: seq.id,
        seqTitle: seq.title,
        params: { ...(seq.defaults?.params || {}), ...(raw.params || {}) },
        post: mergePost(episode.defaults?.post, seq.defaults?.post, raw.post),
        start: cursor,
        lineIds: [],
      };
      let lc = cursor + (raw.lead ?? 0.45);
      let lastEnd = cursor;
      (raw.lines || []).forEach((rl, i) => {
        const id = `${raw.id}-${i}`;
        const src = rl.reuse ? lineById.get(rl.reuse) : null;
        if (rl.reuse && !src) throw new Error(`Line ${id} reuses unknown line ${rl.reuse}`);
        const text = rl.text ?? src?.text ?? '';
        const audioKey = rl.reuse ? src.audioKey : id;
        const m = manifest[audioKey];
        const dur = m?.duration ?? (src ? src.dur : estimateLineDuration({ ...src, ...rl, text }));
        const start = rl.at != null ? cursor + rl.at : lc + (rl.pre ?? (i === 0 ? 0 : 0.35));
        const line = {
          ...(src ? { who: src.who, dir: src.dir, fx: src.fx, emph: src.emph } : {}),
          ...rl,
          id,
          text,
          audioKey,
          audio: m?.file || null,
          shotId: raw.id,
          start,
          dur,
          end: start + dur,
          fx: rl.fx ?? src?.fx ?? 'sub',
        };
        line.words = wordTimings(line.text, line.start, line.dur);
        lines.push(line);
        lineById.set(id, line);
        shot.lineIds.push(id);
        lc = line.end;
        lastEnd = Math.max(lastEnd, line.end);
      });
      const minDur = raw.dur ?? 3;
      const needed = lastEnd - cursor + (raw.tail ?? 0.75);
      shot.dur = Math.max(minDur, raw.lines?.length ? needed : 0);
      shot.end = cursor + shot.dur;
      cursor = shot.end;
      shots.push(shot);
    }
    sequences.push({ id: seq.id, title: seq.title, start: seqStart, end: cursor });
  }

  const shotById = new Map(shots.map((s) => [s.id, s]));
  const seqById = new Map(sequences.map((s) => [s.id, s]));

  // Pass 2: resolve audio cues, supers and tracks against final times.
  const audio = [];
  for (const shot of shots) {
    const lt = shot.lineIds.map((id) => lineById.get(id));
    for (const c of shot.audio || []) {
      const at = parseAt(c.at, shot, lt);
      let dur = c.dur;
      if (dur === 'shot') dur = shot.end - at;
      else if (dur === 'seq') dur = seqById.get(shot.seqId).end - at;
      else if (typeof dur === 'string' && dur.startsWith('to:')) dur = shotById.get(dur.slice(3)).start - at;
      else if (typeof dur === 'string' && dur.startsWith('toEnd:')) dur = shotById.get(dur.slice(6)).end - at;
      audio.push({ ...c, at, dur: dur ?? null, shotId: shot.id });
    }
    shot.supers = (shot.supers || []).map((s) => ({ ...s, at: parseAt(s.at, shot, lt) - shot.start }));
    shot.events = Object.fromEntries(
      Object.entries(shot.events || {}).map(([k, v]) => [k, parseAt(v, shot, lt) - shot.start]),
    );
  }

  const tracks = [];
  for (const seq of episode.sequences) {
    for (const tr of seq.tracks || []) {
      const keys = tr.keys.map(([sid, edge, v]) => {
        const s = shotById.get(sid);
        if (!s) throw new Error(`Track key references unknown shot ${sid}`);
        const t = edge === 'end' ? s.end : edge === 'start' ? s.start : parseAt(edge, s, s.lineIds.map((id) => lineById.get(id)));
        return [t, v];
      });
      tracks.push({ ...tr, keys });
    }
  }

  return {
    episodeId: episode.id,
    title: episode.title,
    duration: cursor,
    sequences,
    shots,
    lines,
    audio,
    tracks,
  };
}

export function shotAt(timeline, t) {
  const s = timeline.shots;
  let lo = 0, hi = s.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (s[mid].start <= t) lo = mid;
    else hi = mid - 1;
  }
  return s[lo];
}
