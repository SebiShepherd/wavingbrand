#!/usr/bin/env node
/**
 * A product's whole theme, from four hues.
 *
 *   node tools/theme.mjs brand/themes/paper.json > theme.css
 *   node tools/theme.mjs brand/themes/paper.json --json
 *
 * The vocabulary decides the names and the floors; the input decides the hues.
 * Every value is checked against its floor before it is printed, so a theme
 * that comes out of here cannot ship a 3:1 label.
 */
import { readFileSync } from 'node:fs';
import { solve, audit, roles } from '../src/theme.mjs';

const file = process.argv[2];
if (!file) {
  console.error('usage: theme.mjs <theme.json> [--json]');
  process.exit(2);
}
const input = JSON.parse(readFileSync(file, 'utf8'));
const out = {};
const problems = [];
for (const mode of ['light', 'dark']) {
  const { table, moved } = solve(input, mode);
  out[mode] = table;
  problems.push(...audit(table, mode));
  for (const [role, delta] of Object.entries(moved))
    if (delta > 0.02) console.error(`note: ${mode} ${role} moved ${delta.toFixed(3)} in lightness to clear its floor`);
}
if (problems.length) {
  for (const p of problems) console.error(p);
  process.exit(1);
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(out, null, 2));
} else {
  const block = (table, indent) =>
    Object.entries(table)
      .map(([k, v]) => `${indent}--color-${k}: ${v};`)
      .join('\n');
  console.log(`/* Theme "${input.name}", solved by tools/theme.mjs from ${file}. Do not edit. */
@theme {
${block(out.light, '  ')}
}

.dark {
${block(out.dark, '  ')}
}`);
}
