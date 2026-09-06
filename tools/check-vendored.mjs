#!/usr/bin/env node
/**
 * Is a vendored copy of this brand still current?
 *
 * Copy this file into any repository that vendors `dist/`. It has no
 * dependencies beyond Node itself, on purpose: a check that needs an install
 * step is a check somebody skips.
 *
 *   node check-vendored.mjs <dir>              compare against what the copy claims
 *   node check-vendored.mjs <dir> --ref main   compare against the tip instead
 *
 * One request answers the question for every file, because the upstream manifest
 * carries a SHA-256 per file. Nothing else is fetched.
 *
 * The copy says what it is, in one of two ways. A `vendored.json` beside the
 * files gives the ref and a map from local name to upstream path, which is what
 * a consumer that renames or flattens needs; consumers do rename, and a checker
 * that assumes otherwise is a checker they cannot use. Failing that, a vendored
 * `manifest.json` gives the version and the names are taken as upstream paths.
 *
 * Pinning to a release or a commit rather than to `main` is the default because
 * a consumer should update deliberately. A check that goes red because somebody
 * else pushed is a check people learn to ignore.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const REPO = 'SebiShepherd/wavingbrand';
const raw = (ref, path) => `https://raw.githubusercontent.com/${REPO}/${ref}/dist/${path}`;

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
const ref = args.includes('--ref') ? args[args.indexOf('--ref') + 1] : null;

if (!dir) {
  console.error('usage: node check-vendored.mjs <dir> [--ref <tag|branch|sha>]');
  process.exit(2);
}

function files(root, at = root, out = []) {
  for (const name of readdirSync(at).sort()) {
    const path = join(at, name);
    if (statSync(path).isDirectory()) files(root, path, out);
    else out.push(relative(root, path).replaceAll('\\', '/'));
  }
  return out;
}

const local = files(dir);

/** @type {{ref?: string, files?: Record<string,string>, local?: string[]}} */
const spec = local.includes('vendored.json')
  ? JSON.parse(readFileSync(join(dir, 'vendored.json'), 'utf8'))
  : {};
const claimed = local.includes('manifest.json')
  ? JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')).version
  : null;

const target = ref ?? spec.ref ?? (claimed ? `v${claimed}` : null);
if (!target) {
  console.error(
    `${dir} does not say where it came from.\n` +
      'Add a vendored.json with a "ref", vendor dist/manifest.json, or pass --ref.',
  );
  process.exit(2);
}

/** Files that are this repository's own, not copies. */
const ours = new Set(['vendored.json', 'manifest.json', ...(spec.local ?? [])]);
/** Local name to upstream path. Identity unless the copy says otherwise. */
const upstreamPath = (file) => spec.files?.[file] ?? file;

const res = await fetch(raw(target, 'manifest.json'));
if (!res.ok) {
  console.error(`cannot read the manifest for ${target}: HTTP ${res.status}\n${raw(target, 'manifest.json')}`);
  process.exit(2);
}
const upstream = await res.json();
if (!Array.isArray(upstream.files)) {
  // Releases before content hashes existed name their files and say nothing
  // about them, so there is nothing to compare. Saying so beats comparing
  // against undefined, which passes.
  console.error(
    `${target} predates content hashes in the manifest, so a copy cannot be verified against it.\n` +
      'Pin to a later release, or pass --ref main.',
  );
  process.exit(2);
}
const want = new Map(upstream.files.map((f) => [f.file, f.sha256]));

const stale = [];
const unknown = [];
let checked = 0;
for (const file of local) {
  if (ours.has(file)) continue;
  const sha = createHash('sha256').update(readFileSync(join(dir, file))).digest('hex');
  const expected = want.get(upstreamPath(file));
  if (!expected) unknown.push(`${file}${spec.files?.[file] ? ` (mapped to ${spec.files[file]})` : ''}`);
  else {
    checked++;
    if (expected !== sha) stale.push(`${file} -> ${upstreamPath(file)}`);
  }
}

// A map that names a file nobody vendors is a map that has rotted, and it fails
// open: the file it points at is never compared.
for (const file of Object.keys(spec.files ?? {}))
  if (!local.includes(file)) unknown.push(`${file} (mapped, but not present)`);
if (!stale.length && !unknown.length) {
  console.log(`ok   ${checked} vendored files match ${REPO}@${target}`);
  process.exit(0);
}

console.error(`FAIL ${dir} does not match ${REPO}@${target}`);
for (const f of stale) console.error(`       stale: ${f}`);
for (const f of unknown) console.error(`       not matched upstream: ${f}`);
if (stale.length) {
  // Only a tag has a release behind it. Offering a branch a zip that was never
  // built sends somebody to a 404 at the moment they are already stuck.
  const released = /^v\d/.test(target);
  console.error(
    `\n     Refresh with:\n` +
      (released
        ? `       curl -sL https://github.com/${REPO}/releases/download/${target}/wavingeye-brand-${target}.zip -o brand.zip\n     or `
        : '       ') +
      `copy dist/ from a checkout of ${REPO} at ${target}.`,
  );
}
process.exit(1);
