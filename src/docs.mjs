#!/usr/bin/env node
/**
 * The guidelines, generated.
 *
 * A brand portal is the one thing in section 1.5 of the proposal that has no
 * free equivalent, and for a company of one the substitute is a page built from
 * the same parameters as the assets. It cannot drift, because nothing in it is
 * typed twice.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STANDARD, SMALL, outline, width as markWidth } from './mark.mjs';
import { mark, type as typePiece, CAP, GAP, opticalLift } from './lockup.mjs';
import { toSvg } from './svg.mjs';
import { tokens, color } from './tokens.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(join(root, p), 'utf8');
const svgOf = (p) => read(p).replace(/<\?xml[^>]*\?>/, '');

const C = (k) => color(`color.${k}`);
const NAVY = C('brand.navy');
const PINK = C('brand.pink');
/** The ground a navy specimen sits on, in either theme. Not a token on purpose. */
const PAPER = '#f4f5f9';
const PAPER_RULE = '#c9cee0';
const PAPER_INK = '#4d5478';
const WHITE = C('brand.white');

const lin = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const lum = (hex) => {
  const h = hex.replace('#', '');
  return 0.2126 * lin(parseInt(h.slice(0, 2), 16)) + 0.7152 * lin(parseInt(h.slice(2, 4), 16)) + 0.0722 * lin(parseInt(h.slice(4, 6), 16));
};
const cr = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** The construction drawing: the mark over its own grid of ninths. */
function gridDiagram() {
  const g = STANDARD;
  const u = 14;
  const w = markWidth(g) * u;
  const h = g.height * u;
  const pad = 3 * u;
  const lines = [];
  for (let i = 0; i <= markWidth(g); i++)
    lines.push(
      `<line x1="${i * u}" y1="0" x2="${i * u}" y2="${h}" stroke="var(--rule)" stroke-width="${i % 9 === 0 ? 1.4 : 0.5}"/>`,
    );
  for (let i = 0; i <= g.height; i++)
    lines.push(
      `<line x1="0" y1="${i * u}" x2="${w}" y2="${i * u}" stroke="var(--rule)" stroke-width="${i % 9 === 0 ? 1.4 : 0.5}"/>`,
    );
  const pts = outline(g)
    .map(([x, y]) => `${x * u},${y * u}`)
    .join(' ');
  const dots = outline(g)
    .map(([x, y]) => `<circle cx="${x * u}" cy="${y * u}" r="3.5" fill="var(--accent)"/>`)
    .join('');
  const label = (x, y, t) =>
    `<text x="${x * u}" y="${y * u}" font-size="13" font-family="var(--mono)" fill="var(--ink-3)" text-anchor="middle">${t}</text>`;
  return `<svg viewBox="${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2.2}" class="diagram" role="img" aria-label="The mark on its grid of ninths">
    <g opacity="0.55">${lines.join('')}</g>
    <polygon points="${pts}" fill="var(--ink-1)" fill-opacity="0.10" stroke="var(--ink-1)" stroke-width="2"/>
    ${dots}
    ${label(4.5, -1, '9')}${label(10.5, -1, '3')}${label(16, -1, '8')}${label(21.5, -1, '3')}${label(27.5, -1, '9')}
    <line x1="0" y1="${g.height * u + 1.4 * u}" x2="${w}" y2="${g.height * u + 1.4 * u}" stroke="var(--accent)" stroke-width="1.5"/>
    ${label(markWidth(g) / 2, 35.4, '32 = 2 x 9 + 8 + 2 x 3')}
  </svg>`;
}

/** Two cuts at the sizes a browser actually paints them. */
function cutComparison() {
  const sizes = [16, 20, 24, 32, 48];
  const row = (cut, name) =>
    `<div class="cutrow"><span class="cutname">${name}</span>${sizes
      .map((s) => {
        const piece = mark({ cut });
        const svg = toSvg(piece, { ink: 'currentColor', title: name });
        return `<figure style="width:${s}px"><div class="glyph" style="height:${(s * piece.height) / piece.width}px">${svg}</div><figcaption>${s}</figcaption></figure>`;
      })
      .join('')}</div>`;
  return `<div class="cuts">${row(STANDARD, 'standard')}${row(SMALL, 'small')}</div>`;
}

const swatch = (name, hex, notes) => `<li class="swatch">
  <span class="chip" style="background:${hex}"></span>
  <span class="sname">${name}</span>
  <span class="shex">${hex}</span>
  <span class="snote">${notes}</span>
</li>`;

function palette() {
  const brand = ['pink', 'pinkOnLight', 'pinkOnDark', 'navy', 'white', 'black'];
  const neutral = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
  const accents = ['orange', 'amber', 'green', 'teal', 'blue', 'purple', 'red'];
  const ratio = (hex) => {
    const w = cr(hex, WHITE);
    const n = cr(hex, NAVY);
    return `<span class="ratio ${w >= 4.5 ? 'pass' : w >= 3 ? 'graphic' : 'fail'}">${w.toFixed(2)} on white</span><span class="ratio ${n >= 4.5 ? 'pass' : n >= 3 ? 'graphic' : 'fail'}">${n.toFixed(2)} on navy</span>`;
  };
  const on = (hex) => (cr(hex, '#ffffff') >= 3.6 ? '#ffffff' : NAVY);
  return `
  <h3>Brand</h3>
  <ul class="swatches">${brand.map((k) => swatch(k, C(`brand.${k}`), ratio(C(`brand.${k}`)))).join('')}</ul>
  <h3>Neutral <span class="sub">hue 271.3, the navy's own, so the greys belong to the brand</span></h3>
  <ul class="swatches tight">${neutral.map((k) => swatch(k, C(`neutral.${k}`), ratio(C(`neutral.${k}`)))).join('')}</ul>
  <h3>Accent <span class="sub">400 on dark, 500 for fills, 600 for text on light</span></h3>
  <div class="accents">${accents
    .map(
      (a) => `<div class="accent"><span class="aname">${a}</span>${['400', '500', '600']
        .map(
          (s) =>
            `<span class="astep" style="background:${C(`accent.${a}.${s}`)};color:${on(C(`accent.${a}.${s}`))};text-shadow:none"><b>${s}</b>${C(`accent.${a}.${s}`)}</span>`,
        )
        .join('')}</div>`,
    )
    .join('')}</div>`;
}

function specimen(label, file, { on = 'light', h = 92 } = {}) {
  return `<figure class="spec ${on}"><div class="art" style="--h:${h}px">${svgOf(`dist/${file}`)}</div><figcaption>${label}<code>${file}</code></figcaption></figure>`;
}

function pngSpecimen(label, file, size, { on = '' } = {}) {
  const b64 = readFileSync(join(root, 'dist', file)).toString('base64');
  return `<figure class="icon"><img class="${on}" src="data:image/png;base64,${b64}" width="${size}" height="${size}" alt="${label}"><figcaption>${label}<code>${size}px</code></figcaption></figure>`;
}

const CHANGES = [
  ['middle stroke', '8.18 ninths', '8 ninths', '-2.2%'],
  ['base bar', '7.82 ninths', '8 ninths', '+2.3%'],
  ['counter gap', '2.91 ninths', '3 ninths', '+3.1%'],
  ['bar top edge', '21.18 ninths', '21 ninths', '-0.8%'],
  ['middle stroke top', '10.10 ninths', '10 ninths', '-1.0%'],
  ['cut drop', '3 ninths', '3 ninths', 'unchanged'],
  ['outer stroke', '9 ninths', '9 ninths', 'unchanged'],
  ['mark bounding box', '31.9996 ninths', '32 ninths', '+0.003%'],
];

function page() {
  const geo = (k) => tokens[`grid.standard.${k}`];
  return `<title>WavingEye Brand Build</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:ital,wght@0,400;0,500;1,400&display=swap">
<style>
:root{
  --mono:'IBM Plex Mono',ui-monospace,monospace;
  --sans:'IBM Plex Sans',system-ui,sans-serif;
  --display:'Montserrat',system-ui,sans-serif;
  --ground:${C('neutral.50')};
  --panel:#ffffff;
  --panel-2:${C('neutral.100')};
  --ink-1:${NAVY};
  --ink-2:${C('neutral.700')};
  --ink-3:${C('neutral.500')};
  --rule:${C('neutral.300')};
  --accent:${PINK};
  --accent-text:${C('brand.pinkOnLight')};
  --ok:${C('accent.green.600')};
  --warn:${C('accent.amber.600')};
  --bad:${C('accent.red.600')};
  --shadow:0 1px 2px rgba(16,21,84,.06),0 8px 24px rgba(16,21,84,.05);
}
:root:not([data-theme="light"]){@media (prefers-color-scheme:dark){
  --ground:${C('neutral.950')};
  --panel:${C('neutral.900')};
  --panel-2:${C('neutral.800')};
  --ink-1:${C('neutral.100')};
  --ink-2:${C('neutral.300')};
  --ink-3:${C('neutral.400')};
  --rule:${C('neutral.700')};
  --accent-text:${C('brand.pinkOnDark')};
  --ok:${C('accent.green.400')};
  --warn:${C('accent.amber.400')};
  --bad:${C('accent.red.400')};
  --shadow:0 1px 2px rgba(0,0,0,.4),0 8px 24px rgba(0,0,0,.3);
}}
:root[data-theme="dark"]{
  --ground:${C('neutral.950')};
  --panel:${C('neutral.900')};
  --panel-2:${C('neutral.800')};
  --ink-1:${C('neutral.100')};
  --ink-2:${C('neutral.300')};
  --ink-3:${C('neutral.400')};
  --rule:${C('neutral.700')};
  --accent-text:${C('brand.pinkOnDark')};
  --ok:${C('accent.green.400')};
  --warn:${C('accent.amber.400')};
  --bad:${C('accent.red.400')};
  --shadow:0 1px 2px rgba(0,0,0,.4),0 8px 24px rgba(0,0,0,.3);
}
*{box-sizing:border-box}
body{background:var(--ground);color:var(--ink-2);font-family:var(--sans);font-size:16px;line-height:1.6;margin:0}
.wrap{max-width:1080px;margin:0 auto;padding:0 28px 96px}
header.top{border-bottom:1px solid var(--rule);margin-bottom:56px;padding:56px 0 40px;display:grid;gap:28px;grid-template-columns:minmax(0,1fr) auto;align-items:end}
header.top .mark{width:132px;color:var(--ink-1)}
header.top .mark svg{width:100%;height:auto;display:block}
h1{font-family:var(--display);font-weight:600;font-size:clamp(30px,4.4vw,46px);line-height:1.05;letter-spacing:-.02em;color:var(--ink-1);margin:0 0 10px;text-wrap:balance}
.lede{font-size:18px;max-width:60ch;margin:0}
h2{font-family:var(--display);font-weight:600;font-size:24px;letter-spacing:-.01em;color:var(--ink-1);margin:64px 0 6px;text-wrap:balance}
h2 .n{font-family:var(--mono);font-weight:400;font-size:14px;color:var(--accent-text);margin-right:12px;letter-spacing:.06em}
h3{font-family:var(--display);font-weight:500;font-size:15px;text-transform:uppercase;letter-spacing:.1em;color:var(--ink-3);margin:36px 0 14px}
h3 .sub{text-transform:none;letter-spacing:0;font-family:var(--sans);font-weight:400;font-size:13px}
p{max-width:66ch}
section > p:first-of-type{margin-top:14px}
code,.mono{font-family:var(--mono);font-size:.88em}
a{color:var(--accent-text)}
.rulebox{border-left:2px solid var(--accent);padding:2px 0 2px 18px;margin:22px 0;color:var(--ink-1);font-size:17px;max-width:62ch}
.rulebox b{font-family:var(--mono);font-weight:500;font-size:.92em}

table{border-collapse:collapse;width:100%;font-size:14px;margin:18px 0}
th,td{text-align:left;padding:9px 24px 9px 0;border-bottom:1px solid var(--rule)}
td:last-child,th:last-child{padding-right:0}
th{font-family:var(--display);font-weight:500;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3)}
td.num,th.num{font-family:var(--mono);font-variant-numeric:tabular-nums;text-align:right}
.scroll{overflow-x:auto}

.diagram{width:100%;max-width:620px;height:auto;display:block;margin:8px 0 4px;color:var(--ink-1)}
.diagram text{font-family:var(--mono)}

.cuts{display:flex;flex-direction:column;gap:22px;margin:20px 0}
.cutrow{display:flex;align-items:flex-end;gap:26px;color:var(--ink-1)}
.cutname{font-family:var(--mono);font-size:12px;color:var(--ink-3);width:74px;flex:none}
.cutrow figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:7px}
.cutrow .glyph svg{width:100%;height:100%;display:block}
.cutrow figcaption{font-family:var(--mono);font-size:10px;color:var(--ink-3)}

.grid{display:grid;gap:18px;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));margin:20px 0}
/* A specimen field is the ground the artwork is for, not the ground the reader
   chose. These values are deliberately fixed rather than tokens: the navy
   lockups used to sit on var(--panel), which is dark in the dark set, so navy
   ink stood on nearly its own colour and what a reader judged was the tile.
   That is the same defect this brand's own gate found shipped in Hikaru. */
.spec{margin:0;background:${PAPER};border:1px solid ${PAPER_RULE};border-radius:3px;padding:22px 20px 14px;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:16px;justify-content:space-between}
.spec.dark{background:${NAVY};border-color:${NAVY}}
.spec.pink{background:${PINK};border-color:${PINK}}
.spec .art{display:flex;align-items:center;justify-content:center;min-height:var(--h);color:${NAVY}}
.spec.dark .art,.spec.pink .art{color:#fff}
.spec .art svg{max-width:100%;max-height:var(--h);height:auto;width:auto}
.spec figcaption{font-size:12px;color:${PAPER_INK};display:flex;flex-direction:column;gap:2px}
.spec.dark figcaption,.spec.pink figcaption{color:rgba(255,255,255,.72)}
.spec figcaption code{font-size:11px;opacity:.72;word-break:break-all}

.icons{display:flex;flex-wrap:wrap;gap:26px;align-items:flex-end;margin:20px 0}
.icon{margin:0;display:flex;flex-direction:column;gap:9px;align-items:center}
/* Same rule. A favicon is navy ink on nothing, so on this page's dark ground it
   was a smudge; the adaptive foreground is white ink and needs the opposite. */
.icon img{display:block;border-radius:2px;background:${PAPER};box-shadow:0 0 0 1px ${PAPER_RULE}}
.icon img.navy{background:${NAVY};box-shadow:none}
.icon figcaption{font-family:var(--mono);font-size:10px;color:var(--ink-3);text-align:center;display:flex;flex-direction:column}

.swatches{list-style:none;padding:0;margin:14px 0;display:grid;gap:1px;background:var(--rule);border:1px solid var(--rule);border-radius:3px;overflow:hidden}
.swatch{display:grid;grid-template-columns:44px 150px 96px 1fr;gap:14px;align-items:center;background:var(--panel);padding:9px 14px}
.swatches.tight .swatch{padding:5px 14px}
.chip{width:36px;height:22px;border-radius:2px;border:1px solid rgba(128,128,128,.35)}
.sname{font-family:var(--display);font-weight:500;font-size:13px;color:var(--ink-1)}
.shex{font-family:var(--mono);font-size:12px;color:var(--ink-3)}
.snote{display:flex;gap:10px;flex-wrap:wrap}
.ratio{font-family:var(--mono);font-size:11px;font-variant-numeric:tabular-nums;padding:1px 7px;border-radius:2px;background:var(--panel-2);color:var(--ink-3)}
.ratio.pass{color:var(--ok)}
.ratio.graphic{color:var(--warn)}
.ratio.fail{color:var(--bad)}

.accents{display:grid;gap:10px;margin:14px 0}
.accent{display:grid;grid-template-columns:74px repeat(3,1fr);gap:8px;align-items:stretch}
.aname{font-family:var(--mono);font-size:12px;color:var(--ink-3);align-self:center}
.astep{border-radius:2px;padding:9px 11px;font-family:var(--mono);font-size:10.5px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:1px}
.astep b{font-weight:500;font-size:11px}

.clearspace{background:var(--panel);border:1px solid var(--rule);border-radius:3px;padding:26px;margin:20px 0;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:16px;align-items:flex-start}
.clearspace svg{width:100%;max-width:520px;height:auto;display:block;color:var(--ink-1)}
.clearspace figcaption{font-family:var(--mono);font-size:12px;color:var(--ink-3)}

.before{display:grid;gap:18px;grid-template-columns:1fr 1fr;margin:20px 0}
.before figure{margin:0;background:var(--panel);border:1px solid var(--rule);border-radius:3px;padding:20px;display:flex;flex-direction:column;gap:14px;box-shadow:var(--shadow)}
.before .art{display:flex;align-items:center;justify-content:center;min-height:150px}
.before .art svg,.before .art img{max-width:100%;max-height:150px;height:auto;width:auto}
.before figcaption{font-family:var(--mono);font-size:11px;color:var(--ink-3)}
.before .tag{font-family:var(--display);font-weight:500;font-size:11px;letter-spacing:.1em;text-transform:uppercase}
.before .was .tag{color:var(--bad)}
.before .is .tag{color:var(--ok)}

footer{margin-top:80px;padding-top:24px;border-top:1px solid var(--rule);font-size:13px;color:var(--ink-3)}
@media (max-width:720px){
  header.top{grid-template-columns:1fr}
  .before{grid-template-columns:1fr}
  .swatch{grid-template-columns:36px 1fr;row-gap:4px}
  .shex,.snote{grid-column:2}
  .accent{grid-template-columns:1fr;gap:4px}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
<div class="wrap">
<header class="top">
  <div>
    <h1>WavingEye brand build</h1>
    <p class="lede">Eight integers, one font file, and a colour table. Every asset below is generated from those; none of them is drawn. Rebuild with <code>npm run check</code>.</p>
  </div>
  <div class="mark">${svgOf('dist/wavingeye/mark-current.svg')}</div>
</header>

<section>
<h2><span class="n">01</span>The mark on its grid</h2>
<p>Every dimension of the mark is a whole number of ninths of one outer stroke width. That is not a rule imposed on the original drawing; it is what the original drawing already was, to within 3.2% on every measurement.</p>
${gridDiagram()}
<div class="scroll"><table>
<thead><tr><th>Dimension</th><th class="num">Ninths</th><th>What it is</th></tr></thead>
<tbody>
<tr><td>stroke</td><td class="num">${geo('stroke')}</td><td>outer stroke width, the unit for everything else</td></tr>
<tr><td>middle</td><td class="num">${geo('middle')}</td><td>middle stroke, one ninth narrower than the outer</td></tr>
<tr><td>gap</td><td class="num">${geo('gap')}</td><td>counter, now equal to the cut</td></tr>
<tr><td>cut</td><td class="num">${geo('cut')}</td><td>vertical drop of every angled edge</td></tr>
<tr><td>bar</td><td class="num">${geo('bar')}</td><td>base bar thickness, equal to the middle stroke</td></tr>
<tr><td>barTop</td><td class="num">${geo('barTop')}</td><td>bar's top edge at the right of the mark</td></tr>
<tr><td>middleTop</td><td class="num">${geo('middleTop')}</td><td>middle stroke's top at its right edge</td></tr>
<tr><td>height</td><td class="num">${geo('height')}</td><td>and the width, so the mark is square</td></tr>
</tbody></table></div>
<div class="rulebox">The cut is a <b>constant drop</b> of three ninths, not a constant angle. That is why the base bar leans 5.36&deg; while the strokes lean 18.43&deg;, and it is what makes the mark work.</div>
</section>

<section>
<h2><span class="n">02</span>Two cuts</h2>
<p>Below 48&nbsp;px the standard counters fall to one fully-clear pixel and the mark closes into a block. The small cut widens the counter from three ninths to five, which costs the square bounding box and buys a favicon. <code>gates/check-legibility.mjs</code> renders both at 16, 20, 24 and 32&nbsp;px and fails the build if the narrowest counter drops under two clear pixels.</p>
${cutComparison()}
</section>

<section>
<h2><span class="n">03</span>Lockups</h2>
<p>Artwork to type is one cap height everywhere. The two original lockups used 0.98 and 0.86 cap heights for the same relationship, which is what happens when the number lives in a hand rather than in a file. Cap height is nine ninths, so a capital letter is exactly one stroke width tall.</p>
<div class="grid">
${specimen('WavingEye, split', 'wavingeye/lockup-split-navy.svg', { h: 78 })}
${specimen('WavingEye, horizontal', 'wavingeye/lockup-horizontal-navy.svg', { h: 60 })}
${specimen('WavingEye, stacked', 'wavingeye/lockup-stacked-navy.svg', { h: 110 })}
${specimen('WavingEye, reversed', 'wavingeye/lockup-split-white.svg', { on: 'dark', h: 78 })}
${specimen('Hikaru, boxed', 'hikaru/boxed-lockup-white-on-navy.svg', { h: 84 })}
${specimen('Hikaru, horizontal', 'hikaru/lockup-horizontal-navy.svg', { h: 60 })}
${specimen('Mark, outline', 'wavingeye/mark-outline-navy.svg', { h: 110 })}
${specimen('Mark on pink', 'wavingeye/boxed-icon-white-on-pink.svg', { h: 110 })}
</div>
</section>

<section>
<h2><span class="n">04</span>Clear space</h2>
<p>One stroke width on every side, measured from the ink rather than from the file's edge. Every distributable file is cropped tight to its artwork, so the clear space is the consumer's to leave and cannot be faked by padding inside the asset.</p>
<figure class="clearspace">${clearSpaceDiagram()}<figcaption>clear space = 9 ninths = one outer stroke width</figcaption></figure>
</section>

<section>
<h2><span class="n">05</span>Colour</h2>
<p>Ratios are WCAG 2.2. Green passes 4.5:1 and can carry text; amber passes 3:1 and is legal for a graphic only; red fails both. The brand pink is 3.87:1 on white, which is why the pink icon ships and pink never carries white text.</p>
${palette()}
<div class="rulebox">The original secondary <b>#ff005c</b> is dropped. Its lightness matches the brand pink to 0.001 and its hue sits 14.6&deg; away, so at any real size the two are the same colour. Danger moved to hue 25 instead.</div>
</section>

<section>
<h2><span class="n">06</span>Platform icons</h2>
<p>Shown at true pixel size. Padding is a per-target number rather than a constant, because the platforms disagree: an Android adaptive layer keeps only its inner 72 of 108&nbsp;dp after a circular mask, a maskable icon its inner 80%, and a favicon is not masked at all. <code>gates/check-safe-zones.mjs</code> measures the shipped PNG rather than the intent.</p>
<div class="icons">
${pngSpecimen('favicon', 'wavingeye/favicon-16.png', 16)}
${pngSpecimen('favicon', 'wavingeye/favicon-32.png', 32)}
${pngSpecimen('favicon', 'wavingeye/favicon-48.png', 48)}
${pngSpecimen('apple touch', 'wavingeye/apple-touch-icon-180.png', 90)}
${pngSpecimen('android', 'wavingeye/android-192.png', 96)}
${pngSpecimen('maskable', 'wavingeye/maskable-512.png', 96)}
${pngSpecimen('adaptive fg', 'wavingeye/android-adaptive-foreground-432.png', 96, { on: 'navy' })}
${pngSpecimen('app store', 'wavingeye/app-store-1024.png', 128)}
</div>
</section>

<section>
<h2><span class="n">07</span>What moved</h2>
<p>The mark was rationalised onto the grid, and every change is under 3.2%. The wordmark is unchanged: it is Montserrat Medium at +0.05&nbsp;em, now set from the font file rather than stored as outlines, and it reproduces the original to within 0.07%.</p>
<div class="scroll"><table>
<thead><tr><th>Dimension</th><th class="num">Original</th><th class="num">Now</th><th class="num">Change</th></tr></thead>
<tbody>${CHANGES.map(([a, b, c, d]) => `<tr><td>${a}</td><td class="num">${b}</td><td class="num">${c}</td><td class="num">${d}</td></tr>`).join('')}</tbody>
</table></div>
<div class="before">
  <figure class="was"><span class="tag">was</span><div class="art">${svgOf('init/WE_LogoV2_Icon_Outline.svg')}</div><figcaption>Stroked paths with an opaque #ef2f88 rectangle covering the overlaps. Works on that one pink and nothing else, and the patch leaves a seam.</figcaption></figure>
  <figure class="is"><span class="tag">now</span><div class="art">${svgOf('dist/wavingeye/mark-outline-pink.svg')}</div><figcaption>One closed path with an even-odd hole. No background, no patch, recolourable with <code>currentColor</code>.</figcaption></figure>
</div>
</section>

<footer>
Generated by <code>src/docs.mjs</code> from <code>brand/tokens/</code> and <code>brand/products/</code>.
Montserrat is used under the SIL Open Font License 1.1.
</footer>
</div>`;
}

/** The clear-space rule, drawn: one stroke width around the ink. */
function clearSpaceDiagram() {
  const piece = mark({});
  const u = 12;
  const pad = STANDARD.stroke;
  const w = piece.width;
  const h = piece.height;
  const W = (w + pad * 2) * u;
  const H = (h + pad * 2) * u;
  const band = `M0 0 H${W} V${H} H0 Z M${pad * u} ${pad * u} V${(h + pad) * u} H${(w + pad) * u} V${pad * u} Z`;
  const dim = (x, y, len) =>
    `<g stroke="var(--accent)" stroke-width="1.2">
       <line x1="${x * u}" y1="${y * u}" x2="${(x + len) * u}" y2="${y * u}"/>
       <line x1="${x * u}" y1="${(y - 1.6) * u}" x2="${x * u}" y2="${(y + 1.6) * u}"/>
       <line x1="${(x + len) * u}" y1="${(y - 1.6) * u}" x2="${(x + len) * u}" y2="${(y + 1.6) * u}"/>
     </g>
     <text x="${(x + len / 2) * u}" y="${(y - 3) * u}" font-size="15" font-family="var(--mono)" fill="var(--accent)" text-anchor="middle">9</text>`;
  return `<svg viewBox="-8 -30 ${W + 16} ${H + 38}" role="img" aria-label="Clear space is one outer stroke width on every side">
    <path d="${band}" fill="var(--accent)" fill-opacity="0.10" fill-rule="evenodd"/>
    <rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="var(--rule)" stroke-width="1.2" stroke-dasharray="6 5"/>
    <g transform="translate(${pad * u} ${pad * u}) scale(${u})">${piece.body({ ink: 'currentColor' })}</g>
    ${dim(0, pad / 2, pad)}
    ${dim(w + pad, pad / 2, pad)}
  </svg>`;
}

mkdirSync(join(root, 'docs'), { recursive: true });
writeFileSync(join(root, 'docs/index.html'), page());
console.log('docs/index.html');
