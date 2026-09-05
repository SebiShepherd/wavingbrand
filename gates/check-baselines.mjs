/**
 * A run that compared and disagreed, versus a run that never compared.
 *
 * kagami's visual layer draws this distinction and it is the one that matters:
 * a deviation is a finding about the artwork, and a missing baseline is a
 * finding about the run. Reporting them as one thing is how five red runs in a
 * row get filed as "the build deviates" without a pixel ever being compared
 * (kagami src/visual.mjs).
 *
 * So: new, deviated, and orphaned are three states here, not one.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pixels, sources, WIDTH } from '../src/baseline.mjs';
import { report } from './lib.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const DIST = join(root, 'dist');
const BASE = join(root, 'baselines');

/** Antialiasing noise between resvg patch versions, not a change to the artwork. */
const CHANNEL_SLACK = 2;

function decode(png) {
  // The baseline is a PNG; re-render it through the same pipeline so the two
  // sides are compared as pixels rather than as compressed bytes. Its own
  // dimensions come out of the IHDR, because wrapping it in a square viewBox
  // and scaling to the baseline width would resample every non-square asset.
  const w = png.readUInt32BE(16);
  const h = png.readUInt32BE(20);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><image href="data:image/png;base64,${png.toString('base64')}" width="${w}" height="${h}"/></svg>`;
  return pixels(svg);
}

function walkPngs(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkPngs(p, out);
    else if (p.endsWith('.png')) out.push(p);
  }
  return out;
}

export default function check() {
  const fail = [];
  const seen = new Set();

  for (const file of sources()) {
    const rel = relative(DIST, file).replace(/\.svg$/, '.png');
    const baseline = join(BASE, rel);
    seen.add(baseline);
    if (!existsSync(baseline)) {
      fail.push(`${rel}: no baseline. Run \`npm run baselines\` and commit it in this change.`);
      continue;
    }
    const now = pixels(readFileSync(file, 'utf8'));
    const then = decode(readFileSync(baseline));
    if (now.w !== then.w || now.h !== then.h) {
      fail.push(`${rel}: ${then.w}x${then.h} became ${now.w}x${now.h}`);
      continue;
    }
    let differing = 0;
    let worst = 0;
    for (let i = 0; i < now.px.length; i++) {
      const d = Math.abs(now.px[i] - then.px[i]);
      if (d > CHANNEL_SLACK) differing++;
      if (d > worst) worst = d;
    }
    if (differing > 0) {
      const share = ((differing / now.px.length) * 100).toFixed(3);
      fail.push(`${rel}: ${differing} channel samples differ (${share}%), worst by ${worst}/255`);
    }
  }

  for (const orphan of walkPngs(BASE))
    if (!seen.has(orphan))
      fail.push(`${relative(BASE, orphan)}: a baseline with no asset. Delete it or restore the asset.`);

  return report(`every SVG matches its committed baseline at ${WIDTH}px`, fail);
}
