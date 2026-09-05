/**
 * A theme, solved from a handful of inputs.
 *
 * The reusable thing between two products is not a palette. Hikaru's is a warm
 * off-white page with a blue accent and it is right for Hikaru; a second product
 * will want something else and should get it. What is reusable is the
 * vocabulary of names, the floor each name has to clear, and the arithmetic
 * that turns a hue into a full set that clears them.
 *
 * That arithmetic is worth having because the alternative is picking twenty-two
 * colours by eye per product and finding out later that one of them is 4.2:1.
 * That happened here once already, to the accent scale, and only a gate caught
 * it.
 *
 * Inputs: two hues and two chroma ceilings per mode. Everything else is the
 * vocabulary.
 */
import { readFileSync } from 'node:fs';

const VOCAB = JSON.parse(readFileSync(new URL('../brand/tokens/vocabulary.json', import.meta.url), 'utf8'));
export const roles = VOCAB.roles;
export const floors = VOCAB.floors;

const toLin = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => {
  const v = Math.min(1, Math.max(0, c));
  return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
};

export function oklchToRgb(L, C, H) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function oklch(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => toLin(parseInt(h.slice(i, i + 2), 16)));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

const inGamut = (L, C, H) => oklchToRgb(L, C, H).every((v) => v >= -1e-4 && v <= 1 + 1e-4);

export function maxChroma(L, H) {
  let lo = 0;
  let hi = 0.45;
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(L, mid, H)) lo = mid;
    else hi = mid;
  }
  return lo;
}

export const hex = (L, C, H) =>
  '#' +
  oklchToRgb(L, Math.min(C, maxChroma(L, H)), H)
    .map((v) => Math.round(toSrgb(v) * 255).toString(16).padStart(2, '0'))
    .join('');

/** Perceptual distance in OKLab. Under 0.02 is a colour nobody would call different. */
export const distance = (a, b) => {
  const x = oklch(a);
  const y = oklch(b);
  return Math.hypot(x.L - y.L, x.a - y.a, x.b - y.b);
};

/**
 * How much chroma a neutral carries at a given lightness.
 *
 * Paper's neutrals are almost colourless at the extremes and most tinted in the
 * middle, which is what keeps a warm grey from turning brown in the shadows or
 * pink in the highlights. A bell over lightness reproduces that shape; the
 * exponent flattens it enough that body text stays close to neutral.
 */
const tint = (L) => (4 * L * (1 - L)) ** 1.6;

/**
 * @param {{
 *   neutral: {light: {hue: number, chroma: number}, dark: {hue: number, chroma: number}},
 *   accent: {light: {hue: number, chroma: number}, dark: {hue: number, chroma: number}},
 *   semantic: {success: number, warning: number, danger: number},
 *   washChroma?: {light: number, dark: number}
 * }} input
 * @param {'light'|'dark'} mode
 * @returns {Record<string,string>}
 */
export function theme(input, mode) {
  const n = input.neutral[mode];
  const a = input.accent[mode];
  const wash = input.washChroma?.[mode] ?? (mode === 'light' ? 0.022 : 0.052);
  const out = {};
  for (const [name, spec] of Object.entries(roles)) {
    const L = spec.L[mode];
    switch (spec.kind) {
      case 'accent':
        out[name] = hex(L, a.chroma * (name === 'accent' ? 1 : name === 'accent-strong' ? 0.84 : 0.69), a.hue);
        break;
      case 'on-accent':
        out[name] = hex(L, n.chroma * tint(L) * 0.5, n.hue);
        break;
      case 'wash': {
        const hue = name.startsWith('accent')
          ? a.hue
          : input.semantic[name.replace('-wash', '')];
        out[name] = hex(L, wash, hue);
        break;
      }
      case 'semantic':
        out[name] = hex(L, maxChroma(L, input.semantic[name]) * 0.62, input.semantic[name]);
        break;
      default:
        out[name] = hex(L, n.chroma * tint(L), n.hue);
    }
  }
  return out;
}

const lum = (h) => {
  const s = h.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => toLin(parseInt(s.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (x, y) => {
  const [hi, lo] = [lum(x), lum(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * The ladder is a preference; the floor is the answer.
 *
 * A fixed lightness cannot guarantee a contrast that depends on hue: an accent
 * at L 0.53 clears 4.5:1 on a light panel at hue 265 and misses it at 160, and
 * a danger wash at L 0.935 clears it at one hue and not another. The first
 * version of this file set both from the vocabulary and the gate caught nine
 * failures across three hues.
 *
 * So the vocabulary's lightness is where each role starts, and anything a floor
 * names is then moved, one thousandth at a time, in the direction that raises
 * contrast, until the floor clears. A role nobody's floor names never moves.
 *
 * @param {object} input see `theme`
 * @param {'light'|'dark'} mode
 * @returns {{table: Record<string,string>, moved: Record<string, number>}}
 */
export function solve(input, mode) {
  const table = theme(input, mode);
  const geometry = Object.fromEntries(
    Object.entries(table).map(([name, value]) => {
      const c = oklch(value);
      return [name, { L: c.L, C: Math.hypot(c.a, c.b), H: ((Math.atan2(c.b, c.a) * 180) / Math.PI + 360) % 360 }];
    }),
  );
  // Which way raises contrast: an ink moves away from the page, a tinted
  // surface moves towards it, in whichever direction the mode makes that.
  const away = mode === 'light' ? -1 : 1;
  const direction = (name) =>
    roles[name].kind === 'wash' || roles[name].kind === 'on-accent' ? -away : away;

  const moved = {};
  for (let step = 0; step < 400; step++) {
    const failing = audit(table, mode);
    if (failing.length === 0) break;
    const names = new Set();
    for (const line of failing) {
      const m = /: (\S+) on (\S+) is/.exec(line);
      if (!m) continue;
      // Move the tinted one. Two plain surfaces cannot fix each other.
      names.add(roles[m[1]].kind === 'surface' ? m[2] : m[1]);
    }
    for (const name of names) {
      const g = geometry[name];
      g.L = Math.min(0.995, Math.max(0.02, g.L + 0.001 * direction(name)));
      table[name] = hex(g.L, g.C, g.H);
      moved[name] = (moved[name] ?? 0) + 0.001;
    }
  }
  return { table, moved };
}

/** @returns {string[]} every floor in the vocabulary that this table fails. */
export function audit(table, mode) {
  const out = [];
  const check = (ink, on, ratio, label) => {
    const got = contrast(table[ink], table[on]);
    if (got < ratio) out.push(`${mode}: ${ink} on ${on} is ${got.toFixed(2)}:1, ${label} floor is ${ratio}`);
  };
  for (const [label, rule] of Object.entries(floors)) {
    if (label.startsWith('$')) continue;
    for (const [ink, on] of rule.pairs ?? []) check(ink, on, rule.ratio, label);
    for (const ink of rule.inks ?? []) for (const on of rule.on ?? []) check(ink, on, rule.ratio, label);
  }
  return out;
}
