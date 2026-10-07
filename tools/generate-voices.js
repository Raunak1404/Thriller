#!/usr/bin/env node
// Generates every dialogue line of an episode with Google Gemini TTS.
//
//   npm run voices                       # all missing / changed lines
//   npm run voices -- --force            # regenerate everything
//   npm run voices -- --only C09-0,C09-1 # specific lines
//   npm run voices -- --who YESTERDAY    # one character
//   npm run voices -- --model gemini-2.5-pro-preview-tts
//
// Needs GEMINI_API_KEY (in the environment or in a git-ignored .env file).
// Each take is checked by a second Gemini model that listens to the audio and
// confirms it contains only the scripted line; bad takes are regenerated.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadEnv, parseArgs, loadEpisode, voiceDir, readManifest, run, sleep } from './lib/env.js';
import { buildTimeline } from '../src/engine/timeline.js';
import { CAST } from '../src/cast.js';

loadEnv();
const args = parseArgs();
const EPISODE = args.episode || 'ep01';
const MODEL = args.model || process.env.TTS_MODEL || 'gemini-3.1-flash-tts-preview';
const FALLBACK_MODEL = process.env.TTS_FALLBACK_MODEL || 'gemini-2.5-pro-preview-tts';
const QA_MODEL = process.env.QA_MODEL || 'gemini-flash-latest';
const CONCURRENCY = +(args.concurrency || 3);
const QA = !args['no-qa'];
const PROMPT_VERSION = 3;
const API = 'https://generativelanguage.googleapis.com/v1beta/models';
const KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!KEY) {
  console.error('Missing GEMINI_API_KEY. Put it in .env (git-ignored) or export it.');
  process.exit(1);
}

const FX_NOTES = {
  whisper: 'Whispered, very close to the microphone.',
  scream: 'Shouted at full, raw volume.',
  slam: 'Each word lands heavy and deliberate, with weight.',
  echo: 'Slow and hushed, with long pauses.',
  type: 'Voice-over narration, close and intimate.',
};

function buildPrompt(line, shot, withScene = true) {
  const c = CAST[line.who];
  const notes = [`Delivery: ${line.dir || 'natural'}.`, FX_NOTES[line.fx], line.vo ? 'This is inner-monologue voice-over.' : '']
    .filter(Boolean)
    .join('\n');
  return [
    `# AUDIO PROFILE: ${c.name}`,
    c.persona,
    '',
    ...(withScene ? ['## THE SCENE', shot.action || '', ''] : []),
    "### DIRECTOR'S NOTES",
    notes,
    '',
    '#### TRANSCRIPT',
    line.text,
  ].join('\n');
}

const hashOf = (line, model) =>
  crypto
    .createHash('sha1')
    .update(JSON.stringify([PROMPT_VERSION, model, line.text, line.dir, line.fx, CAST[line.who].voice, CAST[line.who].persona]))
    .digest('hex')
    .slice(0, 12);

async function api(model, body, attempt = 0) {
  const res = await fetch(`${API}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify(body),
  });
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 6) throw new Error(`${model}: HTTP ${res.status} after retries`);
    const wait = 2000 * 2 ** attempt + Math.random() * 1000;
    process.stdout.write(`  (${res.status}, retrying in ${(wait / 1000).toFixed(0)}s)\n`);
    await sleep(wait);
    return api(model, body, attempt + 1);
  }
  const json = await res.json();
  if (json.error) throw new Error(`${model}: ${json.error.message}`);
  return json;
}

// Returns a 16-bit mono WAV buffer (whatever container the API used).
async function synthesize(model, prompt, voice) {
  const json = await api(model, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    },
  });
  const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) throw new Error(`${model}: no audio in response (${json.candidates?.[0]?.finishReason})`);
  const raw = Buffer.from(part.inlineData.data, 'base64');
  if (raw.subarray(0, 4).toString() === 'RIFF') return raw;
  const rate = +(part.inlineData.mimeType.match(/rate=(\d+)/)?.[1] || 24000);
  return pcmToWav(raw, rate);
}

function pcmToWav(pcm, rate) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

async function qaCheck(wav, line) {
  const prompt =
    `You are checking a text-to-speech take for an animated drama.\n` +
    `The intended line is: """${line.text}"""\n` +
    `Listen to the audio. Is the spoken content ONLY that line? Ignore differences in punctuation, how numbers are written, ` +
    `small stutters, laughs, sighs or breaths. Fail it if any extra words are spoken (for example stage directions, labels such as ` +
    `"transcript" or "delivery", or a character name), if words are missing, or if the audio is silent or garbled.\n` +
    `Reply as JSON: {"ok": boolean, "transcript": string, "problem": string}`;
  const json = await api(QA_MODEL, {
    contents: [{ parts: [{ inlineData: { mimeType: 'audio/wav', data: wav.toString('base64') } }, { text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0 },
  });
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '{}';
  try {
    return JSON.parse(text);
  } catch {
    return { ok: true, transcript: text, problem: 'unparseable QA reply' };
  }
}

// Trim leading/trailing silence and encode FLAC. The take is stored raw: each
// character's effect chain (cast.js `post`) is applied at mix time, so voices can
// be re-styled without paying for new takes.
async function finish(wavIn, outFile) {
  const filters =
    'silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.06,' +
    'areverse,silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.12,areverse';
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', 'pipe:0', '-af', filters, '-ar', '24000', '-ac', '1', '-c:a', 'flac', outFile], {
    input: wavIn,
  });
  const probe = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', outFile]);
  return parseFloat(probe.toString());
}

async function main() {
  const episode = await loadEpisode(EPISODE);
  const timeline = buildTimeline(episode);
  const shotById = new Map(timeline.shots.map((s) => [s.id, s]));
  const dir = voiceDir(EPISODE);
  fs.mkdirSync(dir, { recursive: true });
  const manifestFile = path.join(dir, 'manifest.json');
  const manifest = readManifest(EPISODE);

  const only = args.only ? new Set(String(args.only).split(',')) : null;
  const todo = timeline.lines.filter((l) => {
    if (l.reuse) return false;
    if (only && !only.has(l.id)) return false;
    if (args.who && l.who !== args.who) return false;
    const m = manifest[l.id];
    if (!args.force && m && m.hash === hashOf(l, m.model) && fs.existsSync(path.join(dir, m.file))) return false;
    return true;
  });

  console.log(`Episode ${EPISODE}: ${todo.length} line(s) to generate with ${MODEL} (QA: ${QA ? QA_MODEL : 'off'})`);
  let done = 0, flagged = 0;
  const save = () => fs.writeFileSync(manifestFile, JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 2));

  async function work(line) {
    const shot = shotById.get(line.shotId);
    const c = CAST[line.who];
    if (!c) throw new Error(`Unknown speaker ${line.who} in ${line.id}`);
    // Retries drop the scene description: violent scene text occasionally trips safety filters.
    const attempts = [
      [MODEL, true],
      [MODEL, false],
      [FALLBACK_MODEL, false],
    ];
    let best = null;
    for (const [model, withScene] of attempts) {
      let wav;
      try {
        wav = await synthesize(model, buildPrompt(line, shot, withScene), c.voice);
      } catch (e) {
        console.log(`  ! ${line.id} ${model}: ${e.message}`);
        continue;
      }
      const verdict = QA && !line.nonverbal ? await qaCheck(wav, line).catch((e) => ({ ok: true, problem: `QA error: ${e.message}` })) : { ok: true };
      best = { wav, model, verdict };
      if (verdict.ok) break;
      console.log(`  ↻ ${line.id} rejected (${model}): ${verdict.problem || verdict.transcript}`);
    }
    if (!best) throw new Error(`No audio for ${line.id}`);
    const file = `${line.id}.flac`;
    const duration = await finish(best.wav, path.join(dir, file));
    manifest[line.id] = {
      file,
      duration: +duration.toFixed(3),
      who: line.who,
      text: line.text,
      model: best.model,
      voice: c.voice,
      hash: hashOf(line, best.model),
      qa: best.verdict.ok ? 'ok' : `FLAGGED: ${best.verdict.problem || best.verdict.transcript}`,
    };
    if (!best.verdict.ok) flagged++;
    save();
    done++;
    console.log(`  ✓ [${done}/${todo.length}] ${line.id.padEnd(7)} ${line.who.padEnd(12)} ${duration.toFixed(2)}s  ${line.text.slice(0, 60)}`);
  }

  const queue = [...todo];
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      while (queue.length) {
        const line = queue.shift();
        try {
          await work(line);
        } catch (e) {
          console.log(`  ✗ ${line.id}: ${e.message}`);
        }
      }
    }),
  );
  save();
  const missing = timeline.lines.filter((l) => !l.reuse && !manifest[l.id]);
  console.log(`Done. ${done} generated, ${flagged} flagged by QA, ${missing.length} missing.`);
  if (missing.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
