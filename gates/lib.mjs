/** Shared helpers: render a piece of dist/ and read its pixels. */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

export const DIST = new URL('../dist/', import.meta.url).pathname;

export function walk(dir = DIST, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Render an SVG string to RGBA at a given width. `currentColor` is resolved first. */
export function raster(svg, width, ink = '#101554') {
  const r = new Resvg(svg.replaceAll('currentColor', ink), { fitTo: { mode: 'width', value: width } }).render();
  return { w: r.width, h: r.height, px: Buffer.from(r.pixels) };
}

/**
 * A shipped PNG back into pixels, so a gate can measure what was written rather
 * than what the writer meant. resvg has no decoder of its own; embedding the
 * file and rendering it at its own size is the decode. Dimensions come from the
 * IHDR, which is the first chunk of every PNG.
 */
export function decodePng(buf) {
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<image href="data:image/png;base64,${buf.toString('base64')}" width="${w}" height="${h}"/></svg>`;
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: w } }).render();
  return { w: r.width, h: r.height, px: Buffer.from(r.pixels) };
}

/** Alpha at (x, y). */
export const alphaAt = ({ w, px }, x, y) => px[(y * w + x) * 4 + 3];
/** [r,g,b] at (x, y). */
export const rgbAt = ({ w, px }, x, y) => [px[(y * w + x) * 4], px[(y * w + x) * 4 + 1], px[(y * w + x) * 4 + 2]];

export function inkBox(img, isInk) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++)
      if (isInk(img, x, y)) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return { x0, y0, x1, y1 };
}

const lin = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
export const luminance = (hex) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => lin(parseInt(h.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

export function report(name, failures) {
  if (failures.length === 0) {
    console.log(`  ok   ${name}`);
    return 0;
  }
  console.log(`  FAIL ${name}`);
  for (const f of failures) console.log(`         ${f}`);
  return 1;
}
