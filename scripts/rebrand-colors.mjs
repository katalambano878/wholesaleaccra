#!/usr/bin/env node
/**
 * One-shot rebrand pass: rewrites Tailwind `blue-*` utility classes to the
 * Accra Wholesale Clothing palette (hot pink + deep plum) sourced from the
 * brand logo. Idempotent — running it again is a no-op.
 *
 * Mapping:
 *   blue-50..blue-700   -> pink-50..pink-700      (brand accent / mid tones)
 *   blue-800..blue-950  -> purple-800..purple-950 (deep plum surfaces)
 *
 * Skipped:
 *   - node_modules, .next, out, build artifacts
 *   - public/manifest.json (handled separately so we can pick a specific theme_color)
 *   - product / chart color palettes (those are clothing colors, not brand UI)
 *
 * Files processed: every *.ts, *.tsx, *.css under the project.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'out', 'dist', 'build']);
const EXT = new Set(['.ts', '.tsx', '.css']);

// No file-level protections needed: the regex `\bblue-\d{1,3}\b` only matches
// Tailwind class names (e.g. `bg-blue-500`). Clothing-color literals like
// `blue: '#3B82F6'` (colon) and `'Blue'` (capitalized) are never matched, and
// chart-palette hex strings (`'#3b82f6'`) aren't touched either.
const PROTECTED = new Set();

const MAP = {
  'blue-50': 'pink-50',
  'blue-100': 'pink-100',
  'blue-200': 'pink-200',
  'blue-300': 'pink-300',
  'blue-400': 'pink-400',
  'blue-500': 'pink-500',
  'blue-600': 'pink-600',
  'blue-700': 'pink-700',
  'blue-800': 'purple-800',
  'blue-900': 'purple-900',
  'blue-950': 'purple-950',
};

// Sort longer keys first so blue-50 doesn't gobble blue-500.
const KEYS = Object.keys(MAP).sort((a, b) => b.length - a.length);

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile() && EXT.has(path.extname(e.name))) yield full;
  }
}

function rewrite(src) {
  let out = src;
  for (const key of KEYS) {
    // Word boundary on both sides so we don't damage identifiers like `blueprint-100`.
    const re = new RegExp(`\\b${key}\\b`, 'g');
    out = out.replace(re, MAP[key]);
  }
  return out;
}

let changed = 0;
let scanned = 0;
for await (const file of walk(ROOT)) {
  scanned++;
  const norm = path.normalize(file);
  if (PROTECTED.has(norm)) continue;
  const buf = await fs.readFile(file, 'utf8');
  const next = rewrite(buf);
  if (next !== buf) {
    await fs.writeFile(file, next, 'utf8');
    changed++;
    console.log('  ✓', path.relative(ROOT, file));
  }
}

console.log(`\nDone. Scanned ${scanned} files, rewrote ${changed}.`);
