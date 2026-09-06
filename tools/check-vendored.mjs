#!/usr/bin/env node
/**
 * Is a vendored copy of this brand still current?
 *
 * Copy this file into any repository that vendors `dist/`. It has no
 * dependencies beyond Node itself, on purpose: a check that needs an install
 * step is a check somebody skips.
 *
 *   node check-vendored.mjs <dir>              compare against the release the copy claims
 *   node check-vendored.mjs <dir> --ref main   compare against the tip instead
 *
 * The copy is self-describing. `manifest.json` inside it records the version it
 * came from, so the check knows what to compare against without being told, and
 * one request answers the question for every file: the manifest carries a
 * SHA-256 per file, so nothing else has to be fetched.
 *
 * Pinning to a release rather than to `main` is the default because a consumer
 * should update deliberately. A check that goes red because somebody else pushed
 * is a check people learn to ignore.
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
if (!local.includes('manifest.json') && !ref) {
  console.error(
    `${dir} has no manifest.json, so it cannot say which release it came from.\n` +
      'Vendor dist/manifest.json alongside the assets, or pass --ref explicitly.',
  );
  process.exit(2);
}

const claimed = local.includes('manifest.json')
  ? JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')).version
  : null;
const target = ref ?? `v${claimed}`;

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
for (const file of local) {
  if (file === 'manifest.json') continue;
  const sha = createHash('sha256').update(readFileSync(join(dir, file))).digest('hex');
  const expected = want.get(file);
  if (!expected) unknown.push(file);
  else if (expected !== sha) stale.push(file);
}

const checked = local.length - unknown.length - (local.includes('manifest.json') ? 1 : 0);
if (!stale.length && !unknown.length) {
  console.log(`ok   ${checked} vendored files match ${REPO}@${target}`);
  process.exit(0);
}

console.error(`FAIL ${dir} does not match ${REPO}@${target}`);
for (const f of stale) console.error(`       stale: ${f}`);
for (const f of unknown) console.error(`       not part of the brand build: ${f}`);
if (stale.length)
  console.error(
    `\n     Refresh with:\n` +
      `       curl -sL https://github.com/${REPO}/releases/download/${target}/wavingeye-brand-${target}.zip -o brand.zip\n` +
      `     or copy dist/ from a checkout of ${REPO} at ${target}.`,
  );
process.exit(1);
