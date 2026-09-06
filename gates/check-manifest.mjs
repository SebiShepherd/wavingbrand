/**
 * The manifest describes the build it sits in.
 *
 * A manifest is only worth reading if a consumer can trust it without fetching
 * the files it describes, which is the whole reason the hashes exist: one
 * request answers "is my copy current" instead of eighty-odd. That trust has to
 * be earned by the build rather than assumed, so this recomputes every hash
 * against the file on disk, checks that nothing in dist/ is missing from the
 * list, and re-derives the digest from the list rather than trusting the field.
 *
 * check-dist-clean already refuses a dist/ that disagrees with a rebuild. This
 * is the narrower question of whether the manifest agrees with the dist/ it is
 * part of, which a rebuild would not catch: a manifest that omitted the same
 * file twice would be consistently wrong.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { report } from './lib.mjs';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url)).replace(/\/$/, '');

function walk(dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path.slice(DIST.length + 1));
  }
  return out;
}

export default function check() {
  const fail = [];
  const manifest = JSON.parse(readFileSync(join(DIST, 'manifest.json'), 'utf8'));
  const listed = new Map((manifest.files ?? []).map((f) => [f.file, f]));

  const onDisk = walk(DIST).filter((f) => f !== 'manifest.json');
  for (const file of onDisk) {
    const entry = listed.get(file);
    if (!entry) {
      fail.push(`${file}: in dist/, absent from the manifest`);
      continue;
    }
    const sha = createHash('sha256').update(readFileSync(join(DIST, file))).digest('hex');
    if (sha !== entry.sha256) fail.push(`${file}: manifest says ${entry.sha256.slice(0, 12)}, file is ${sha.slice(0, 12)}`);
  }
  for (const file of listed.keys())
    if (!onDisk.includes(file)) fail.push(`${file}: in the manifest, absent from dist/`);

  // Every asset a consumer can look up by name must carry a hash, or the lookup
  // returns undefined and a comparison against undefined passes silently.
  for (const a of manifest.assets ?? []) if (!a.sha256) fail.push(`${a.file}: asset entry carries no hash`);

  const digest = createHash('sha256')
    .update((manifest.files ?? []).map((f) => `${f.file} ${f.sha256}`).join('\n'))
    .digest('hex');
  if (digest !== manifest.digest)
    fail.push(`digest is ${String(manifest.digest).slice(0, 12)}, the file list gives ${digest.slice(0, 12)}`);

  return report(`the manifest describes its own build (${onDisk.length} files)`, fail);
}
