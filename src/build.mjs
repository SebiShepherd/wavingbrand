#!/usr/bin/env node
/**
 * Everything, from the parameters.
 *
 * `dist/` is output. Editing a file in it is a mistake the next build corrects
 * and gates/check-dist-clean.mjs reports.
 */
import { mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import {
  mark,
  type as typePiece,
  lockupSplit,
  lockupHorizontal,
  lockupStacked,
  boxedIcon,
  boxedLockup,
  STANDARD,
  SMALL,
  CAP,
} from './lockup.mjs';
import { toSvg, ico } from './svg.mjs';
import { color } from './tokens.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const DIST = join(root, 'dist');

const NAVY = color('color.brand.navy');
const PINK = color('color.brand.pink');
const WHITE = color('color.brand.white');

/** Ink options for a background-free asset. `currentColor` is the CSS one. */
const INKS = { navy: NAVY, pink: PINK, white: WHITE, current: 'currentColor' };

/**
 * Boxed variants. The name says mark-on-box; `type` is the colour the product
 * name takes, which sits on the page rather than on the box and therefore
 * cannot be the box's own ink. Every pair here is checked by
 * gates/check-contrast.mjs before it ships.
 */
const BOXES = {
  'white-on-navy': { ink: WHITE, surface: NAVY, type: NAVY },
  'white-on-pink': { ink: WHITE, surface: PINK, type: NAVY },
  'pink-on-navy': { ink: PINK, surface: NAVY, type: NAVY },
  reverse: { ink: NAVY, surface: WHITE, type: WHITE },
};

const write = (rel, data) => {
  const p = join(DIST, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, data);
  return rel;
};

const png = (svg, width, height) =>
  new Resvg(svg, { fitTo: height ? { mode: 'height', value: height } : { mode: 'width', value: width } })
    .render()
    .asPng();

function forms(product) {
  const lines = product.split ?? [product.wordmark];
  return {
    mark: () => mark({}),
    'mark-small': () => mark({ cut: SMALL }),
    'mark-outline': () => mark({ style: 'outline' }),
    wordmark: () => typePiece(product.wordmark),
    'lockup-split': product.split ? () => lockupSplit(product.split[0], product.split[1]) : null,
    'lockup-horizontal': () => lockupHorizontal(product.wordmark),
    'lockup-stacked': () => lockupStacked(lines),
    'boxed-icon': () => boxedIcon({ fraction: 0.5 }),
    'boxed-lockup': () => boxedLockup(product.wordmark, { boxFraction: 0.5 }),
  };
}

/**
 * Padding is a per-target number, not a constant, because the platforms
 * disagree: an Android adaptive layer keeps only its inner 72 of 108 dp, a
 * maskable icon its inner 80%, and a favicon is not masked at all.
 */
const RASTER = {
  favicon: (p) => [
    { file: 'favicon-16.png', piece: mark({ cut: SMALL }), ink: NAVY, size: 16, fraction: 0.94 },
    { file: 'favicon-32.png', piece: mark({ cut: SMALL }), ink: NAVY, size: 32, fraction: 0.94 },
    { file: 'favicon-48.png', piece: mark({ cut: SMALL }), ink: NAVY, size: 48, fraction: 0.94 },
  ],
  'apple-touch': () => [
    { file: 'apple-touch-icon-180.png', piece: boxedIcon({ fraction: 0.62 }), box: 'white-on-navy', size: 180 },
  ],
  android: () => [
    { file: 'android-192.png', piece: boxedIcon({ fraction: 0.55 }), box: 'white-on-navy', size: 192 },
    { file: 'android-512.png', piece: boxedIcon({ fraction: 0.55 }), box: 'white-on-navy', size: 512 },
    { file: 'android-adaptive-foreground-432.png', piece: mark({}), ink: WHITE, size: 432, fraction: 0.44 },
  ],
  maskable: () => [
    { file: 'maskable-512.png', piece: boxedIcon({ fraction: 0.5 }), box: 'white-on-navy', size: 512 },
  ],
  'app-store': () => [
    { file: 'app-store-1024.png', piece: boxedIcon({ fraction: 0.62 }), box: 'white-on-navy', size: 1024 },
  ],
  og: (p) => [{ file: 'og-1200x630.png', og: true, size: 1200 }],
};

function ogCard(product) {
  const piece = lockupHorizontal(product.wordmark);
  const scale = 630 / 4 / piece.height;
  const w = piece.width * scale;
  const h = piece.height * scale;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">`,
    `<rect width="1200" height="630" fill="${NAVY}"/>`,
    `<g transform="translate(${(1200 - w) / 2} ${(630 - h) / 2}) scale(${scale})">${piece.body(WHITE)}</g>`,
    `</svg>`,
  ].join('');
}

function run() {
  rmSync(DIST, { recursive: true, force: true });
  const manifest = { generated: new Date().toISOString().slice(0, 10), assets: [] };
  const products = readdirSync(join(root, 'brand/products'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(root, 'brand/products', f), 'utf8')));

  for (const product of products) {
    const table = forms(product);
    for (const name of product.forms) {
      const make = table[name];
      if (!make) continue;
      const boxed = name.startsWith('boxed');
      const variants = boxed
        ? Object.entries(BOXES)
        : Object.entries(INKS).map(([suffix, ink]) => [suffix, { ink, surface: 'none' }]);
      for (const [suffix, colors] of variants) {
        const piece = make();
        const title = `${product.title} ${name.replace(/-/g, ' ')}`;
        const svg = toSvg(piece, { ...colors, title });
        const rel = write(`${product.name}/${name}-${suffix}.svg`, svg);
        manifest.assets.push({ product: product.name, form: name, variant: suffix, file: rel, type: 'image/svg+xml' });
      }
    }
    // The mark on its own, also as the small cut, both as outlines.
    for (const [suffix, ink] of Object.entries(INKS)) {
      const piece = mark({ cut: SMALL, style: 'outline' });
      write(`${product.name}/mark-small-outline-${suffix}.svg`, toSvg(piece, { ink, title: `${product.title} mark` }));
    }

    // The favicon that follows the reader's theme, which a PNG cannot do.
    const fav = mark({ cut: SMALL });
    write(
      `${product.name}/favicon.svg`,
      toSvg(fav, {
        ink: 'currentColor',
        title: `${product.title}`,
        style: `svg{color:${NAVY}}@media(prefers-color-scheme:dark){svg{color:${WHITE}}}`,
      }),
    );

    const icoParts = [];
    for (const target of product.targets) {
      for (const spec of RASTER[target](product)) {
        let svg;
        if (spec.og) svg = ogCard(product);
        else if (spec.box) svg = toSvg(spec.piece, { ...BOXES[spec.box], title: product.title });
        else {
          const pad = spec.fraction ? (spec.piece.width / spec.fraction - spec.piece.width) / 2 : 0;
          const square = spec.piece.width + pad * 2;
          svg = toSvg(
            { ...spec.piece, width: square, height: square, body: spec.piece.body },
            { ink: spec.ink, title: product.title },
          );
          // Re-centre inside the square canvas.
          svg = svg.replace(
            /(<title>.*?<\/title>)/,
            `$1<g transform="translate(${(square - spec.piece.width) / 2} ${(square - spec.piece.height) / 2})">`,
          );
          svg = svg.replace('</svg>', '</g></svg>');
        }
        const data = png(svg, spec.size, spec.og ? undefined : undefined);
        const rel = write(`${product.name}/${spec.file}`, data);
        manifest.assets.push({ product: product.name, target, file: rel, type: 'image/png' });
        if (spec.file.startsWith('favicon-')) icoParts.push({ size: spec.size, data });
      }
    }
    if (icoParts.length) write(`${product.name}/favicon.ico`, ico(icoParts));
  }

  writeFileSync(join(DIST, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`${manifest.assets.length} assets in dist/`);
}

run();
