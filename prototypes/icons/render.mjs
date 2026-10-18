#!/usr/bin/env node
/**
 * Prototype product icons (spec 0001-product-icons), rendered as one sheet so
 * the forms can be judged side by side at the sizes they will be seen at.
 *
 * Not part of the build and not a shipped asset: a prototype the sponsor picks
 * from. Each glyph is built with the W's grammar: polygons on the same grid of
 * ninths, outer strokes of 9, middle strokes of 8, gaps of 3, angled cuts that
 * drop 3 over a stroke, and the W's height of 32.
 *
 *   node prototypes/icons/render.mjs   writes prototypes/icons/sheet.png
 */
import { writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { outline, STANDARD, polygonPath } from '../../src/mark.mjs';

const G = { stroke: 9, middle: 8, gap: 3, cut: 3, height: 32 };

/** The company mark, from the real build. */
const W = [outline(STANDARD)];

/**
 * KnowYourLimit: three strokes rising left to right, a level meter. Same widths
 * and gaps as the W's three strokes and the same angled top cut, so the
 * silhouette is the W's family and unmistakably not the W: no bar, rising tops.
 */
function meter() {
  const xs = [0, G.stroke + G.gap, G.stroke + G.gap + G.middle + G.gap];
  const ws = [G.stroke, G.middle, G.stroke];
  const tops = [18, 9, 0];
  return xs.map((x, i) => [
    [x, tops[i]],
    [x + ws[i], tops[i] + G.cut],
    [x + ws[i], G.height],
    [x, G.height],
  ]);
}

/**
 * KnowYourLimit, variant B: the same meter under a ceiling. The ceiling is the
 * W's sloped bar turned upside down and moved to the top, one gap above the
 * tallest stroke: levels rising to a limit.
 */
function meterCeiling() {
  const top = G.cut + 8 + G.gap; // ceiling thickness 8 plus its slope, then the gap
  const xs = [0, G.stroke + G.gap, G.stroke + G.gap + G.middle + G.gap];
  const ws = [G.stroke, G.middle, G.stroke];
  const tops = [top + 12, top + 6, top];
  const bars = xs.map((x, i) => [
    [x, tops[i] + (i === 2 ? 0 : 0)],
    [x + ws[i], tops[i] - (G.cut * ws[i]) / 32],
    [x + ws[i], G.height],
    [x, G.height],
  ]);
  const ceiling = [
    [0, G.cut],
    [32, 0],
    [32, 8],
    [0, 8 + G.cut],
  ];
  return [ceiling, ...bars];
}

/** Hikaru, variant B: the spark with arms a stroke and a half wide, so it
    holds at 16 px. */
function boldSpark() {
  const c = 16;
  const half = (G.stroke * 1.5) / 2;
  const inner = G.gap / 2 + 1;
  const arm = (tip, side) => [tip, side(+1), [c + (tip[0] - c) * 0.08, c + (tip[1] - c) * 0.08], side(-1)];
  return [
    arm([c, 0], (s) => [c + s * half, c - inner - 3]),
    arm([32, c], (s) => [c + inner + 3, c + s * half]),
    arm([c, 32], (s) => [c - s * half, c + inner + 3]),
    arm([0, c], (s) => [c - inner - 3, c - s * half]),
  ];
}

/**
 * Hikaru ("light"): four kites around a centre, a spark. Each arm is one
 * stroke wide at its widest and separated from its neighbours by the gap.
 */
function spark() {
  const c = 16;
  const half = G.stroke / 2;
  const inner = half + G.gap / 2;
  const arm = (tip, side) => [tip, side(+1), [c + (tip[0] - c) * 0.12, c + (tip[1] - c) * 0.12], side(-1)];
  return [
    arm([c, 0], (s) => [c + s * half, c - inner - 1.5]),
    arm([32, c], (s) => [c + inner + 1.5, c + s * half]),
    arm([c, 32], (s) => [c - s * half, c + inner + 1.5]),
    arm([0, c], (s) => [c - inner - 1.5, c - s * half]),
  ];
}

const PRODUCTS = [
  { name: 'WavingEye (company mark)', polys: W, width: 32, hue: '#101554', light: '#101554' },
  { name: 'KnowYourLimit A', polys: meter(), width: 32, hue: '#007a85', light: '#007a85' },
  { name: 'KnowYourLimit B', polys: meterCeiling(), width: 32, hue: '#007a85', light: '#007a85' },
  { name: 'Hikaru A', polys: spark(), width: 32, hue: '#2b5ce6', light: '#2b5ce6' },
  { name: 'Hikaru B', polys: boldSpark(), width: 32, hue: '#2b5ce6', light: '#2b5ce6' },
];

const NAVY = '#101554';
const path = (polys, scale, at) => polys.map((p) => polygonPath(p, scale, at)).join(' ');

/** Full-bleed tile: navy into the product hue, glyph in white at half the tile. */
function tile(p, px, grey = false) {
  const scale = (px * 0.5) / 32;
  const at = [(px - p.width * scale) / 2, (px - 32 * scale) / 2];
  const id = `g${Math.random().toString(36).slice(2, 8)}`;
  const from = p.hue === NAVY ? NAVY : NAVY;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">
<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${p.hue}"/></linearGradient>
${grey ? '<filter id="grey"><feColorMatrix type="saturate" values="0"/></filter>' : ''}</defs>
<g ${grey ? 'filter="url(#grey)"' : ''}><rect width="${px}" height="${px}" rx="${px * 0.22}" fill="url(#${id})"/>
<path d="${path(p.polys, scale, at)}" fill="#fff"/></g></svg>`;
}

/** GNOME-style silhouette: the glyph itself in the product hue, with a darker
    bottom profile for depth, no tile. */
function silhouette(p, px) {
  const scale = (px * 0.8) / 32;
  const at = [(px - p.width * scale) / 2, (px - 32 * scale) / 2 - px * 0.02];
  const depth = Math.max(1, px * 0.03);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">
<path d="${path(p.polys, scale, [at[0], at[1] + depth])}" fill="${NAVY}"/>
<path d="${path(p.polys, scale, at)}" fill="${p.light}"/></svg>`;
}

/** Symbolic: one colour, recoloured by the system. */
function symbolic(p, px, colour) {
  const scale = (px * 0.875) / 32;
  const at = [(px - p.width * scale) / 2, (px - 32 * scale) / 2];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">
<path d="${path(p.polys, scale, at)}" fill="${colour}"/></svg>`;
}

// The sheet: one row per product, columns at the sizes each form is seen at.
const COLS = [
  ['tile 128', (p) => tile(p, 128)],
  ['64', (p) => tile(p, 64)],
  ['32', (p) => tile(p, 32)],
  ['24', (p) => tile(p, 24)],
  ['16', (p) => tile(p, 16)],
  ['grey 24', (p) => tile(p, 24, true)],
  ['grey 16', (p) => tile(p, 16, true)],
  ['GNOME 128', (p) => silhouette(p, 128)],
  ['GNOME 32', (p) => silhouette(p, 32)],
  ['symbolic 16', (p) => symbolic(p, 16, '#2e3436')],
  ['on dark', (p) => symbolic(p, 16, '#eeeeec')],
];
const CELL = 150;
const LABEL = 190;
const HEAD = 40;
const W_ = LABEL + COLS.length * CELL;
const H_ = HEAD + PRODUCTS.length * CELL;
let body = `<rect width="${W_}" height="${H_}" fill="#fafafa"/>`;
COLS.forEach(([label], c) => {
  body += `<text x="${LABEL + c * CELL + CELL / 2}" y="26" font-family="sans-serif" font-size="14" fill="#555" text-anchor="middle">${label}</text>`;
});
PRODUCTS.forEach((p, r) => {
  const y = HEAD + r * CELL;
  body += `<text x="16" y="${y + CELL / 2 + 5}" font-family="sans-serif" font-size="15" fill="#222">${p.name}</text>`;
  COLS.forEach(([label, make], c) => {
    const svg = make(p);
    const px = Number(svg.match(/width="(\d+)"/)[1]);
    const x = LABEL + c * CELL + (CELL - px) / 2;
    const dark = label === 'on dark';
    if (dark) body += `<rect x="${LABEL + c * CELL + 45}" y="${y + 45}" width="60" height="60" rx="8" fill="#242424"/>`;
    body += `<g transform="translate(${x} ${y + (CELL - px) / 2})">${svg.replace(/<svg[^>]*>|<\/svg>/g, '')}</g>`;
  });
});
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${W_}" height="${H_}" viewBox="0 0 ${W_} ${H_}">${body}</svg>`;
const out = new URL('./sheet.png', import.meta.url);
writeFileSync(out, new Resvg(sheet, { fitTo: { mode: 'zoom', value: 1 }, font: { loadSystemFonts: true } }).render().asPng());
console.log(`wrote ${out.pathname}`);
