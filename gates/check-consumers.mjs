/**
 * The brand, checked against a product that actually uses it.
 *
 * A system built against no consumer encodes its own assumptions as principles.
 * This one nearly shipped sixteen surfaces for products to adopt, which is the
 * brand overwriting a decision a product had already made better; the first
 * look at Hikaru is what said so.
 *
 * Each file in brand/consumers/ is that product's contract. The authority is
 * the product's own token file and its own check; this copy is here so that a
 * change to the pink, or to the rules, fails on the brand side before it
 * reaches anybody.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { validate } from '../src/validate.mjs';
import { report } from './lib.mjs';

const dir = fileURLToPath(new URL('../brand/consumers/', import.meta.url));

export default function check() {
  const fail = [];
  const names = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const decl = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    names.push(decl.product);
    fail.push(...validate(decl));
  }
  return report(`the mark survives every declared consumer (${names.join(', ')})`, fail);
}
