/**
 * Nothing ships in a pair that cannot be seen.
 *
 * WCAG 2.2 asks 3:1 of a graphical object against its background and 4.5:1 of
 * text. White on the brand pink is 3.87:1, which is why the pink icon is legal
 * and pink cannot carry white text (docs/asset-audit.md section 3).
 */
import { readFileSync } from 'node:fs';
import { walk, contrast, report, DIST } from './lib.mjs';

const NON_TEXT = 3;

export default function check() {
  const fail = [];
  for (const file of walk().filter((f) => f.endsWith('.svg'))) {
    const svg = readFileSync(file, 'utf8');
    const rect = /<rect[^>]*fill="(#[0-9a-f]{6})"/i.exec(svg);
    if (!rect) continue; // background-free asset, the consumer owns the surface
    const surface = rect[1];
    const inks = [...svg.matchAll(/fill="(#[0-9a-f]{6})"/gi)].map((m) => m[1]).filter((c) => c !== surface);
    for (const ink of new Set(inks)) {
      const c = contrast(ink, surface);
      if (c < NON_TEXT) fail.push(`${file.replace(DIST, '')}: ${ink} on ${surface} is ${c.toFixed(2)}:1`);
    }
  }
  return report(`every boxed pair clears ${NON_TEXT}:1`, fail);
}
