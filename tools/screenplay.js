#!/usr/bin/env node
// Exports the production script as a readable screenplay with real timings.
//   npm run screenplay  →  story/EPISODE_01_SCREENPLAY.md
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, parseArgs, loadEpisode, readManifest, fmtTime } from './lib/env.js';
import { buildTimeline } from '../src/engine/timeline.js';
import { CAST } from '../src/cast.js';

const args = parseArgs();
const EPISODE = args.episode || 'ep01';
const episode = await loadEpisode(EPISODE);
const tl = buildTimeline(episode, readManifest(EPISODE));
const lineById = new Map(tl.lines.map((l) => [l.id, l]));
const ts = (s) => {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

const out = [];
out.push(`# ${episode.series.toUpperCase()}`);
out.push(`## Episode ${episode.number}: "${episode.title}"`);
out.push(`*${episode.part}* · runtime **${ts(tl.duration)}** · ${tl.shots.length} shots · ${tl.lines.length} lines`);
out.push('');
out.push(`> Generated from \`episodes/${EPISODE}.js\` by \`npm run screenplay\`. Timings use the recorded voice takes.`);
out.push('> Delivery directions in *(italics)* are sent verbatim to the TTS model. `[fx]` is the kinetic-typography mode.');
out.push('');
out.push('### Cast');
out.push('| Character | Voice (Gemini TTS) |');
out.push('|---|---|');
const used = new Set(tl.lines.map((l) => l.who));
for (const [k, c] of Object.entries(CAST)) if (used.has(k)) out.push(`| ${c.name} | ${c.voice}${c.post ? ' + effects' : ''} |`);
out.push('');

for (const seq of tl.sequences) {
  out.push('---');
  out.push(`## ${seq.title.toUpperCase()}  \`${ts(seq.start)}–${ts(seq.end)}\``);
  out.push('');
  for (const shot of tl.shots.filter((s) => s.seqId === seq.id)) {
    const view = shot.params.view || shot.params.mode || shot.params.object || shot.params.segment || shot.params.who || shot.params.focus || shot.params.phase || '';
    out.push(`**${shot.id}** · \`${ts(shot.start)}\` · ${shot.scene}${view ? ` (${view})` : ''} · ${shot.dur.toFixed(1)}s`);
    out.push('');
    if (shot.action) out.push(`${shot.action}`);
    out.push('');
    for (const id of shot.lineIds) {
      const l = lineById.get(id);
      const name = (CAST[l.who]?.name || l.who).toUpperCase();
      const ext = l.vo ? ' (V.O.)' : l.os ? ' (O.S.)' : '';
      const reuse = l.reuse ? ` · *replays ${l.reuse}*` : '';
      out.push(`> **${name}${ext}** *(${l.dir || ''})* \`[${l.fx}]\`${reuse}  `);
      out.push(`> ${l.text}`);
      out.push('');
    }
    for (const s of shot.supers || []) if (s.style !== 'hud-ghost') out.push(`SUPER: **${s.text}**  `);
    const cues = [...new Set((shot.audio || []).map((a) => a.cue))];
    if (cues.length) out.push(`<sub>SOUND: ${cues.join(', ')}</sub>`);
    out.push('');
  }
}
const file = path.join(ROOT, 'story', `EPISODE_${String(episode.number).padStart(2, '0')}_SCREENPLAY.md`);
fs.writeFileSync(file, out.join('\n'));
console.log(`Screenplay → ${path.relative(process.cwd(), file)} (${ts(tl.duration)})`);
