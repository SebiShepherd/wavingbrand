/**
 * What goes to a printer.
 *
 * Everything here is vector and DeviceCMYK, laid out in millimetres, with the
 * type outlined from the same font file the screen assets use. Outlining the
 * type means no font is embedded and no printer's RIP has to have Montserrat,
 * at the cost of the text not being selectable, which on a business card costs
 * nothing.
 *
 * The colours come from brand/tokens/print.json, which is the one hand-authored
 * token file in the repository. A printed proof is the only thing that can tell
 * you a CMYK build is right, and no formula substitutes for it.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { markPath, STANDARD } from './mark.mjs';
import { wordmark } from './wordmark.mjs';
import { pdf, eps, MM } from './pdf.mjs';
import { tokens, resolve } from './tokens.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export const card = JSON.parse(readFileSync(root + 'brand/stationery/card.json', 'utf8'));
export const PROOFED = JSON.parse(readFileSync(root + 'brand/tokens/print.json', 'utf8')).$proofed;

export const CMYK = {
  navy: resolve(tokens['print.brand.navy']),
  pink: resolve(tokens['print.brand.pink']),
  white: resolve(tokens['print.brand.white']),
  black: resolve(tokens['print.brand.black']),
};

/** The mark, at a width in millimetres. */
export const markShape = (widthMm, x, y, cmyk, opts = {}) => {
  const p = markPath(opts);
  return { d: p.d, rule: p.rule, cmyk, scale: (widthMm * MM) / p.width, x: x * MM, y: y * MM };
};

/** A line of type, at a cap height in millimetres. Returns the shape and its width. */
export function textShape(text, capMm, x, y, cmyk, opts = {}) {
  const w = wordmark(text, opts);
  const scale = capMm * MM;
  return {
    shape: { d: w.d, cmyk, scale, x: x * MM, y: y * MM },
    width: (w.width * capMm),
    height: capMm,
  };
}

/** A lockup: mark, one cap height of gap, then the name. Returns shapes and total width. */
export function lockupShapes(text, capMm, x, y, cmyk) {
  const markW = (STANDARD.height / 9) * capMm; // the mark is 32 ninths tall, a cap is nine
  const gap = capMm;
  const t = textShape(text, capMm, x + markW + gap, y + (markW - capMm) / 2, cmyk);
  return {
    shapes: [markShape(markW, x, y, cmyk), t.shape],
    width: markW + gap + t.width,
    height: markW,
  };
}

const A4 = { width: 210, height: 297 };
const CARD = { width: 85, height: 55 };
const BLEED = 3;

/** Stack lines of type from measured widths, never from a guessed step. */
function stack(lines, { x, y, cap, leading, cmyk }) {
  const shapes = [];
  let at = y;
  for (const line of lines) {
    if (line === '') {
      at += leading * 0.6;
      continue;
    }
    shapes.push(textShape(line, cap, x, at, cmyk).shape);
    at += leading;
  }
  return { shapes, height: at - y };
}

/** Lay items along a row, spaced by their own widths, and say whether they fit. */
function row(items, { x, y, cap, gap, cmyk, limit }) {
  const widths = items.map((t) => textShape(t, cap, 0, 0, cmyk).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
  const shapes = [];
  let at = x;
  items.forEach((t, i) => {
    shapes.push(textShape(t, cap, at, y, cmyk).shape);
    at += widths[i] + gap;
  });
  return { shapes, width: total, fits: total <= limit };
}

/**
 * Business card, two pages, with bleed and a trim box the guillotine can find.
 *
 * 85 x 55 mm, which is the European size; a 3 mm bleed on every edge means the
 * navy front can be cut anywhere in that band without a white sliver appearing.
 * Nothing that has to be read sits closer than 6 mm to the trim.
 */
export function businessCard() {
  const w = (CARD.width + BLEED * 2) * MM;
  const h = (CARD.height + BLEED * 2) * MM;
  const trim = BLEED * MM;

  // Front: the mark alone on a full-bleed navy field, centred on the trim area
  // rather than on the sheet, because the bleed is cut off.
  const markW = 20;
  const front = {
    width: w,
    height: h,
    trim,
    rects: [{ x: 0, y: 0, width: w, height: h, cmyk: CMYK.navy }],
    shapes: [markShape(markW, BLEED + (CARD.width - markW) / 2, BLEED + (CARD.height - markW) / 2, CMYK.white)],
  };

  // Back: the lockup, then who and how to reach them.
  const margin = BLEED + 6;
  const cap = 2.1;
  const leading = 3.4;
  const lock = lockupShapes('WAVING EYE', 2.6, margin, margin, CMYK.navy);
  const block = stack(
    [card.name, card.role, '', card.email, card.phone, card.web, ...card.address],
    { x: margin, y: margin + lock.height + 5, cap, leading, cmyk: CMYK.navy },
  );
  const bottom = margin + lock.height + 5 + block.height;
  if (bottom > BLEED + CARD.height - margin + BLEED)
    throw new Error(`the card's details run ${(bottom - (CARD.height + BLEED)).toFixed(1)}mm past the trim`);
  return { front, back: { width: w, height: h, trim, shapes: [...lock.shapes, ...block.shapes] } };
}

/**
 * A4 letterhead: the lockup at the head, a hairline and the details at the foot.
 *
 * The foot is measured rather than stepped. Laying five fields at a fixed
 * interval is how the first version put the phone number on top of the address.
 */
export function letterhead() {
  const margin = 20;
  const width = A4.width - margin * 2;
  const lock = lockupShapes('WAVING EYE', 3.4, margin, margin, CMYK.navy);
  const details = [card.name, card.email, card.phone, card.web, card.address.join(', ')].filter(Boolean);

  let cap = 2.4;
  let foot = row(details, { x: margin, y: A4.height - margin, cap, gap: 6, cmyk: CMYK.navy, limit: width });
  while (!foot.fits && cap > 1.4) {
    cap -= 0.1;
    foot = row(details, { x: margin, y: A4.height - margin, cap, gap: 6, cmyk: CMYK.navy, limit: width });
  }
  if (!foot.fits) throw new Error('the letterhead foot does not fit at the smallest size worth printing');

  return {
    width: A4.width * MM,
    height: A4.height * MM,
    rects: [
      {
        x: margin * MM,
        y: (A4.height - margin - cap - 4) * MM,
        width: width * MM,
        height: 0.25 * MM,
        cmyk: CMYK.navy,
      },
    ],
    shapes: [...lock.shapes, ...foot.shapes],
  };
}

export { pdf, eps, MM };
