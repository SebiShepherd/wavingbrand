/**
 * The cases that decide whether this check is worth having.
 *
 * A checker that passes when it should not is worse than no checker: it is the
 * same silence, with a green tick over it. Each test here is a way that could
 * happen.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plan, verify, manifestUrl, DEFAULT_REPO } from './check-vendored.mjs';

const sha = (s) => `sha-${s}`;
const shaOf = (f) => sha(f);

test('a copy that renames is compared against the path it came from', () => {
  const { compare } = plan({
    local: ['wavingeye-icon.svg', 'favicon-32.png'],
    spec: { files: { 'wavingeye-icon.svg': 'wavingeye/boxed-icon-white-on-navy.svg' } },
  });
  assert.deepEqual(compare, [
    { file: 'wavingeye-icon.svg', upstream: 'wavingeye/boxed-icon-white-on-navy.svg' },
    // Unmapped names are taken as upstream paths, so the identity case needs no map.
    { file: 'favicon-32.png', upstream: 'favicon-32.png' },
  ]);
});

test("the consumer's own files are not compared against anything", () => {
  const { compare } = plan({
    local: ['SOURCE.md', 'vendored.json', 'manifest.json', 'favicon.svg'],
    spec: { local: ['SOURCE.md'] },
  });
  assert.deepEqual(
    compare.map((c) => c.file),
    ['favicon.svg'],
  );
});

test('a map entry naming a file nobody vendors is reported, not skipped', () => {
  // The failure this catches is silent: the check keeps passing while the file
  // the map points at is never looked at.
  const { rotted } = plan({
    local: ['a.png'],
    spec: { files: { 'a.png': 'x/a.png', 'gone.png': 'x/gone.png' } },
  });
  assert.deepEqual(rotted, ['gone.png']);
});

test('the ref comes from the map, then a vendored version, then nothing', () => {
  assert.equal(plan({ local: [], spec: { ref: 'abc123' } }).target, 'abc123');
  assert.equal(plan({ local: [], version: '0.2.0' }).target, 'v0.2.0');
  assert.equal(plan({ local: [] }).target, null);
  // An explicit --ref beats what the copy claims, which is how you check against
  // the tip without editing the file.
  assert.equal(plan({ local: [], spec: { ref: 'abc123' }, ref: 'main' }).target, 'main');
});

test('a copy can name its own upstream repository', () => {
  assert.equal(plan({ local: [] }).repo, DEFAULT_REPO);
  assert.equal(plan({ local: [], spec: { repo: 'someone/else' } }).repo, 'someone/else');
});

test('a matching copy passes and a changed byte does not', () => {
  const want = new Map([['x/a.png', sha('a.png')]]);
  const compare = [{ file: 'a.png', upstream: 'x/a.png' }];
  assert.deepEqual(verify(compare, want, shaOf), { checked: 1, stale: [], unknown: [] });
  assert.deepEqual(
    verify(compare, want, () => 'sha-something-else'),
    {
      checked: 1,
      stale: ['a.png -> x/a.png'],
      unknown: [],
    },
  );
});

test('a file with no upstream counterpart is not silently counted as checked', () => {
  // The bug this guards: `want.get()` returns undefined for an unknown path, and
  // comparing a hash against undefined would report a match.
  const { checked, stale, unknown } = verify(
    [{ file: 'stray.png', upstream: 'stray.png' }],
    new Map(),
    shaOf,
  );
  assert.equal(checked, 0);
  assert.deepEqual(stale, []);
  assert.deepEqual(unknown, ['stray.png']);
});

test('the manifest is fetched from the pinned ref, not from a branch', () => {
  assert.equal(
    manifestUrl('o/r', 'b509285'),
    'https://raw.githubusercontent.com/o/r/b509285/dist/manifest.json',
  );
});
