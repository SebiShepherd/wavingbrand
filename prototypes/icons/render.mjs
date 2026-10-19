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

/** A polygon approximating an annulus sector, angles in degrees, 0 at 12 o'clock, clockwise. */
function arc(cx, cy, outer, inner, from, to, steps = 48) {
  const pt = (rad, a) => [cx + rad * Math.sin((a * Math.PI) / 180), cy - rad * Math.cos((a * Math.PI) / 180)];
  const n = Math.max(2, Math.round((steps * (to - from)) / 360));
  const out = [], back = [];
  for (let i = 0; i <= n; i += 1) {
    const a = from + ((to - from) * i) / n;
    out.push(pt(outer, a));
    back.unshift(pt(inner, a));
  }
  return [...out, ...back];
}
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

/** 1, Odysseus knot: a mast with a rope wound twice around it. Both turns
    pass in front, so the mast is cut around them; the rope runs off at the
    lower right, which is what makes it a binding and not a pattern. */
function knot() {
  const g = G.gap, t = 6, k = 0.4;
  const mast = [12, 20];
  // Two turns: bands rising to the right, one gap clear of the mast cuts.
  const turn = (y0) => [[2, y0], [30, y0 - 28 * k], [30, y0 - 28 * k + t], [2, y0 + t]];
  const y = (y0, x) => y0 - (x - 2) * k;
  const turns = [12, 22];
  const pieces = [];
  // Mast segments between the turns.
  pieces.push([[mast[0], 0], [mast[1], 0], [mast[1], y(turns[0], mast[1]) - g], [mast[0], y(turns[0], mast[0]) - g]]);
  pieces.push([[mast[0], y(turns[0], mast[0]) + t + g], [mast[1], y(turns[0], mast[1]) + t + g], [mast[1], y(turns[1], mast[1]) - g], [mast[0], y(turns[1], mast[0]) - g]]);
  pieces.push([[mast[0], y(turns[1], mast[0]) + t + g], [mast[1], y(turns[1], mast[1]) + t + g], [mast[1], 32], [mast[0], 32]]);
  for (const y0 of turns) pieces.push(turn(y0));
  // The loose end, falling from the lower turn's right end.
  pieces.push([[24, y(turns[1], 24) + t + g], [30, y(turns[1], 30) + t + g], [32, 32], [26, 32]]);
  return pieces;
}

/** 2, Line against a wall: a stroke runs and stops one gap short of a wall. */
function wall() {
  return [
    [[0, 11.5], [20, 11.5 - G.cut * (8 / 32)], [20, 20.5], [0, 20.5]],
    [[23, 0], [32, G.cut], [32, 32], [23, 32]],
  ];
}

/** 3, Time ring: three quarters of a ring are spent, and a bar across the ring
    marks where it stops. */
function ring() {
  return [arc(16, 16, 16, 9, 20, 270), rect(14.5, 0, 17.5, 7)];
}

/** 4, Shackle: the bow of a padlock alone, both legs home. */
function shackle() {
  return [
    arc(16, 14, 16, 7, -90, 90),
    rect(0, 14, 9, 32),
    rect(23, 14, 32, 32),
  ];
}

/** 5, Gate: two posts with the W's angled tops, two rails between them. */
function gate() {
  return [
    [[0, 0], [9, G.cut], [9, 32], [0, 32]],
    [[23, G.cut], [32, 0], [32, 32], [23, 32]],
    rect(12, 8, 20, 14),
    rect(12, 20, 20, 26),
  ];
}

/** 6, Hourglass: two triangles meeting at a gap. */
function hourglass() {
  return [
    [[0, 0], [32, 0], [16 + 1.5, 14.5], [16 - 1.5, 14.5]],
    [[16 - 1.5, 17.5], [16 + 1.5, 17.5], [32, 32], [0, 32]],
  ];
}

/** 7, Monogram: K Y L from strokes of 6, one gap apart, 40 wide. */
function monogram() {
  const s = 6;
  const K = [rect(0, 0, s, 32), [[s + 2, 16], [14, 0], [14 + s, 0], [s + 2 + s, 16]], [[s + 2, 16], [s + 2 + s, 16], [14 + s, 32], [14, 32]]];
  const Y = [[[22, 0], [28, 0], [31, 13], [28, 16]], [[34, 0], [40, 0], [34, 16], [31, 13]], rect(28, 16, 34, 32)];
  const L = [rect(43, 0, 49, 32), rect(43, 26, 56, 32)];
  return [...K, ...Y, ...L];
}

const KYL = '#007a85';
const PRODUCTS = [
  { name: 'WavingEye (company mark)', polys: W, width: 32, hue: '#101554', light: '#101554' },
  { name: '1 Odysseus knot', polys: knot(), width: 32, hue: KYL, light: KYL },
  { name: '2 Line against wall', polys: wall(), width: 32, hue: KYL, light: KYL },
  { name: '3 Time ring', polys: ring(), width: 32, hue: KYL, light: KYL },
  { name: '4 Shackle', polys: shackle(), width: 32, hue: KYL, light: KYL },
  { name: '5 Gate', polys: gate(), width: 32, hue: KYL, light: KYL },
  { name: '6 Hourglass', polys: hourglass(), width: 32, hue: KYL, light: KYL },
  { name: '7 Monogram KYL', polys: monogram(), width: 56, hue: KYL, light: KYL },
];

const NAVY = '#101554';
const path = (polys, scale, at) => polys.map((p) => polygonPath(p, scale, at)).join(' ');

/** Full-bleed tile: navy into the product hue, glyph in white at half the tile. */
function tile(p, px, grey = false) {
  const scale = (px * 0.5) / Math.max(32, p.width);
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
  const scale = (px * 0.8) / Math.max(32, p.width);
  const at = [(px - p.width * scale) / 2, (px - 32 * scale) / 2 - px * 0.02];
  const depth = Math.max(1, px * 0.03);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">
<path d="${path(p.polys, scale, [at[0], at[1] + depth])}" fill="${NAVY}"/>
<path d="${path(p.polys, scale, at)}" fill="${p.light}"/></svg>`;
}

/** Symbolic: one colour, recoloured by the system. */
function symbolic(p, px, colour) {
  const scale = (px * 0.875) / Math.max(32, p.width);
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
