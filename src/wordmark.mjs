/**
 * The wordmark, set rather than stored.
 *
 * The original artwork carried the wordmark as outlines with no record of what
 * had produced them. Measuring twelve letters against their own cap height and
 * comparing to 48 families identified it as Montserrat Medium at +0.05 em, to a
 * mean deviation of 0.10% (docs/asset-audit.md section 4.3). So the wordmark is
 * generated from the font file at build time, and a new product name costs one
 * string rather than a redraw.
 *
 * Output is normalised to cap height 1, y downwards, ink starting at x = 0, so
 * the caller scales by whatever one cap height should be.
 */
import { openSync } from 'fontkit';
import { fileURLToPath } from 'node:url';

const FONT = fileURLToPath(new URL('../brand/fonts/Montserrat[wght].ttf', import.meta.url));

const cache = new Map();
function instance(weight) {
  if (!cache.has(weight)) {
    const base = openSync(FONT);
    cache.set(weight, base.getVariation({ wght: weight }));
  }
  return cache.get(weight);
}

/**
 * @param {string} text
 * @param {{weight?: number, tracking?: number}} opts tracking in em
 * @returns {{d: string, width: number, capHeight: number, glyphs: {char:string,x0:number,x1:number}[]}}
 *          width is ink width in cap heights
 */
export function wordmark(text, { weight = 500, tracking = 0.05 } = {}) {
  const font = instance(weight);
  const upm = font.unitsPerEm;
  const cap = font.capHeight;
  const run = font.layout(text);
  const parts = [];
  const glyphs = [];
  let pen = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  run.glyphs.forEach((glyph, i) => {
    const pos = run.positions[i];
    const x = pen + (pos.xOffset ?? 0);
    const bb = glyph.bbox;
    if (bb.maxX > bb.minX) {
      minX = Math.min(minX, x + bb.minX);
      maxX = Math.max(maxX, x + bb.maxX);
      glyphs.push({ char: text[i], x0: x + bb.minX, x1: x + bb.maxX });
      parts.push({ path: glyph.path, x });
    }
    pen += pos.xAdvance + tracking * upm;
  });
  // Normalise: ink left to zero, cap height to one, y downwards.
  const k = 1 / cap;
  const d = parts
    .map(({ path, x }) => path.translate(x - minX, 0).scale(k, -k).toSVG())
    .join(' ');
  return {
    d,
    width: (maxX - minX) * k,
    capHeight: 1,
    glyphs: glyphs.map((g) => ({ char: g.char, x0: (g.x0 - minX) * k, x1: (g.x1 - minX) * k })),
  };
}
