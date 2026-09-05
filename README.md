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

## The gates

Each one exists because of a defect in the original artwork.

| Gate | What it catches |
| ---- | --------------- |
| `check-geometry` | a path that no longer matches `brand/tokens/geometry.json` |
| `check-contrast` | any shipped pair under 3:1 |
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
