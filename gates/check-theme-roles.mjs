/**
 * Every ink is legible on every surface it can land on, in both themes.
 *
 * The palette used to be solved against pure white while the page is painted on
 * neutral-50. That costs about 0.2 of a ratio, which took every accent's text
 * step from 4.52 to 4.33, which is the difference between passing and failing.
 * Nobody would have seen it. This is the check that does.
 */
import { ROLES } from '../src/emit.mjs';
import { tokens, resolve } from '../src/tokens.mjs';
import { contrast, report } from './lib.mjs';

const TEXT = 4.5;
const GRAPHIC = 3;
const VISIBLE = 1.4;

const SURFACES = ['surface', 'surface-raised', 'surface-sunken'];
const TEXT_INKS = ['ink', 'ink-muted', 'ink-subtle', 'accent-text', 'success', 'warning', 'danger', 'info'];
const GRAPHIC_INKS = ['logo', 'accent'];

export default function check() {
  const fail = [];
  for (const [i, theme] of ['light', 'dark'].entries()) {
    const of = (role) => {
      const row = ROLES.find(([n]) => n === role);
      return resolve(tokens[i ? row[2] : row[1]]);
    };
    for (const surface of SURFACES) {
      for (const ink of TEXT_INKS) {
        const c = contrast(of(ink), of(surface));
        if (c < TEXT) fail.push(`${theme}: ${ink} on ${surface} is ${c.toFixed(2)}:1, text floor is ${TEXT}`);
      }
      for (const ink of GRAPHIC_INKS) {
        const c = contrast(of(ink), of(surface));
        if (c < GRAPHIC) fail.push(`${theme}: ${ink} on ${surface} is ${c.toFixed(2)}:1, graphic floor is ${GRAPHIC}`);
      }
      const rule = contrast(of('rule'), of(surface));
      if (rule < VISIBLE) fail.push(`${theme}: rule on ${surface} is ${rule.toFixed(2)}:1, so the divider is invisible`);
    }
    const onBrand = contrast(of('ink-on-brand'), of('surface-brand'));
    if (onBrand < TEXT) fail.push(`${theme}: ink-on-brand on surface-brand is ${onBrand.toFixed(2)}:1`);
  }
  return report('every theme role is legible on every surface it lands on', fail);
}
