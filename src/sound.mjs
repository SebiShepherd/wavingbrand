/**
 * The audio signature, synthesised.
 *
 * Noise rises into the stamp, a low hit with reverb lands on it, a calm tail
 * rings out, and under the type a quiet wave swells and recedes. Nothing here is
 * a sample, so nobody else holds rights in any part of it.
 *
 * Sebastian chose the direction over several rounds on 2026-10-25, against
 * bells, swooshes, clicks, a supersaw synth, piano and strings, and approved
 * this recipe as the signature. The tuned numbers are in
 * brand/tokens/sound.json. The literals inside `signature()` are the recipe
 * itself: picked while prototyping and accepted by ear as a whole, none of them
 * tuned on its own, which is why they are not dressed up as tokens.
 *
 * Deterministic: a seeded generator and plain arithmetic, so the same tokens
 * give the same bytes and the WAV can live in dist/ under check-dist-clean.
 */
import { tokens } from './tokens.mjs';

const t = (k) => tokens[k];
const SR = t('signature.sampleRate');
const DUR = t('intro.duration');
const HIT = t('intro.stamp.at');
const N = Math.round(SR * DUR);
const T = Float64Array.from({ length: N }, (_, i) => i / SR);

const map = (f) => Float64Array.from(T, f);
const clip = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const db = (x) => 10 ** (x / 20);

/** mulberry32, then Box-Muller: standard normal noise. */
function gaussian(seed) {
  let a = seed >>> 0;
  const u = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  return (n) => {
    const out = new Float64Array(n);
    for (let i = 0; i < n; i += 2) {
      const r = Math.sqrt(-2 * Math.log(1 - u()));
      const th = 2 * Math.PI * u();
      out[i] = r * Math.cos(th);
      if (i + 1 < n) out[i + 1] = r * Math.sin(th);
    }
    return out;
  };
}

/** Attack (quadratic), hold, exponential release. */
function env(t0, attack, hold, release, curve = 3) {
  return map((s) => {
    const x = s - t0;
    if (x < 0) return 0;
    if (x < attack) return (x / attack) ** 2;
    if (x < attack + hold) return 1;
    return Math.exp((-curve * (x - attack - hold)) / release);
  });
}

// Second-order Butterworth, designed the way scipy's butter() does it:
// analogue prototype, prewarped, bilinear transform, then biquads.
const cx = {
  add: ([a, b], [c, d]) => [a + c, b + d],
  sub: ([a, b], [c, d]) => [a - c, b - d],
  mul: ([a, b], [c, d]) => [a * c - b * d, a * d + b * c],
  div: ([a, b], [c, d]) => {
    const m = c * c + d * d;
    return [(a * c + b * d) / m, (b * c - a * d) / m];
  },
  sqrt: ([a, b]) => {
    const m = Math.hypot(a, b);
    return [Math.sqrt((m + a) / 2), Math.sign(b || 1) * Math.sqrt((m - a) / 2)];
  },
};

const designs = new Map();
function butter(lo, hi) {
  const key = `${lo} ${hi}`;
  if (designs.has(key)) return designs.get(key);
  const fs2 = 2 * SR;
  const warp = (f) => fs2 * Math.tan((Math.PI * f) / SR);
  const proto = [
    [-Math.SQRT1_2, Math.SQRT1_2],
    [-Math.SQRT1_2, -Math.SQRT1_2],
  ];
  let poles;
  let k;
  let num; // each biquad's zeros: lowpass at -1 twice, bandpass at +1 and -1
  if (hi === undefined) {
    const w = warp(lo);
    poles = proto.map(([a, b]) => [a * w, b * w]);
    k = w * w;
    num = [1, 2, 1];
  } else {
    const w1 = warp(lo);
    const w2 = warp(hi);
    const bw = w2 - w1;
    poles = proto.flatMap(([a, b]) => {
      const pb = [(a * bw) / 2, (b * bw) / 2];
      const d = cx.sqrt(cx.sub(cx.mul(pb, pb), [w1 * w2, 0]));
      return [cx.add(pb, d), cx.sub(pb, d)];
    });
    k = bw * bw;
    // The analogue zeros at s = 0 contribute (2fs)^2 to the gain below.
    k *= fs2 * fs2;
    num = [1, 0, -1];
  }
  let den = [1, 0];
  for (const p of poles) den = cx.mul(den, cx.sub([fs2, 0], p));
  const gain = k / den[0];
  const sos = poles
    .map((p) => cx.div(cx.add([fs2, 0], p), cx.sub([fs2, 0], p)))
    .filter(([, im]) => im > 0)
    .map(([re, im], i) => {
      const g = i === 0 ? gain : 1;
      return [num[0] * g, num[1] * g, num[2] * g, -2 * re, re * re + im * im];
    });
  designs.set(key, sos);
  return sos;
}

/** Direct form II transposed, zero initial state, like scipy's sosfilt. */
function sosfilt(sos, x) {
  const y = Float64Array.from(x);
  for (const [b0, b1, b2, a1, a2] of sos) {
    let z1 = 0;
    let z2 = 0;
    for (let i = 0; i < y.length; i++) {
      const xi = y[i];
      const yi = b0 * xi + z1;
      z1 = b1 * xi - a1 * yi + z2;
      z2 = b2 * xi - a2 * yi;
      y[i] = yi;
    }
  }
  return y;
}

const band = (x, lo, hi) => sosfilt(butter(lo, hi), x);
const lowpass = (x, f) => sosfilt(butter(f), x);

/** A bandpass whose centre moves block by block; each block filtered with 2000 samples of run-in. */
function sweep(x, t0, t1, blocks, centre, q) {
  const y = new Float64Array(N);
  for (let i = 0; i < blocks; i++) {
    const a = Math.round((t0 + ((t1 - t0) * i) / blocks) * SR);
    const b = Math.round((t0 + ((t1 - t0) * (i + 1)) / blocks) * SR);
    const f = centre(i, a, b);
    const seg = band(x.subarray(Math.max(0, a - 2000), b), f * (1 - q), f * (1 + q));
    y.set(seg.subarray(seg.length - (b - a)), a);
  }
  return y;
}

/** In-place radix-2 FFT. */
function fft(re, im, inverse) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  const cos = Float64Array.from({ length: n / 2 }, (_, k) => Math.cos((2 * Math.PI * k) / n));
  const sin = Float64Array.from({ length: n / 2 }, (_, k) => (inverse ? 1 : -1) * Math.sin((2 * Math.PI * k) / n));
  for (let len = 2; len <= n; len <<= 1) {
    const step = n / len;
    for (let i = 0; i < n; i += len)
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const wr = cos[k * step];
        const wi = sin[k * step];
        const tr = re[b] * wr - im[b] * wi;
        const ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
  }
  if (inverse) for (let i = 0; i < n; i++) (re[i] /= n), (im[i] /= n);
}

/** Linear convolution, truncated to N samples. */
function convolve(x, h) {
  let n = 1;
  while (n < x.length + h.length) n <<= 1;
  const [ar, ai, br, bi] = [0, 0, 0, 0].map(() => new Float64Array(n));
  ar.set(x);
  br.set(h);
  fft(ar, ai, false);
  fft(br, bi, false);
  for (let i = 0; i < n; i++) {
    const r = ar[i] * br[i] - ai[i] * bi[i];
    ai[i] = ar[i] * bi[i] + ai[i] * br[i];
    ar[i] = r;
  }
  fft(ar, ai, true);
  return ar.subarray(0, N);
}

const peak = (x) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

/** Reverb from decaying noise, a different impulse per side, so the hit opens out into stereo. */
function reverb(x, noise, seconds, mix) {
  const n = Math.round(SR * seconds);
  const px = peak(x);
  return [0, 1].map(() => {
    const ir = noise(n).map((v, i) => v * Math.exp((-6 * i) / n));
    const wet = convolve(x, lowpass(ir, 6000));
    const k = (px * mix) / (peak(wet) + 1e-9);
    return x.map((v, i) => v * (1 - mix) + wet[i] * k);
  });
}

/**
 * The wave: dark noise that swells and recedes, its band opening with the
 * crest. A brighter spray at the end read as a second wave, so there is none.
 */
function wave(noise) {
  const [t0, crest, t1] = ['start', 'crest', 'end'].map((k) => t(`signature.wave.${k}`));
  const [lo, hi] = [t('signature.wave.from'), t('signature.wave.to')];
  const p = (crest - t0) / (t1 - t0);
  const bump = map((s) => {
    if (s < t0 || s > t1) return 0;
    const x = (s - t0) / (t1 - t0);
    const b = x < p ? Math.sin(((Math.PI / 2) * x) / p) ** 2 : Math.exp((-3 * (x - p)) / (1 - p));
    return b * clip((t1 - s) / 0.7);
  });
  return [0, 1].map(() => {
    const body = sweep(noise(N), t0, t1, 56, (i, a, b) => lo + (hi - lo) * bump[(a + b) >> 1], 0.6);
    return body.map((v, i) => v * bump[i]);
  });
}

/** Two channels of float samples, peak at the token level. */
export function signature() {
  const noise = gaussian(t('signature.seed'));
  const n = noise(N);
  const r0 = t('signature.riser.start');
  const rise = HIT - r0;
  const riser = sweep(n, r0, HIT, 60, (i) => 300 * 20 ** (i / 60), 0.35).map(
    (v, i) => v * clip((T[i] - r0) / rise) ** 2.5 * (T[i] < HIT),
  );
  const toneEnv = env(r0, rise, 0, 0.05);
  const tone = map((s, i) => Math.sin(2 * Math.PI * 110 * 2 ** (clip(s - r0, 0, rise) / rise) * s) * toneEnv[i] * 0.15);
  const boomEnv = env(HIT, 0.003, 0.05, 1.4, 4);
  const boom = map((s, i) => Math.sin(2 * Math.PI * (45 + 60 * Math.exp(-(s - HIT) * 15)) * (s - HIT)) * boomEnv[i]);
  const clickEnv = env(HIT, 0.001, 0, 0.03, 5);
  const click = band(n, 1500, 8000).map((v, i) => v * clickEnv[i] * 0.8);
  const tailEnv = env(HIT + 0.05, 0.3, 0.5, 2.5, 2.5);
  const chord = map((s, i) => [110, 164.8, 220].reduce((a, f) => a + Math.sin(2 * Math.PI * f * s), 0) * tailEnv[i]);
  const tail = lowpass(chord, 900);
  const x = map((_, i) => 0.35 * riser[i] + tone[i] + 0.9 * boom[i] + click[i] + 0.12 * tail[i]);
  const st = reverb(x, noise, t('signature.reverb.length'), t('signature.reverb.mix'));

  // The wave sits a fixed distance below the tail, measured in the same window.
  const w = wave(noise);
  const a = Math.round(3.3 * SR);
  const b = Math.round(4.3 * SR);
  const power = (chs) => chs.reduce((s, c) => s + c.subarray(a, b).reduce((q, v) => q + v * v, 0), 0);
  const k = Math.sqrt(power(st) / power(w)) * db(t('signature.wave.below'));
  for (const c of [0, 1]) for (let i = 0; i < N; i++) st[c][i] += w[c][i] * k;

  const drive = t('signature.drive');
  const [f0, f1] = t('signature.fade');
  const m = Math.max(peak(st[0]), peak(st[1]));
  const out = st.map((c) =>
    c.map((v, i) => (Math.tanh((v / m) * drive) / Math.tanh(drive)) * clip((f1 - T[i]) / (f1 - f0))),
  );
  const g = db(t('signature.peak')) / Math.max(peak(out[0]), peak(out[1]));
  return out.map((c) => c.map((v) => v * g));
}

/** 16-bit PCM WAV. */
export function wav([l, r]) {
  const data = Buffer.alloc(l.length * 4);
  for (let i = 0; i < l.length; i++) {
    data.writeInt16LE(Math.trunc(l[i] * 32767), i * 4);
    data.writeInt16LE(Math.trunc(r[i] * 32767), i * 4 + 2);
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(2, 22);
  head.writeUInt32LE(SR, 24);
  head.writeUInt32LE(SR * 4, 28);
  head.writeUInt16LE(4, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36);
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}
