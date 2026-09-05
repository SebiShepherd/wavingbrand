/**
 * Every printed colour has a build, and the build says whether it is real.
 *
 * A CMYK value cannot be derived. It is a claim about what a press will do with
 * a given ink on a given stock, and the only instrument that settles it is a
 * printed proof. So this gate checks the two things a program can check, and
 * reports the one it cannot.
 */
import { readFileSync } from 'node:fs';
import { walk, report, DIST } from './lib.mjs';
import { tokens, resolve } from '../src/tokens.mjs';

const NEEDED = ['navy', 'pink', 'white', 'black'];

export default function check() {
  const fail = [];
  for (const name of NEEDED) {
    const build = resolve(tokens[`print.brand.${name}`]);
    if (!Array.isArray(build) || build.length !== 4)
      fail.push(`print.brand.${name} has no four-value CMYK build`);
    else if (build.some((v) => typeof v !== 'number' || v < 0 || v > 100))
      fail.push(`print.brand.${name} is ${JSON.stringify(build)}, which is not four percentages`);
  }

  // A PDF that says DeviceRGB somewhere is a PDF that was converted rather than
  // written, and the point of writing it was to avoid exactly that.
  for (const file of walk().filter((f) => f.endsWith('.pdf') || f.endsWith('.eps'))) {
    const text = readFileSync(file, 'latin1');
    if (/\/DeviceRGB|setrgbcolor/.test(text)) fail.push(`${file.replace(DIST, '')} carries an RGB colour space`);
    if (file.endsWith('.pdf') && !text.startsWith('%PDF-')) fail.push(`${file.replace(DIST, '')} is not a PDF`);
    if (file.endsWith('.eps') && !/^%!PS-Adobe.*EPSF/.test(text)) fail.push(`${file.replace(DIST, '')} is not an EPS`);
  }

  const proofed = JSON.parse(readFileSync(new URL('../brand/tokens/print.json', import.meta.url), 'utf8')).$proofed;
  const status = proofed
    ? 'every printed colour has a proofed build'
    : 'every printed colour has a build (NOT PROOFED: see dist/print/README.md)';
  return report(status, fail);
}
