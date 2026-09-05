# we_logo

The WavingEye brand as parameters and a build. Eight integers, one font file and
a colour table produce every asset; nothing in `dist/` is drawn.

```
npm ci
npm run check      # tokens, build, guidelines, gates
```

## What is here

| Path              | What it holds |
| ----------------- | ------------- |
| `brand/tokens/`   | colour, geometry and typography as W3C DTCG tokens |
| `brand/products/` | one file per product: its name, its lockups, its targets |
| `brand/fonts/`    | Montserrat and its OFL licence |
| `src/`            | the generator: parameters to SVG to platform targets |
| `gates/`          | the rules as builds, run in CI |
| `tools/`          | `tokens.mjs`, which solves the palette rather than picking it |
| `dist/`           | generated. Editing anything here fails `gates/check-dist-clean.mjs` |
| `docs/`           | the audit, the proposal, the decisions, and a generated guidelines page |
| `init/`           | the original artwork, kept untouched as the reference |

## Adding a product

One file in `brand/products/`, then `npm run check`:

```json
{
  "name": "hikaru",
  "title": "Hikaru",
  "wordmark": "HIKARU",
  "forms": ["mark", "boxed-icon", "boxed-lockup", "lockup-horizontal"],
  "targets": ["favicon", "apple-touch", "android", "maskable", "app-store", "og"]
}
```

That produces every legal colourway of every named form, every platform icon at
its own padding, an ICO, a theme-aware SVG favicon, an Open Graph card and a
manifest entry.

## Consuming it from another project

The repository is private, so install from git rather than from npm:

```
npm i git+ssh://git@github.com:SebiShepherd/we_logo.git#v0.1.0
```

Then style against roles rather than against shades. `dist/tokens/color.css`
ships the whole scale plus sixteen roles that already resolve per theme, in the
three-state shape a theme actually has (explicit choice, OS preference, and the
common case of neither):

```css
@import '@wavingeye/brand/tokens/color.css';

body { background: var(--we-surface); color: var(--we-ink); }
a     { color: var(--we-accent-text); }
.logo { color: var(--we-logo); }        /* navy on light, white on dark */
```

The mark takes `currentColor`, so `.logo` above colours it:

```html
<img src="@wavingeye/brand/wavingeye/lockup-horizontal-current.svg">
```

For JavaScript, `dist/tokens/color.js` exports the same values with types
beside them:

```js
import { color, theme } from '@wavingeye/brand/tokens/color.js';
theme.dark.logo; // '#ffffff'
```

Favicons and the web manifest are generated per product. Copy
`dist/<product>/` to the site root and paste `dist/<product>/head.html`:

```html
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon-180.png">
<link rel="manifest" href="/site.webmanifest">
```

The SVG favicon follows the reader's theme on its own, which a PNG cannot.

## The gates

Each one exists because of a defect in the original artwork.

| Gate | What it catches |
| ---- | --------------- |
| `check-geometry` | a path that no longer matches `brand/tokens/geometry.json` |
| `check-contrast` | any shipped pair under 3:1 |
| `check-theme-roles` | an ink that fails on a surface it can land on, in either theme |
| `check-legibility` | counters that close up below 48 px |
| `check-safe-zones` | ink outside an Android or maskable crop, measured on the shipped PNG |
| `check-tight-bounds` | dead space, opaque backgrounds, colliding ids, fixed widths |
| `check-dist-clean` | a file in `dist/` edited by hand |

## Documents

- [`docs/asset-audit.md`](docs/asset-audit.md): every measurement taken from the
  original files, eleven defects, and the typeface identification.
- [`docs/brand-system-proposal.md`](docs/brand-system-proposal.md): what the
  industry uses, what does not exist, and the architecture.
- [`docs/decisions.md`](docs/decisions.md): the eight calls that were made, what
  each one costs, and the one still open.
- [`docs/index.html`](docs/index.html): the guidelines, generated from the same
  parameters as the assets.

## Licensing

The build code and the brand assets are separate things. `src/`, `gates/` and
`tools/` are ordinary code. The marks in `dist/` and `init/` are a trademark and
are not licensed by this repository to anybody. Montserrat is used under the SIL
Open Font License 1.1, whose text is in `brand/fonts/OFL.txt`.
