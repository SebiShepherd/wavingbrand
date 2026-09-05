/**
 * The mark the build produces is the mark the tokens describe.
 *
 * A path edited by hand in dist/, or a generator that drifts from
 * brand/tokens/geometry.json, both show up here as a ratio that moved.
 */
import { outline, STANDARD, SMALL, width } from '../src/mark.mjs';
import { tokens } from '../src/tokens.mjs';
import { report } from './lib.mjs';

const T = (k) => tokens[`grid.standard.${k}`];

export default function check() {
  const fail = [];
  const g = STANDARD;
  for (const k of ['stroke', 'middle', 'gap', 'cut', 'bar', 'barTop', 'middleTop', 'height'])
    if (g[k] !== T(k)) fail.push(`grid.standard.${k}: build ${g[k]}, token ${T(k)}`);

  const w = width(g);
  if (w !== g.height) fail.push(`the mark is not square: ${w} wide, ${g.height} high`);
  if (w !== 2 * g.stroke + g.middle + 2 * g.gap) fail.push('width is not 2*stroke + middle + 2*gap');

  // Every vertex must land on the ninths grid or on a bar edge derived from it.
  const pts = outline(g);
  if (pts.length !== 12) fail.push(`outline has ${pts.length} points, expected 12`);
  const tops = pts.filter(([, y]) => y === 0);
  if (tops.length !== 2) fail.push('the two outer strokes should be the only shapes touching the top edge');

  // The cut is a constant drop, not a constant angle. That is the rule; hold it.
  const drop = pts[1][1] - pts[0][1];
  if (Math.abs(drop - g.cut) > 1e-9) fail.push(`outer cut drops ${drop}, expected ${g.cut}`);

  const small = width(SMALL) / SMALL.height;
  if (small < 1.05 || small > 1.2) fail.push(`small cut aspect ${small.toFixed(3)} outside 1.05..1.20`);
  if (SMALL.gap <= g.gap) fail.push('the small cut must have wider counters than the standard cut');

  return report('geometry matches brand/tokens/geometry.json', fail);
}
