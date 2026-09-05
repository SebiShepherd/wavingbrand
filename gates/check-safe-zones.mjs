/**
 * Each platform crops differently, so each target gets its own padding.
 *
 * An Android adaptive icon keeps only the inner 72 of 108 dp after a circular
 * mask, and a maskable icon the inner 80%. The original artwork put the mark at
 * 50.9% of its canvas, which puts the bounding box corners 8% outside the
 * adaptive circle (docs/asset-audit.md section 6).
 */
import { readFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { report } from './lib.mjs';

/** Fraction of the canvas diameter that survives each platform's mask. */
const ZONES = [
  ['android-adaptive-foreground-432.png', 72 / 108, (p) => p[3] > 16],
  ['maskable-512.png', 0.8, (p) => p[0] > 200 && p[1] > 200 && p[2] > 200],
];

function pixels(file) {
  const buf = readFileSync(file);
  // Re-render from the SVG twin would be cleaner, but the shipped PNG is what a
  // store receives, so the shipped PNG is what gets measured.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><image href="data:image/png;base64,${buf.toString('base64')}" width="1" height="1"/></svg>`;
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: 256 } }).render();
  return { w: r.width, h: r.height, px: Buffer.from(r.pixels) };
}

export default function check() {
  const fail = [];
  for (const product of ['wavingeye', 'hikaru']) {
    for (const [file, share, isInk] of ZONES) {
      const path = new URL(`../dist/${product}/${file}`, import.meta.url).pathname;
      const img = pixels(path);
      const cx = img.w / 2;
      const cy = img.h / 2;
      const radius = (img.w * share) / 2;
      let worst = 0;
      for (let y = 0; y < img.h; y++)
        for (let x = 0; x < img.w; x++) {
          const o = (y * img.w + x) * 4;
          if (!isInk([img.px[o], img.px[o + 1], img.px[o + 2], img.px[o + 3]])) continue;
          worst = Math.max(worst, Math.hypot(x + 0.5 - cx, y + 0.5 - cy));
        }
      if (worst > radius)
        fail.push(
          `${product}/${file}: ink reaches ${((worst / (img.w / 2)) * 100).toFixed(1)}% of the radius, mask keeps ${(share * 100).toFixed(1)}%`,
        );
    }
  }
  return report('ink stays inside every platform mask', fail);
}
