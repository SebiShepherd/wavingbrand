#!/usr/bin/env node
/**
 * The brand's rules, run against a product's own surfaces.
 *
 *   node tools/validate.mjs path/to/surfaces.json
 *
 * Exits non-zero with one line per finding. A product with its own theme runs
 * this against its live token values rather than against a copy.
 */
import { readFileSync } from 'node:fs';
import { validate } from '../src/validate.mjs';

const file = process.argv[2];
if (!file) {
  console.error('usage: validate.mjs <surfaces.json>');
  process.exit(2);
}
const findings = validate(JSON.parse(readFileSync(file, 'utf8')));
for (const f of findings) console.error(f);
console.log(findings.length ? `${findings.length} finding(s)` : 'the mark survives every surface declared');
process.exit(findings.length ? 1 : 0);
