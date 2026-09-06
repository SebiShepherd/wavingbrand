/**
 * Every tuned number says where it came from.
 *
 * The failure this exists for has happened twice in this repository, both times
 * the same shape: a number is picked, and then a reason grows underneath it that
 * reads like a finding. `OPTICAL` carried "the eye does not weigh area
 * linearly" and `STACK_RATIO` carried "the eye compares widths". Neither was
 * measured, neither was cited, and both sat in shipped code looking exactly like
 * the parts of this repository that are derived.
 *
 * A gate cannot decide whether a claim is true. It can refuse a number that
 * claims nothing, and it can make changing the number cost an answer: the value
 * is recorded here as well as in the source, so moving it fails until somebody
 * says where the new one came from.
 *
 * Scalars only. Objects are covered by the gates that already check them:
 * STANDARD and SMALL against brand/tokens/geometry.json, CMYK against
 * brand/tokens/print.json, ROLES against the vocabulary.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { report } from './lib.mjs';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const KINDS = new Set(['measured', 'inherited', 'definition', 'chosen']);

/**
 * `export const NAME = <literal>;` and nothing else.
 *
 * Deliberately narrow. The first version allowed a `/` after the number so a
 * trailing comment would not break the match, and it read `MM = 72 / 25.4` as
 * the number 72. A pattern that quietly half-parses an expression is worse than
 * one that skips it: the register would have recorded a value the code never
 * had. Expressions and objects are documented under `$documented` instead,
 * where this gate does not police them and other gates already do.
 */
const SCALAR = /^export const ([A-Z][A-Z0-9_]*) = (-?\d+(?:\.\d+)?);/gm;

export default function check() {
  const fail = [];
  const reg = JSON.parse(readFileSync(new URL('../brand/tokens/provenance.json', import.meta.url), 'utf8'));
  const listed = reg.constants ?? {};
  const found = new Map();

  for (const file of readdirSync(SRC).sort()) {
    if (!file.endsWith('.mjs') || file.endsWith('.test.mjs')) continue;
    const text = readFileSync(join(SRC, file), 'utf8');
    for (const [, name, value] of text.matchAll(SCALAR)) found.set(`src/${file}:${name}`, Number(value));
  }

  for (const [key, value] of found) {
    const entry = listed[key];
    if (!entry) {
      fail.push(`${key} = ${value}: no entry in brand/tokens/provenance.json, so nothing says where it came from`);
      continue;
    }
    if (entry.value !== value)
      fail.push(`${key}: source says ${value}, provenance says ${entry.value}. Say where the new number came from.`);
    if (!KINDS.has(entry.kind)) fail.push(`${key}: kind "${entry.kind}" is not one of ${[...KINDS].join(', ')}`);
    if (!entry.source || entry.source.trim().length < 20)
      fail.push(`${key}: source is empty or too short to be an answer`);
  }
  // An entry for a constant that no longer exists is a claim about nothing, and
  // it hides the fact that the number left.
  for (const key of Object.keys(listed))
    if (!found.has(key)) fail.push(`${key}: in the provenance register, absent from src/ as a scalar constant`);

  return report(`every tuned number says where it came from (${found.size})`, fail);
}
