/**
 * The split intro, frame by frame.
 *
 * The outline draws itself in pink while the mark zooms in, the fill rises
 * from below and turns white, a stamp pulse lands, the mark shrinks into the
 * split lockup and the two words slide out from under it behind a pink light
 * edge. Then it holds, and fades.
 *
 * Every frame is an SVG built from the same paths as the static assets, so
 * nothing here is drawn either. It is composed on a 1280x720 frame and
 * rendered at whatever size is asked for. The timings are in
 * brand/tokens/motion.json; the literals below are the shape of each move
 * (padding, the fill's ripple, the length a dash has to cover), not timings.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { markPath, STANDARD } from './mark.mjs';
import { CAP, GAP } from './lockup.mjs';
import { wordmark } from './wordmark.mjs';
import { tokens, color } from './tokens.mjs';

const t = (k) => tokens[`intro.${k}`];
const W = 1280;
const H = 720;
const NAVY = color('color.brand.navy');
const PINK = color('color.brand.pink');
const WHITE = color('color.brand.white');
const MARK = markPath({ cut: STANDARD }).d;
const OUTLINE = markPath({ cut: STANDARD, style: 'outline' }).d;

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (s, [t0, t1]) => clamp((s - t0) / (t1 - t0));
const lerp = (a, b, x) => a + (b - a) * x;
const outCubic = (x) => 1 - (1 - x) ** 3;
const inOutCubic = (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
const f = (n) => n.toFixed(3);

function mix(a, b, x) {
  const ch = (c, i) => parseInt(c.slice(1 + 2 * i, 3 + 2 * i), 16);
  return `#${[0, 1, 2].map((i) => Math.round(lerp(ch(a, i), ch(b, i), x)).toString(16).padStart(2, '0')).join('')}`;
}

/** Where everything ends: the split lockup, centred, at `scale` frame pixels per ninth. */
export function layout([left, right]) {
  const S = t('scale');
  const words = [wordmark(left), wordmark(right)];
  const gap = GAP * CAP;
  const markW = 32;
  const width = words[0].width * CAP + gap + markW + gap + words[1].width * CAP;
  const x = (W - width * S) / 2;
  const y = (H - markW * S) / 2;
  return {
    S,
    words,
    mark: { x: x + (words[0].width * CAP + gap) * S, y },
    left: x,
    right: x + (words[0].width * CAP + gap + markW + gap) * S,
    capY: y + ((markW - CAP) / 2) * S,
  };
}

/**
 * One frame. `id` prefixes every id, so several frames can share one SVG.
 * `end` is the colour it fades into; black unless the intro leads somewhere.
 */
export function frame(s, L, { end = '#000000', id = '' } = {}) {
  const S = L.S;
  // Zoom in from large, wait for the stamp, then settle into the lockup.
  let x, y, k;
  const [from, to] = [t('zoom.from'), t('zoom.to')];
  if (s < t('settle')[0]) {
    k = lerp(from, to, outCubic(seg(s, [0, t('zoom.end')])));
    [x, y] = [(W - 32 * k) / 2, (H - 32 * k) / 2];
  } else {
    const p = inOutCubic(seg(s, t('settle')));
    k = lerp(to, S, p);
    x = lerp((W - 32 * to) / 2, L.mark.x, p);
    y = lerp((H - 32 * to) / 2, L.mark.y, p);
  }

  let inner = '';
  const draw = inOutCubic(seg(s, t('outline.draw')));
  const op = 1 - seg(s, t('outline.fade'));
  // 300 is longer than any of the outline's contours, so each draws from nothing to whole.
  if (draw > 0 && op > 0)
    inner += `<path d="${OUTLINE}" fill="none" stroke="${PINK}" stroke-width="${t('outline.stroke')}" stroke-linejoin="miter" stroke-dasharray="300" stroke-dashoffset="${f(300 * (1 - draw))}" opacity="${f(op)}"/>`;
  const rise = inOutCubic(seg(s, t('fill.rise')));
  if (rise > 0) {
    const level = lerp(33, -1, rise);
    const amp = t('fill.ripple') * (1 - rise);
    const pts = [];
    for (let u = -1; u < 34; u++) pts.push(`${u},${f(level + Math.sin(u * 0.45 + s * 9) * amp)}`);
    inner += `<g clip-path="url(#${id}mk)"><polygon points="${pts.join(' ')} 33,34 -1,34" fill="${mix(PINK, WHITE, seg(s, t('fill.whiten')))}"/></g>`;
  }
  const sp = seg(s, [t('stamp.at'), t('stamp.at') + t('stamp.length')]);
  if (sp > 0 && sp < 1) {
    const g = 1 + t('stamp.grow') * outCubic(sp);
    inner += `<g transform="translate(16 16) scale(${f(g)}) translate(-16 -16)"><path d="${MARK}" fill="none" stroke="${PINK}" stroke-width="${f(t('stamp.stroke') / g)}" opacity="${f(1 - sp)}"/></g>`;
  }

  let body = `<g transform="translate(${f(x)} ${f(y)}) scale(${f(k)})">${inner}</g>`;
  if (s >= t('wordmark.at')) body += words(s, L, id);
  const fade = seg(s, t('fade'));
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">`,
    `<defs><clipPath id="${id}mk"><path d="${MARK}"/></clipPath></defs>`,
    `<rect width="${W}" height="${H}" fill="${NAVY}"/>`,
    body,
    fade > 0 ? `<rect width="${W}" height="${H}" fill="${end}" opacity="${f(fade)}"/>` : '',
    '</svg>',
  ].join('');
}

/** WAVING and EYE slide out from under the mark, each behind a clip with a pink edge. */
function words(s, L, id) {
  const p = outCubic(seg(s, [t('wordmark.at'), t('wordmark.at') + t('wordmark.length')]));
  const c = CAP * L.S;
  const top = L.capY;
  let out = '';
  [
    [-1, L.words[0], L.left],
    [1, L.words[1], L.right],
  ].forEach(([side, w, x0], i) => {
    const wpx = w.width * c;
    const edge = x0 + (side < 0 ? wpx * (1 - p) : wpx * p);
    const cx = side < 0 ? edge - 2 : x0 - 5;
    const cw = side < 0 ? x0 + wpx + 5 - edge : edge - x0 + 5;
    const tx = x0 - side * (1 - p) * t('wordmark.travel');
    out +=
      `<clipPath id="${id}wm${i}"><rect x="${f(cx)}" y="${f(top - 10)}" width="${f(Math.max(cw, 0))}" height="${f(c + 20)}"/></clipPath>` +
      `<g clip-path="url(#${id}wm${i})"><g transform="translate(${f(tx)} ${f(top + c)}) scale(${f(c)})"><path d="${w.d}" fill="${WHITE}"/></g></g>`;
    if (p > 0 && p < 1) {
      const e = t('wordmark.edge');
      out += `<rect x="${f(edge - e / 2)}" y="${f(top - 6)}" width="${e}" height="${f(c + 12)}" fill="${PINK}"/>`;
    }
  });
  return out;
}

/** Every frame's SVG, in order. */
export function frames(split, opts) {
  const L = layout(split);
  const n = Math.round(t('duration') * t('fps'));
  return Array.from({ length: n }, (_, i) => frame(i / t('fps'), L, opts));
}

/** A contact sheet of chosen moments, for reviewing a change without playing it. */
export function keyframes(split, times, width = 1920) {
  const L = layout(split);
  const cols = 4;
  const cw = W / cols;
  const ch = H / cols;
  const cells = times.map((s, i) =>
    frame(s, L, { id: `k${i}` }).replace(
      '<svg xmlns="http://www.w3.org/2000/svg" ',
      `<svg x="${(i % cols) * cw}" y="${Math.floor(i / cols) * ch}" width="${cw}" height="${ch}" `,
    ),
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${ch * Math.ceil(times.length / cols)}">${cells.join('')}</svg>`;
  return new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
}

/** The ffmpeg settings, part of what a cached encode is keyed on. */
export const ENCODE = ['-c:v', 'libx264', '-crf', '16', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart'];

/** Render the frames at `width` and encode them with the audio into an MP4. Needs ffmpeg on PATH. */
export function encode(svgs, wavBytes, width = 1920) {
  const dir = mkdtempSync(join(tmpdir(), 'wavingbrand-'));
  try {
    svgs.forEach((svg, i) =>
      writeFileSync(
        join(dir, `f${String(i).padStart(4, '0')}.png`),
        new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng(),
      ),
    );
    writeFileSync(join(dir, 'audio.wav'), wavBytes);
    const out = join(dir, 'out.mp4');
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(t('fps')), '-i', join(dir, 'f%04d.png'), '-i', join(dir, 'audio.wav'), ...ENCODE, out]);
    return readFileSync(out);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
