/**
 * What the brand asks of a product, rather than what it hands it.
 *
 * A product with its own visual identity does not adopt the brand's surfaces.
 * Hikaru's theme is warm off-white with a blue accent, argued in its own token
 * file, and pushing a cool navy-hued neutral ramp into it would be the brand
 * overwriting a product decision that is none of its business.
 *
 * So the brand ships two things and asks for one. It ships the identity, which
 * is not negotiable, and it ships the assets. It asks that wherever a product
 * renders the mark, the mark can be seen, and that the product's own accent is
 * not mistakable for the brand pink.
 */
import { tokens, resolve } from './tokens.mjs';

const GRAPHIC = 3;

const toLin = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const h = hex.replace('#', '');
  return 0.2126 * toLin(parseInt(h.slice(0, 2), 16)) + 0.7152 * toLin(parseInt(h.slice(2, 4), 16)) + 0.0722 * toLin(parseInt(h.slice(4, 6), 16));
};
export const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

export function oklch(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => toLin(parseInt(h.slice(i, i + 2), 16)));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, B), H: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

/**
 * Two colours are confusable when they land in the same place.
 *
 * These are the numbers that made #ff005c and the brand pink one colour: the
 * lightnesses matched to 0.001 and the hues sat 14.6 degrees apart. Twenty-five
 * degrees and 0.08 of lightness is the boundary that separates them from every
 * other pair in the palette.
 */
export function confusable(a, b) {
  const x = oklch(a);
  const y = oklch(b);
  const dH = Math.min(Math.abs(x.H - y.H), 360 - Math.abs(x.H - y.H));
  return dH < 25 && Math.abs(x.L - y.L) < 0.08 && x.C > 0.06 && y.C > 0.06;
}

/**
 * @param {{product: string, themes: Record<string, {surfaces: Record<string,string>, logo: string, accent?: string, box?: string}>}} decl
 * @returns {string[]} findings, empty when the product satisfies the brand
 */
export function validate(decl) {
  const pink = resolve(tokens['color.brand.pink']);
  const out = [];
  for (const [theme, t] of Object.entries(decl.themes ?? {})) {
    // A boxed mark answers to its box, and the box answers to the page. A bare
    // mark answers to the page directly. Checking a white mark against a white
    // page when it is sitting inside a navy tile is how a validator earns the
    // right to be ignored.
    const againstPage = t.box ? t.box : t.logo;
    const role = t.box ? `the tile at ${t.box}` : `the mark at ${t.logo}`;
    for (const [name, surface] of Object.entries(t.surfaces ?? {})) {
      if (!againstPage) continue;
      const c = contrast(againstPage, surface);
      if (c < GRAPHIC)
        out.push(
          `${decl.product} ${theme}: ${role} is ${c.toFixed(2)}:1 on ${name} (${surface}); it needs ${GRAPHIC}:1 to have an edge`,
        );
    }
    if (t.box && t.logo && contrast(t.logo, t.box) < GRAPHIC)
      out.push(`${decl.product} ${theme}: the mark is ${contrast(t.logo, t.box).toFixed(2)}:1 inside its own tile`);
    if (t.accent && confusable(t.accent, pink))
      out.push(`${decl.product} ${theme}: the product accent ${t.accent} is confusable with the brand pink ${pink}`);
  }
  return out;
}
