/**
 * One rendering, used by both the writer and the checker.
 *
 * resvg rather than a browser, because a headless Chrome produces slightly
 * different pixels on different machines and a comparison against a moving
 * target is not a comparison. `currentColor` is resolved first, since a
 * baseline of an unresolved colour is a baseline of nothing.
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

export const WIDTH = 320;
const INK = '#101554';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

export function sources(dir = DIST, out = []) {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sources(p, out);
    else if (p.endsWith('.svg')) out.push(p);
  }
  return out;
}

const resvg = (svg) => new Resvg(svg.replaceAll('currentColor', INK), { fitTo: { mode: 'width', value: WIDTH } }).render();

export const render = (svg) => resvg(svg).asPng();
export const pixels = (svg) => {
  const r = resvg(svg);
  return { w: r.width, h: r.height, px: Buffer.from(r.pixels) };
};
