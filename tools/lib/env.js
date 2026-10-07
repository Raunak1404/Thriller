// Tiny helpers shared by the Node tools (no external dependencies).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Load KEY=VALUE pairs from .env without overriding real environment variables.
export function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && process.env[m[1]] == null) process.env[m[1]] = m[2];
  }
}

export function parseArgs(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next == null || next.startsWith('--')) out[key] = true;
      else out[key] = argv[++i];
    } else out._.push(a);
  }
  return out;
}

export async function loadEpisode(id = 'ep01') {
  const mod = await import(pathToFileURL(path.join(ROOT, 'episodes', `${id}.js`)).href);
  return mod.default;
}

export const voiceDir = (id) => path.join(ROOT, 'assets', 'voices', id);
export const buildDir = (id) => path.join(ROOT, 'build', id);

export function readManifest(id) {
  const f = path.join(voiceDir(id), 'manifest.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
}

export function run(cmd, args, { input, quiet = true } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'] });
    const out = [];
    let err = '';
    p.stdout.on('data', (d) => out.push(d));
    p.stderr.on('data', (d) => (err += d));
    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(out));
      else reject(new Error(`${cmd} exited ${code}${quiet ? '' : ''}: ${err.slice(-1500)}`));
    });
    if (input) {
      p.stdin.on('error', () => {});
      p.stdin.end(input);
    }
  });
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function fmtTime(s) {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toFixed(1).padStart(4, '0')}`;
}
