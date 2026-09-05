#!/usr/bin/env node
/**
 * Approving a change means committing the pixels it produced.
 *
 * The other gates check ratios and sizes, and a geometry change that keeps
 * every ratio valid passes all of them while drawing something else. So every
 * shipped SVG is also rendered once, deterministically, and the render is
 * committed. A deviation then arrives as a reviewable image diff in the same
 * pull request as the change that caused it, which is the only form in which
 * anybody actually looks at it.
 *
 *   node tools/baselines.mjs      re-render and overwrite baselines/
 *
 * Overwriting is the approval. Doing it in a commit that contains nothing else
 * is the tell that somebody approved a deviation without reading it.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, WIDTH, sources } from '../src/baseline.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = join(root, 'baselines');
rmSync(out, { recursive: true, force: true });

let n = 0;
for (const file of sources()) {
  const rel = relative(join(root, 'dist'), file).replace(/\.svg$/, '.png');
  const path = join(out, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, render(readFileSync(file, 'utf8')));
  n++;
}
console.log(`${n} baselines at ${WIDTH}px`);
