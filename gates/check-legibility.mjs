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
 *
 * The outline is checked too, at its own floor rather than at the favicon's. It
 * has three contours where the solid form has one, so it needs about twice the
 * size to hold the same counters, and nothing measured it until issue #7: the
 * shipped outline closed completely at 24 px and no gate had ever rasterised
 * one. `OUTLINE_MIN_PX` is the size it is declared usable from, and this refuses
 * a geometry that stops holding there.
 */
import { readFileSync } from 'node:fs';
import { OUTLINE_MIN_PX } from '../src/mark.mjs';
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

/** Widest-clear-run of the narrowest counter, on the band that crosses all limbs. */
function narrowest(svg, size) {
  const img = raster(svg, size);
  let best = 0;
  for (let y = Math.round(img.h * 0.45); y <= Math.round(img.h * 0.66); y++) {
    const runs = counters(img, y);
    if (runs.length >= 2) best = Math.max(best, Math.min(...runs));
  }
  return best;
}

export default function check() {
  const fail = [];
  for (const product of ['wavingeye', 'hikaru']) {
    // The outline, at the size it says it is usable from.
    const line = readFileSync(new URL(`../dist/${product}/mark-outline-navy.svg`, import.meta.url), 'utf8');
    const held = narrowest(line, OUTLINE_MIN_PX);
    if (held < FLOOR)
      fail.push(
        `${product} outline at its declared floor of ${OUTLINE_MIN_PX}px: narrowest counter is ${held} clear px, floor is ${FLOOR}`,
      );

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
  return report(
    `counters hold ${FLOOR} clear pixels down to ${SIZES[0]} px, and the outline down to ${OUTLINE_MIN_PX}`,
    fail,
  );
}
