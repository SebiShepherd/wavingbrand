/**
 * SVG path data, read once and written wherever it has to go.
 *
 * The mark is twelve straight segments and the wordmark is beziers out of
 * fontkit. PDF and PostScript both want the same shapes in their own operators,
 * and neither has a quadratic curve, so the one place that understands the
 * `d` attribute is here rather than in each writer.
 */

const NUM = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;

/**
 * @param {string} d
 * @returns {{op: 'M'|'L'|'C'|'Z', args: number[]}[]} absolute, cubic-only
 */
export function parse(d) {
  const out = [];
  let cursor = [0, 0];
  let start = [0, 0];
  for (const [, letter, body] of d.matchAll(/([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g)) {
    const n = (body.match(NUM) ?? []).map(Number);
    const rel = letter === letter.toLowerCase();
    const at = (i) => (rel ? [cursor[0] + n[i], cursor[1] + n[i + 1]] : [n[i], n[i + 1]]);
    switch (letter.toUpperCase()) {
      case 'M':
        for (let i = 0; i < n.length; i += 2) {
          cursor = at(i);
          if (i === 0) {
            start = cursor;
            out.push({ op: 'M', args: [...cursor] });
          } else out.push({ op: 'L', args: [...cursor] });
        }
        break;
      case 'L':
        for (let i = 0; i < n.length; i += 2) {
          cursor = at(i);
          out.push({ op: 'L', args: [...cursor] });
        }
        break;
      case 'H':
        for (const v of n) {
          cursor = [rel ? cursor[0] + v : v, cursor[1]];
          out.push({ op: 'L', args: [...cursor] });
        }
        break;
      case 'V':
        for (const v of n) {
          cursor = [cursor[0], rel ? cursor[1] + v : v];
          out.push({ op: 'L', args: [...cursor] });
        }
        break;
      case 'C':
        for (let i = 0; i < n.length; i += 6) {
          const a = at(i);
          const b = at(i + 2);
          cursor = at(i + 4);
          out.push({ op: 'C', args: [...a, ...b, ...cursor] });
        }
        break;
      case 'Q':
        // PDF and PostScript have no quadratic. Raising the degree is exact,
        // not an approximation: the control points are two thirds of the way
        // from each end towards the quadratic's own control point.
        for (let i = 0; i < n.length; i += 4) {
          const q = at(i);
          const end = at(i + 2);
          const c1 = [cursor[0] + (2 / 3) * (q[0] - cursor[0]), cursor[1] + (2 / 3) * (q[1] - cursor[1])];
          const c2 = [end[0] + (2 / 3) * (q[0] - end[0]), end[1] + (2 / 3) * (q[1] - end[1])];
          cursor = end;
          out.push({ op: 'C', args: [...c1, ...c2, ...cursor] });
        }
        break;
      case 'Z':
        out.push({ op: 'Z', args: [] });
        cursor = start;
        break;
      default:
        throw new Error(`path command ${letter} is not used by this brand and is not implemented`);
    }
  }
  return out;
}

/** Apply a transform, so a writer never has to. y flips because SVG grows down and PDF grows up. */
export const map = (segments, fn) =>
  segments.map(({ op, args }) => ({
    op,
    args: args.flatMap((_, i) => (i % 2 ? [] : fn(args[i], args[i + 1]))),
  }));
