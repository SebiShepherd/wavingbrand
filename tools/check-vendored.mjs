#!/usr/bin/env node
/**
 * Is a vendored copy of the brand still the one it claims to be?
 *
 * Copy this file into any repository that vendors the brand's `dist/`. It has
 * no dependency beyond Node itself, on purpose: a check that needs an install
 * step is a check somebody skips.
 *
 *   node check-vendored.mjs <dir>              compare against what the copy claims
 *   node check-vendored.mjs <dir> --ref main   compare against the tip instead
 *
 * One request answers the question for every file, because the upstream
 * manifest carries a SHA-256 per file. Nothing else is fetched.
 *
 * The copy says what it is, in one of two ways. A `vendored.json` beside the
 * files gives the ref and a map from local name to upstream path, which is what
 * a consumer that renames or flattens needs; consumers do rename, and a checker
 * that assumes otherwise is a checker they cannot use. Failing that, a vendored
 * `manifest.json` gives the version and the local names are taken as upstream
 * paths.
 *
 * Pinning to a release or a commit rather than to a branch is the default,
 * because a consumer should update deliberately. A check that goes red because
 * somebody else pushed is a check people learn to ignore.
 *
 * Exit 0 matches, 1 does not match, 2 could not tell. The difference between 1
 * and 2 is the point: an unreachable upstream is not drift, and failing a build
 * for it turns a check about the copy into a check about the network.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import { argv, exit } from 'node:process';

export const DEFAULT_REPO = 'SebiShepherd/wavingbrand';

export const manifestUrl = (repo, ref) =>
  `https://raw.githubusercontent.com/${repo}/${ref}/dist/manifest.json`;

/** Every file under `root`, as paths relative to it, in a stable order. */
export function files(root, at = root, out = []) {
  for (const name of readdirSync(at).sort()) {
    const path = join(at, name);
    if (statSync(path).isDirectory()) files(root, path, out);
    else out.push(relative(root, path).replaceAll('\\', '/'));
  }
  return out;
}

/**
 * What to compare, and against what.
 *
 * Separated from the filesystem and the network so it can be tested, which is
 * the only reason anybody would trust it. `spec` is the parsed `vendored.json`,
 * `version` the one out of a vendored manifest, either may be absent.
 */
export function plan({ local, spec = {}, version = null, ref = null }) {
  const target = ref ?? spec.ref ?? (version ? `v${version}` : null);
  const ours = new Set(['vendored.json', 'manifest.json', ...(spec.local ?? [])]);
  return {
    repo: spec.repo ?? DEFAULT_REPO,
    target,
    // A file this repository owns is not a copy and has no upstream to match.
    compare: local
      .filter((f) => !ours.has(f))
      .map((f) => ({ file: f, upstream: spec.files?.[f] ?? f })),
    // A map entry naming a file nobody vendors fails open: the path it points
    // at is never compared, and nothing says so.
    rotted: Object.keys(spec.files ?? {}).filter((f) => !local.includes(f)),
  };
}

/**
 * @param {{file: string, upstream: string}[]} compare
 * @param {Map<string, string>} want upstream path to SHA-256
 * @param {(file: string) => string} shaOf
 */
export function verify(compare, want, shaOf) {
  const stale = [];
  const unknown = [];
  let checked = 0;
  for (const { file, upstream } of compare) {
    const expected = want.get(upstream);
    if (!expected) unknown.push(upstream === file ? file : `${file} (mapped to ${upstream})`);
    else {
      checked++;
      if (expected !== shaOf(file)) stale.push(upstream === file ? file : `${file} -> ${upstream}`);
    }
  }
  return { checked, stale, unknown };
}

const isMain = argv[1] && import.meta.url === new URL(`file://${argv[1]}`).href;
if (isMain) {
  const args = argv.slice(2);
  const dir = args.find((a) => !a.startsWith('--'));
  const ref = args.includes('--ref') ? args[args.indexOf('--ref') + 1] : null;
  if (!dir) {
    console.error('usage: node check-vendored.mjs <dir> [--ref <tag|branch|commit>]');
    exit(2);
  }

  const local = files(dir);
  const read = (name) => JSON.parse(readFileSync(join(dir, name), 'utf8'));
  const spec = local.includes('vendored.json') ? read('vendored.json') : {};
  const version = local.includes('manifest.json') ? read('manifest.json').version : null;

  const { repo, target, compare, rotted } = plan({ local, spec, version, ref });
  if (!target) {
    console.error(
      `${dir} does not say where it came from.\n` +
        'Add a vendored.json with a "ref", vendor dist/manifest.json, or pass --ref.',
    );
    exit(2);
  }

  let res;
  try {
    res = await fetch(manifestUrl(repo, target));
  } catch (e) {
    console.error(`cannot reach ${manifestUrl(repo, target)}\n${e.message}`);
    exit(2);
  }
  if (!res.ok) {
    console.error(
      `cannot read the manifest for ${target}: HTTP ${res.status}\n${manifestUrl(repo, target)}`,
    );
    exit(2);
  }
  const upstream = await res.json();
  if (!Array.isArray(upstream.files)) {
    // Releases from before the manifest carried hashes name their files and say
    // nothing about them. Saying so beats comparing against undefined, which
    // passes.
    console.error(
      `${target} predates content hashes in the manifest, so a copy cannot be verified against it.\n` +
        'Pin to a later release or commit.',
    );
    exit(2);
  }

  const want = new Map(upstream.files.map((f) => [f.file, f.sha256]));
  const shaOf = (file) =>
    createHash('sha256')
      .update(readFileSync(join(dir, file)))
      .digest('hex');
  const { checked, stale, unknown } = verify(compare, want, shaOf);
  const missing = rotted.map((f) => `${f} (mapped, but not present)`);

  if (!stale.length && !unknown.length && !missing.length) {
    console.log(`ok   ${checked} vendored files match ${repo}@${target}`);
    exit(0);
  }
  console.error(`FAIL ${dir} does not match ${repo}@${target}`);
  for (const f of stale) console.error(`       stale: ${f}`);
  for (const f of [...unknown, ...missing]) console.error(`       not matched upstream: ${f}`);
  if (stale.length) {
    // Only a tag has a release behind it. Offering a branch or a commit a zip
    // that was never built sends somebody to a 404 when they are already stuck.
    const released = /^v\d/.test(target);
    console.error(
      '\n     Refresh with:\n' +
        (released
          ? `       curl -sL https://github.com/${repo}/releases/download/${target}/wavingeye-brand-${target}.zip -o brand.zip\n     or `
          : '       ') +
        `copy dist/ from a checkout of ${repo} at ${target}.`,
    );
  }
  exit(1);
}
