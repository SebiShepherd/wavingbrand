/**
 * The canvas is the artwork, and a transparent asset is transparent.
 *
 * Two of the original files carried dead space on one side only, 182 units on a
 * 1343 canvas in one case, so anything that centred them showed the logo pushed
 * left (docs/asset-audit.md section 4.4). And all five painted an opaque
 * background, which is why none of them could be placed on a colour.
 */
import { readFileSync } from 'node:fs';
import { walk, raster, alphaAt, inkBox, report, DIST } from './lib.mjs';

const SLACK = 0.02; // 2% of the canvas, which is antialiasing, not dead space

export default function check() {
  const fail = [];
  for (const file of walk().filter((f) => f.endsWith('.svg'))) {
    const svg = readFileSync(file, 'utf8');
    const name = file.replace(DIST, '');
    const boxed = name.includes('boxed') || name.includes('favicon.svg');
    if (!boxed && /<rect[^>]*fill="(?!none)/.test(svg))
      fail.push(`${name}: paints a background, so it cannot go on a colour`);
    if (/\sid="/.test(svg)) fail.push(`${name}: carries an id, which collides when two are inlined in one page`);
    if (!/role="img"/.test(svg)) fail.push(`${name}: no role="img"`);
    if (!/<title>/.test(svg)) fail.push(`${name}: no title`);
    const openTag = /<svg[^>]*>/.exec(svg)[0];
    if (/\swidth="/.test(openTag))
      fail.push(`${name}: a fixed width on <svg> fights fluid layout; the viewBox alone is enough`);

    const img = raster(svg, 400);
    const box = inkBox(img, (i, x, y) => alphaAt(i, x, y) > 16);
    const slackX = img.w * SLACK;
    const slackY = img.h * SLACK;
    const edges = [
      ['left', box.x0],
      ['top', box.y0],
      ['right', img.w - 1 - box.x1],
      ['bottom', img.h - 1 - box.y1],
    ];
    for (const [side, d] of edges)
      if (d > (side === 'left' || side === 'right' ? slackX : slackY))
        fail.push(`${name}: ${Math.round((d / img.w) * 1000) / 10}% dead space on the ${side}`);
  }
  return report('every SVG is ink-tight, id-free and background-free unless boxed', fail);
}
