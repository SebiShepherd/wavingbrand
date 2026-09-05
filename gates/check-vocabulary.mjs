/**
 * A theme solved from the vocabulary clears every floor in it.
 *
 * The vocabulary is only worth having if following it is enough. If the ladder
 * of lightnesses in brand/tokens/vocabulary.json cannot produce a compliant
 * theme at some hue, then it is a table of preferences rather than a contract,
 * and a product that follows it will still ship a 3:1 label.
 *
 * So it is solved at several hues, warm and cool, and audited.
 */
import { solve, audit } from '../src/theme.mjs';
import { report } from './lib.mjs';

/** Warm-neutral, cool-neutral, and a neutral pushed further than anybody should. */
const CASES = [
  ['paper-like', { light: { hue: 82, chroma: 0.0155 }, dark: { hue: 270, chroma: 0.023 } }, { light: { hue: 265, chroma: 0.216 }, dark: { hue: 270, chroma: 0.149 } }],
  ['cool', { light: { hue: 250, chroma: 0.012 }, dark: { hue: 250, chroma: 0.02 } }, { light: { hue: 160, chroma: 0.15 }, dark: { hue: 160, chroma: 0.12 } }],
  ['warm-heavy', { light: { hue: 40, chroma: 0.03 }, dark: { hue: 40, chroma: 0.04 } }, { light: { hue: 20, chroma: 0.19 }, dark: { hue: 20, chroma: 0.14 } }],
];

export default function check() {
  const fail = [];
  for (const [name, neutral, accent] of CASES) {
    const input = { neutral, accent, semantic: { success: 166, warning: 76, danger: 28 } };
    for (const mode of ['light', 'dark']) {
      const { table, moved } = solve(input, mode);
      fail.push(...audit(table, `${name}/${mode}`));
      // A role dragged a long way from its preferred lightness is a sign the
      // ladder is wrong for that hue, not that the solver saved it.
      for (const [role, delta] of Object.entries(moved))
        if (delta > 0.12) fail.push(`${name}/${mode}: ${role} had to move ${delta.toFixed(3)} in lightness to clear its floor`);
    }
  }
  return report(`the vocabulary can be solved into a compliant theme (${CASES.length} hues, both modes)`, fail);
}
