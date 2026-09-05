/**
 * The mark still has counters at the size it is actually used.
 *
 * Counting whether a gap exists is too lenient: a 1.4 px counter antialiases to
 * a grey smear that a renderer still reports as "not ink". What matters is how
 * many pixels of the counter are *fully* background, because one such pixel
 * vanishes the moment a display scales by anything other than a whole number,
 * or an icon compositor resamples. Two is the floor.
 *
 * The standard cut gives one at 16 px and one at 20 px. That is the entire
 * reason the small cut exists.
 */
import { readFileSync } from 'node:fs';
import { raster, alphaAt, report } from './lib.mjs';

const FLOOR = 2;
const SIZES = [16, 20, 24, 32];

/** Fully-clear pixel counts of each counter on one scanline, ink-tight. */
function counters(img, y) {
  let first = -1;
  let last = -1;
  for (let x = 0; x < img.w; x++)
    if (alphaAt(img, x, y) > 128) {
      if (first < 0) first = x;
      last = x;
    }
  const runs = [];
  let run = null;
  for (let x = first; x <= last; x++) {
    const a = alphaAt(img, x, y);
    if (a <= 128) {
      run ??= 0;
      if (a < 32) run++;
    } else if (run !== null) {
      runs.push(run);
      run = null;
    }
  }
  if (run !== null) runs.push(run);
  return runs;
}

export default function check() {
  const fail = [];
  for (const product of ['wavingeye', 'hikaru']) {
    const svg = readFileSync(new URL(`../dist/${product}/favicon.svg`, import.meta.url), 'utf8');
    for (const size of SIZES) {
      const img = raster(svg, size);
      // The middle limb starts ten ninths down, so only the band between its
      // top and the base bar crosses all three limbs.
      let best = 0;
      for (let y = Math.round(img.h * 0.45); y <= Math.round(img.h * 0.66); y++) {
        const runs = counters(img, y);
        if (runs.length >= 2) best = Math.max(best, Math.min(...runs));
      }
      if (best < FLOOR)
        fail.push(`${product} favicon at ${size}px: narrowest counter is ${best} clear px, floor is ${FLOOR}`);
    }
  }
  return report(`counters hold ${FLOOR} clear pixels down to ${SIZES[0]} px`, fail);
}
