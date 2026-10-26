#!/usr/bin/env node
/**
 * The split intro with a different ending, for a project it leads into.
 *
 * dist/ ships the intro fading to black. A DVD menu, a video or a talk that
 * starts on its own colour wants the fade to land there instead, so the cut is
 * invisible. Everything else stays the brand's.
 *
 *   node tools/intro.mjs '#182F51' intro.mp4 [width]
 *
 * Needs ffmpeg on PATH.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { frames, encode } from '../src/motion.mjs';
import { signature, wav } from '../src/sound.mjs';

const [end, out, width = 1920] = process.argv.slice(2);
if (!/^#[0-9a-f]{6}$/i.test(end ?? '') || !out) {
  console.error("usage: node tools/intro.mjs '#rrggbb' out.mp4 [width]");
  process.exit(2);
}
const product = JSON.parse(readFileSync(new URL('../brand/products/wavingeye.json', import.meta.url), 'utf8'));
writeFileSync(out, encode(frames(product.split, { end }), wav(signature()), Number(width)));
console.log(out);
