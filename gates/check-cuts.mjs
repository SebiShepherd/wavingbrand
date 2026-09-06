/**
 * Every artefact carries the cut its role requires.
 *
 * The rule is by role, not by pixel size, and the difference is what made this
 * gate necessary. Four documents said the small cut is for "below 48 px" while
 * the build shipped it for `favicon-48.png` as well, and nothing noticed for a
 * whole release: prose cannot fail. The favicon family must survive 16 px and a
 * browser picks whichever of its sizes it likes, so all of it takes the small
 * cut and stays one shape. Everything else takes the standard cut, which is
 * square.
 *
 * Measured from the shipped files rather than from the source that wrote them,
 * because a build that names the wrong cut would pass a check of its own intent.
 */
import { readFileSync } from 'node:fs';
import { STANDARD, SMALL, width as W } from '../src/mark.mjs';
import { decodePng, inkBox, report } from './lib.mjs';

const ASPECT = { standard: W(STANDARD) / STANDARD.height, small: W(SMALL) / SMALL.height };

/** Whichever cut's aspect is nearer. Nearest beats a tolerance band: at 16 px a
 * fourteen-pixel-wide ink box cannot land on 1.125 exactly, but it is never
 * closer to 1.000. */
const nearest = (aspect) =>
  Math.abs(aspect - ASPECT.small) < Math.abs(aspect - ASPECT.standard) ? 'small' : 'standard';

const PRODUCTS = ['wavingeye', 'hikaru'];

/** file -> the cut its role requires. */
const EXPECT = [
  ['favicon.svg', 'small'],
  ['favicon-16.png', 'small'],
  ['favicon-32.png', 'small'],
  ['favicon-48.png', 'small'],
  ['mark-navy.svg', 'standard'],
  ['mark-white.svg', 'standard'],
  ['mark-small-navy.svg', 'small'],
  ['android-adaptive-foreground-432.png', 'standard'],
];

function aspectOf(path) {
  if (path.endsWith('.svg')) {
    const box = readFileSync(path, 'utf8').match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    if (!box) return null;
    return Number(box[1]) / Number(box[2]);
  }
  const img = decodePng(readFileSync(path));
  const b = inkBox(img, (i, x, y) => i.px[(y * i.w + x) * 4 + 3] > 128);
  return (b.x1 - b.x0 + 1) / (b.y1 - b.y0 + 1);
}

export default function check() {
  const fail = [];
  let n = 0;
  for (const product of PRODUCTS)
    for (const [file, want] of EXPECT) {
      const path = new URL(`../dist/${product}/${file}`, import.meta.url).pathname;
      const aspect = aspectOf(path);
      if (aspect === null) {
        fail.push(`${product}/${file}: no viewBox to measure`);
        continue;
      }
      n++;
      const got = nearest(aspect);
      if (got !== want)
        fail.push(
          `${product}/${file}: ${got} cut, expected ${want} (aspect ${aspect.toFixed(3)}, ` +
            `standard is ${ASPECT.standard.toFixed(3)}, small is ${ASPECT.small.toFixed(3)})`,
        );
    }
  return report(`every artefact carries the cut its role requires (${n})`, fail);
}
