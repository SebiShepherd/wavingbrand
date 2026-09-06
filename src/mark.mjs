/**
 * The mark, from eight integers.
 *
 * Everything in the WavingEye mark is a whole number of ninths of one outer
 * stroke width. That is not a convention imposed on the drawing; it is what the
 * drawing already was, to within 3.2% on every dimension (docs/asset-audit.md
 * section 1, docs/decisions.md D2). Writing it as ninths is what makes a variant
 * reproducible instead of redrawn.
 *
 * Coordinates are in ninths, y downwards, origin at the mark's bounding box.
 */

/** @typedef {{stroke:number, middle:number, gap:number, cut:number, bar:number, barTop:number, middleTop:number, height:number}} MarkGrid */

/** The standard cut. Square, and used everywhere except the favicon family. */
export const STANDARD = {
  stroke: 9,
  middle: 8,
  gap: 3,
  cut: 3,
  bar: 8,
  barTop: 21,
  middleTop: 10,
  height: 32,
};

/**
 * The small cut. The favicon family, at every one of its sizes.
 *
 * The counters are what fail first: at 16 px the standard cut holds one fully
 * clear pixel where the floor is two, so the gap widens from three ninths to
 * five and the mark becomes 36 wide against the same 32 high. Optical sizes,
 * for the same reason typefaces have them.
 *
 * The rule is by role rather than by a pixel threshold, and measurement is why.
 * The standard cut's clear-pixel count is not monotonic in size: two at 24 px,
 * one again at 26, and only from 28 does it stop dipping under the floor. A
 * threshold anywhere in that range ships a size that fails. A browser also
 * picks whichever favicon it likes, so the family stays one shape across 16,
 * 32 and 48 rather than changing drawing halfway up.
 *
 * `gates/check-cuts.mjs` measures which cut each shipped file carries.
 */
export const SMALL = { ...STANDARD, gap: 5 };

/** Width in ninths: two outer strokes, the middle, and two counters. */
export const width = (g) => 2 * g.stroke + g.middle + 2 * g.gap;

/**
 * The outline of the union of the four shapes, as one closed polygon.
 *
 * The four pieces overlap inside the base bar, so a fill would work with four
 * subpaths and nonzero winding. The outline variant needs the true boundary,
 * and the boundary is short enough to write down: twelve points, walked
 * clockwise from the top left.
 *
 * @param {MarkGrid} g
 * @returns {[number, number][]} points in ninths
 */
export function outline(g) {
  const w = width(g);
  const xs = { l0: 0, l1: g.stroke, m0: g.stroke + g.gap, m1: g.stroke + g.gap + g.middle, r0: w - g.stroke, r1: w };
  // The bar's edges are the only sloped lines that span the whole mark.
  const barTop = (x) => g.barTop + g.cut - (g.cut / w) * x;
  const barBottom = (x) => barTop(x) + g.bar;
  return [
    [xs.l0, 0],
    [xs.l1, g.cut],
    [xs.l1, barTop(xs.l1)],
    [xs.m0, barTop(xs.m0)],
    [xs.m0, g.middleTop + g.cut],
    [xs.m1, g.middleTop],
    [xs.m1, barTop(xs.m1)],
    [xs.r0, barTop(xs.r0)],
    [xs.r0, g.cut],
    [xs.r1, 0],
    [xs.r1, barBottom(xs.r1)],
    [xs.l0, barBottom(xs.l0)],
  ];
}

/** Round to a tenth of a ninth. Enough for a 4096 px render, short enough to read. */
const r = (n) => Math.round(n * 1000) / 1000;

/**
 * @param {[number,number][]} pts
 * @param {number} scale user units per ninth
 * @param {[number,number]} at origin in user units
 */
export function polygonPath(pts, scale = 1, at = [0, 0]) {
  return (
    pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${r(at[0] + x * scale)} ${r(at[1] + y * scale)}`).join(' ') + ' Z'
  );
}

/**
 * Move every edge inward by `d` and re-intersect, which is the hole of the
 * outline variant. Valid while `d` stays under half the narrowest limb; the
 * narrowest limb here is the base bar at eight ninths, so `d` up to four.
 *
 * @param {[number,number][]} pts a simple polygon
 * @param {number} d inset in ninths
 */
export function inset(pts, d) {
  const n = pts.length;
  const inward = [];
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % n];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const ux = (x1 - x0) / len;
    const uy = (y1 - y0) / len;
    // Two candidate normals; keep the one whose side is inside.
    let nx = -uy;
    let ny = ux;
    const mid = [(x0 + x1) / 2 + nx * 1e-3, (y0 + y1) / 2 + ny * 1e-3];
    if (!contains(pts, mid)) {
      nx = -nx;
      ny = -ny;
    }
    inward.push([x0 + nx * d, y0 + ny * d, x1 + nx * d, y1 + ny * d]);
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = inward[(i + n - 1) % n];
    const b = inward[i];
    out.push(intersect(a, b) ?? [b[0], b[1]]);
  }
  return out;
}

function intersect([ax, ay, bx, by], [cx, cy, dx, dy]) {
  const r1x = bx - ax;
  const r1y = by - ay;
  const r2x = dx - cx;
  const r2y = dy - cy;
  const den = r1x * r2y - r1y * r2x;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((cx - ax) * r2y - (cy - ay) * r2x) / den;
  return [ax + t * r1x, ay + t * r1y];
}

function contains(pts, [px, py]) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * @param {{cut?: MarkGrid, style?: 'solid'|'outline', weight?: number, scale?: number, at?: [number,number]}} opts
 * @returns {{d: string, rule: 'nonzero'|'evenodd', width: number, height: number}}
 */
export function markPath({ cut = STANDARD, style = 'solid', weight = 3, scale = 1, at = [0, 0] } = {}) {
  const pts = outline(cut);
  const body = polygonPath(pts, scale, at);
  if (style === 'solid') {
    return { d: body, rule: 'nonzero', width: width(cut) * scale, height: cut.height * scale };
  }
  const hole = polygonPath(inset(pts, weight), scale, at);
  return { d: `${body} ${hole}`, rule: 'evenodd', width: width(cut) * scale, height: cut.height * scale };
}
