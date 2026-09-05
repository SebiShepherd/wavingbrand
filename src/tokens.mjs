/** Read the DTCG token files and resolve `{a.b.c}` references. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../brand/tokens/', import.meta.url));

function flatten(node, prefix, out) {
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith('$')) continue;
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && '$value' in v) out[path] = v.$value;
    if (v && typeof v === 'object') flatten(v, path, out);
  }
  return out;
}

const files = ['color.json', 'geometry.json', 'typography.json', 'print.json'];
const raw = {};
for (const f of files) Object.assign(raw, flatten(JSON.parse(readFileSync(dir + f, 'utf8')), '', {}));

export function resolve(value, seen = 0) {
  if (typeof value !== 'string' || seen > 8) return value;
  const m = /^\{([^}]+)\}$/.exec(value);
  return m ? resolve(raw[m[1]], seen + 1) : value;
}

export const tokens = raw;
export const color = (path) => resolve(raw[path] ?? path);
