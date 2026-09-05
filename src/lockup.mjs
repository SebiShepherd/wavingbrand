/**
 * Lockups: the mark and the type, spaced by rule.
 *
 * Every distance here is either a whole number of ninths (the mark's own grid)
 * or one cap height. The two lockups in the original artwork used 0.983 and
 * 0.862 cap heights for the same relationship, which is what happens when the
 * rule lives in somebody's hand rather than in a file (docs/decisions.md D4).
 *
 * All geometry is in ninths of one outer stroke width, y downwards.
 */
import { STANDARD, SMALL, markPath, width as markWidth, outline } from './mark.mjs';
import { wordmark } from './wordmark.mjs';

/** One cap height, in ninths. Nine, so a capital is exactly one stroke width tall. */
export const CAP = 9;

/** Gap between artwork and type, in cap heights. */
export const GAP = 1;

/**
 * How far to lift a shape so it looks centred rather than measures centred.
 *
 * The mark's mass is in the base bar, so its area centroid sits 5.5% of its
 * height below the bounding box centre and it reads low when the box is
 * measured. Forty percent of the centroid's deviation is the correction; a full
 * correction over-shoots, because the eye does not weigh area linearly.
 */
export const OPTICAL = 0.4;

function centroid(pts) {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    const f = x0 * y1 - x1 * y0;
    a += f;
    cx += (x0 + x1) * f;
    cy += (y0 + y1) * f;
  }
  a /= 2;
  return [cx / (6 * a), cy / (6 * a)];
}

/** Vertical lift, in ninths, that makes `cut` look centred in a square box. */
export function opticalLift(cut = STANDARD) {
  const pts = outline(cut);
  const [, cy] = centroid(pts);
  return (cy - cut.height / 2) * OPTICAL;
}

const el = (name, attrs, children = '') =>
  `<${name} ${Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ')}${children ? `>${children}</${name}>` : '/>'}`;

const round = (n) => Math.round(n * 1000) / 1000;

/**
 * @typedef {{width:number, height:number, body:(fill:string)=>string}} Piece
 */

/** The mark alone. */
export function mark({ cut = STANDARD, style = 'solid', weight = 3 } = {}) {
  const p = markPath({ cut, style, weight });
  return {
    width: p.width,
    height: p.height,
    body: (c) => el('path', { d: p.d, fill: c.ink, 'fill-rule': p.rule }),
  };
}

/**
 * The mark at the size a stacked lockup wants.
 *
 * A square mark over a wide word reads as an afterthought at its natural 32,
 * because the eye compares widths. Matching the widest line's width is too
 * heavy; STACK_RATIO of it is the setting, applied to width so the mark grows
 * with the name rather than against it.
 */
export const STACK_RATIO = 0.72;

/** The type alone, ink-tight, cap height CAP. */
export function type(text, opts = {}) {
  const w = wordmark(text, opts);
  return {
    width: w.width * CAP,
    height: CAP,
    body: (c) =>
      el('g', { transform: `scale(${round(CAP)}) translate(0 1)`, fill: c.type ?? c.ink }, el('path', { d: w.d })),
  };
}

/** Place pieces on one baseline-free row, cap-centred on the tallest piece. */
function row(pieces, gap) {
  const height = Math.max(...pieces.map((p) => p.height));
  let x = 0;
  const placed = [];
  for (const p of pieces) {
    placed.push({ p, x, y: (height - p.height) / 2 });
    x += p.width + gap;
  }
  return { width: x - gap, height, placed };
}

function compose({ width, height, placed }) {
  return {
    width,
    height,
    body: (c) =>
      placed.map(({ p, x, y }) => el('g', { transform: `translate(${round(x)} ${round(y)})` }, p.body(c))).join(''),
  };
}

/** WAVING [mark] EYE. The original corporate lockup. */
export function lockupSplit(left, right, opts = {}) {
  return compose(row([type(left, opts), mark(opts), type(right, opts)], GAP * CAP));
}

/** [mark] WAVING EYE. For headers and anywhere under three cap heights tall. */
export function lockupHorizontal(text, opts = {}) {
  return compose(row([mark(opts), type(text, opts)], GAP * CAP));
}

/**
 * Mark over type, both centred. For square-ish space and avatars.
 *
 * `lines` may be one string or several; several stack at 1.4 cap leading, which
 * is what keeps a two-word name from making the lockup four times as wide as it
 * is tall.
 */
export function lockupStacked(lines, opts = {}) {
  const rows = (Array.isArray(lines) ? lines : [lines]).map((t) => type(t, opts));
  const m = mark(opts);
  const leading = 1.4 * CAP;
  const textWidth = Math.max(...rows.map((t) => t.width));
  const scale = Math.max(1, (textWidth * STACK_RATIO) / m.width);
  const mw = m.width * scale;
  const mh = m.height * scale;
  const width = Math.max(mw, textWidth);
  const gap = GAP * CAP;
  const textHeight = CAP + (rows.length - 1) * leading;
  return {
    width,
    height: mh + gap + textHeight,
    body: (c) =>
      el('g', { transform: `translate(${round((width - mw) / 2)} 0) scale(${round(scale)})` }, m.body(c)) +
      rows
        .map((t, i) =>
          el(
            'g',
            { transform: `translate(${round((width - t.width) / 2)} ${round(mh + gap + i * leading)})` },
            t.body(c),
          ),
        )
        .join(''),
  };
}

/**
 * The mark inside a filled square.
 *
 * `fraction` is the mark's width as a share of the box, and it is a per-target
 * number rather than a constant: an Android adaptive layer is masked to a
 * circle and a favicon is not (docs/decisions.md D5).
 */
export function boxedIcon({ cut = STANDARD, fraction = 0.5, radius = 0, style = 'solid', weight = 3 } = {}) {
  const m = mark({ cut, style, weight });
  const box = m.width / fraction;
  const lift = opticalLift(cut);
  const x = (box - m.width) / 2;
  const y = (box - m.height) / 2 - lift;
  return {
    width: box,
    height: box,
    boxed: true,
    body: (c) =>
      el('rect', { width: round(box), height: round(box), rx: radius || undefined, fill: c.surface }) +
      el('g', { transform: `translate(${round(x)} ${round(y)})` }, m.body(c)),
  };
}

/** A boxed icon with a product name beside it. The Hikaru lockup. */
export function boxedLockup(text, { boxFraction = 0.5, ...opts } = {}) {
  const b = boxedIcon({ ...opts, fraction: boxFraction });
  // Cap height is a quarter of the box, so the type scales with the icon.
  const capScale = b.height / 4 / CAP;
  const t = type(text, opts);
  const gap = GAP * (CAP * capScale);
  const tw = t.width * capScale;
  const th = t.height * capScale;
  return {
    width: b.width + gap + tw,
    height: b.height,
    boxed: true,
    split: true,
    body: (c) =>
      b.body(c) +
      el(
        'g',
        { transform: `translate(${round(b.width + gap)} ${round((b.height - th) / 2)}) scale(${round(capScale)})` },
        t.body(c),
      ),
  };
}

export { STANDARD, SMALL, markWidth };
