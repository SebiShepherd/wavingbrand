# we_logo

The WavingEye brand as parameters and a build. Eight integers, one font file and
a colour table produce every asset; nothing in `dist/` is drawn.

```
npm ci
npm run check      # tokens, build, guidelines, gates
npm run baselines  # re-render baselines/. Doing this is how a change is approved.
```

## What is here

| Path              | What it holds |
| ----------------- | ------------- |
| `brand/tokens/`   | colour, geometry and typography as W3C DTCG tokens |
| `brand/products/` | one file per product: its name, its lockups, its targets |
| `brand/consumers/`| one file per product that renders the mark: its surfaces, as a contract |
| `brand/stationery/`| what goes on the card and the letterhead. Placeholders until you replace them |
| `brand/fonts/`    | Montserrat and its OFL licence |
| `src/`            | the generator: parameters to SVG to platform targets |
| `gates/`          | the rules as builds, run in CI |
| `tools/`          | `tokens.mjs` solves the palette; `theme.mjs` solves a product's; `baselines.mjs` re-renders; `validate.mjs` is the check a consumer runs |
| `brand/themes/`   | a product's four hues, as input to the theme solver |
| `baselines/`      | one deterministic render of every asset, the reviewable record of a change |
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

There are two token layers and they are not the same kind of thing.

**`tokens/brand.css` is the identity.** Six values, no theme switching,
mandatory. Map them into your own tokens under whatever theme strategy you
already have:

```css
@import '@wavingeye/brand/tokens/brand.css';

:root { --my-logo: var(--we-brand-navy); }
.dark { --my-logo: var(--we-brand-white); }
```

**`tokens/theme.css` is a whole palette**, surfaces and inks and neutrals, for a
project that has no theme of its own. It is optional, and a product with a
designer will not want it. The brand does not get to overwrite a product's
visual decisions.

What the brand asks instead is one rule, checked rather than asserted: the mark
must be visible wherever you render it, and your accent must not be mistakable
for the brand pink. Declare your surfaces and run the check in your own CI,
against your live values:

```
node node_modules/@wavingeye/brand/tools/validate.mjs brand.surfaces.json
```

```json
{
  "product": "hikaru",
  "themes": {
    "dark": {
      "surfaces": { "bg": "#14151a", "surface": "#1b1d23" },
      "box": "#101554", "logo": "#ffffff", "accent": "#7e9cff"
    }
  }
}
```

That declaration is what found the live defect in Hikaru: a navy tile at 1.01:1
against its dark surface, so the sidebar mark had no container in dark mode.

An `<img>` cannot inherit `currentColor`. To make the mark follow a theme,
inline it from `dist/<product>/paths.json`:

```jsx
const { mark } = await import('@wavingeye/brand/hikaru/paths.json');
<svg viewBox={mark.viewBox} className="text-[--my-logo]">
  <path d={mark.d} fill="currentColor" fillRule={mark.fillRule} />
</svg>
```

For plain JavaScript, `dist/tokens/color.js` exports every value with types
beside it.

Favicons and the web manifest are generated per product. Copy
`dist/<product>/` to the site root and paste `dist/<product>/head.html`:

```html
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon-180.png">
<link rel="manifest" href="/site.webmanifest">
```

The SVG favicon follows the reader's theme on its own, which a PNG cannot.

## Themes for other products

The brand does not hand a product a palette. What it shares is
`brand/tokens/vocabulary.json`: twenty-two token names, the lightness ladder
that gives a theme its shape, and the contrast floor each name must clear. A
product supplies four hues and two chroma ceilings, and `tools/theme.mjs` solves
the rest:

```
node tools/theme.mjs brand/themes/paper.json > theme.css
```

Every value is checked against its floor before it is printed, and a role whose
floor cannot be met at the preferred lightness is moved until it can. So a theme
that comes out of that command cannot ship a 3:1 label.

`brand/themes/paper.json` is Hikaru's theme expressed as its four hues, kept as
the worked example because it is the one the vocabulary was learned from.

## Print

`dist/print/` is vector and DeviceCMYK throughout, written directly rather than
converted, because no SVG-to-PDF converter emits CMYK and CMYK is the only
reason a printer gets a PDF instead of an SVG. Type is outlined, so no font is
embedded and no RIP needs Montserrat.

**The builds are not proofed.** They live in `brand/tokens/print.json`, seeded
from a naive sRGB conversion, and the pink is the one most likely to be wrong:
`#EF2F88` is outside CMYK gamut and will come back duller and warmer whatever
the build. Order a proof, replace the four numbers, rebuild. Nothing else moves.

`brand/stationery/card.json` holds the card and letterhead copy. Its values are
deliberately unusable, so a placeholder cannot reach paper by looking plausible.

## The gates

Each one exists because of a defect in the original artwork.

| Gate | What it catches |
| ---- | --------------- |
| `check-geometry` | a path that no longer matches `brand/tokens/geometry.json` |
| `check-contrast` | any shipped pair under 3:1 |
| `check-theme-roles` | an ink that fails on a surface it can land on, in either theme |
| `check-consumers` | a change to the brand that breaks a product declared in `brand/consumers/` |
| `check-legibility` | counters that close up below 48 px |
| `check-safe-zones` | ink outside an Android or maskable crop, measured on the shipped PNG |
| `check-tight-bounds` | dead space, opaque backgrounds, colliding ids, fixed widths |
| `check-baselines` | a change that keeps every ratio valid and still draws something else |
| `check-print` | a missing CMYK build, or a print file that carries RGB |
| `check-vocabulary` | a lightness ladder that cannot be solved into a compliant theme |
| `check-workflows` | a workflow that does not parse, so no gate runs at all |
| `check-dist-clean` | a file in `dist/` edited by hand |

## kagami

`kagami.config.mjs` declares this repository to
[kagami](https://github.com/SebiShepherd/kagami), which is the operating model
the work follows. Most of kagami does not apply: there is no product to walk, no
personas, no accounts and no API whose data could confirm a task happened. A
brand repository has one user and they are looking at pictures.

What applies is the grading and the visual layer. `surfaces` says what a change
can move, so a change to `src/print.mjs` does not owe a run of the favicons, and
`visual` points kagami at `gates/check-baselines.mjs`.

That last part needed a change on kagami's side. Its "we compared" signatures
were Playwright's, hard-coded, and this repository's comparator is not
Playwright: no browser, resvg renders, its own pixel diff. `visual.comparedPatterns`
exists because of that, and the three patterns here are the three states the
gate reports.

Running the harness itself needs kagami pinned as a dependency, which is not
done: it would need the same cross-repository credential the vendoring check
needs. The config is correct and unused until then.

## Releasing

A tag builds its own release: it rebuilds `dist/`, refuses if the rebuild
differs from what is committed, and publishes the kit zip. Either route works:

```
git tag -a v0.1.0 -m "..." && git push origin v0.1.0
```

or draft a release in the web UI and let it create the tag.

The zip is what to hand somebody who is not going to clone a repository: every
asset, the tokens, the font and its licence, and the documents.

## What is still open

The backlog lives on the repository rather than in a conversation.

| | What | Blocked on |
| - | ---- | ---------- |
| [#1](https://github.com/SebiShepherd/we_logo/issues/1) | Proof the CMYK builds, then decide on a spot colour | a printed proof |
| [#2](https://github.com/SebiShepherd/we_logo/issues/2) | Nothing checks a consumer's vendored copy is current | a read credential |
| [#3](https://github.com/SebiShepherd/we_logo/issues/3) | Publish the guidelines somewhere with a durable URL | repository settings |
| [#4](https://github.com/SebiShepherd/we_logo/issues/4) | The theme solver is weakest on semantic hues | a second product |
| [#5](https://github.com/SebiShepherd/we_logo/issues/5) | Two judgement calls settled by arithmetic, never looked at | an eye |
| [#6](https://github.com/SebiShepherd/we_logo/issues/6) | The licence wording is placeholder drafting | a decision |

In Hikaru: [#591](https://github.com/SebiShepherd/hikaru/issues/591) the mark's
tile in dark mode, fixed; [#592](https://github.com/SebiShepherd/hikaru/issues/592)
`--color-subtle` at 3.04:1 across 192 usages, filed rather than pushed.

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
