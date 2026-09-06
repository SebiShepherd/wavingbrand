# wavingbrand

The WavingEye brand as parameters and a build. Eight integers, one font file and
a colour table produce every asset; nothing in `dist/` is drawn.

```
npm ci
npm run check      # tokens, build, guidelines, gates
npm run baselines  # re-render baselines/. Doing this is how a change is approved.
```

## What is here

| Path                | What it holds                                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `brand/tokens/`     | colour, geometry and typography as W3C DTCG tokens                                                                                       |
| `brand/products/`   | one file per product: its name, its lockups, its targets                                                                                 |
| `brand/consumers/`  | one file per product that renders the mark: its surfaces, as a contract                                                                  |
| `brand/stationery/` | what goes on the card and the letterhead. Placeholders until you replace them                                                            |
| `brand/fonts/`      | Montserrat and its OFL licence                                                                                                           |
| `src/`              | the generator: parameters to SVG to platform targets                                                                                     |
| `gates/`            | the rules as builds, run in CI                                                                                                           |
| `tools/`            | `tokens.mjs` solves the palette; `theme.mjs` solves a product's; `baselines.mjs` re-renders; `validate.mjs` and `check-vendored.mjs` are the checks a consumer runs |
| `brand/themes/`     | a product's four hues, as input to the theme solver                                                                                      |
| `baselines/`        | one deterministic render of every asset, the reviewable record of a change                                                               |
| `dist/`             | generated. Editing anything here fails `gates/check-dist-clean.mjs`                                                                      |
| `docs/`             | the audit, the proposal, the decisions, and a generated guidelines page, published by `pages.yml`                                        |
| `init/`             | the original artwork, kept untouched as the reference                                                                                    |

## Adding a product

One file in `brand/products/`, then `npm run check`:

```json
{
  "name": "hikaru",
  "title": "Hikaru",
  "wordmark": "HIKARU",
  "forms": ["mark", "boxed-icon", "boxed-lockup", "lockup-horizontal"],
  "targets": [
    "favicon",
    "apple-touch",
    "android",
    "maskable",
    "app-store",
    "og"
  ]
}
```

That produces every legal colourway of every named form, every platform icon at
its own padding, an ICO, a theme-aware SVG favicon, an Open Graph card and a
manifest entry.

## Consuming it from another project

The repository is public, so the assets are fetchable without a credential.
Fetchable is not licensed: see `NOTICE`.

**From a CDN**, pinned to a tag rather than to a branch, so a rebuild cannot
change what your page renders:

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/SebiShepherd/wavingbrand@v0.1.0/dist/tokens/brand.css"
/>
<img
  src="https://cdn.jsdelivr.net/gh/SebiShepherd/wavingbrand@v0.1.0/dist/wavingeye/lockup-horizontal-navy.svg"
/>
```

**As a dependency**, when you want the whole set and a version you control:

```
npm i github:SebiShepherd/wavingbrand#v0.1.0
```

**As a zip**, for a printer or an agency: the kit on each
[Release](https://github.com/SebiShepherd/wavingbrand/releases).

### Keeping a vendored copy current

Copying `dist/` into your own repository is the fourth option and the one most
projects end up on, because a build should not reach the network. The cost is
that the copy drifts silently, and "is our logo the current one" gets answered by
somebody remembering.

`dist/manifest.json` carries a SHA-256 for every file and the version it was
built from, so a copy is self-describing and one request settles the question for
all of it. Vendor the manifest alongside the assets and copy
[`tools/check-vendored.mjs`](tools/check-vendored.mjs) into your repository; it
has no dependencies beyond Node, because a check that needs an install step is a
check somebody skips.

```
node check-vendored.mjs public/brand
  ok   141 vendored files match SebiShepherd/wavingbrand@v0.1.0

node check-vendored.mjs public/brand --ref main   # against the tip instead
```

Consumers rename and flatten, so the check does not assume your layout matches
`dist/`. A `vendored.json` beside the files says where the copy came from and what
each local name maps to upstream:

```json
{
  "ref": "v0.1.0",
  "local": ["SOURCE.md"],
  "files": {
    "favicon-32.png": "hikaru/favicon-32.png",
    "wavingeye-icon.svg": "wavingeye/boxed-icon-white-on-navy.svg"
  }
}
```

`ref` may be a tag or a commit; a commit needs no release behind it. Without a
`vendored.json` the check falls back to a vendored `manifest.json` for the version
and treats your filenames as upstream paths. Pinning to a release or a commit is
the default on purpose: a check that goes red because somebody else pushed is a
check people learn to ignore.

### The two token layers

They are not the same kind of thing.

**`tokens/brand.css` is the identity.** Six values, no theme switching,
mandatory. Map them into your own tokens under whatever theme strategy you
already have:

```css
@import "https://cdn.jsdelivr.net/gh/SebiShepherd/wavingbrand@v0.1.0/dist/tokens/brand.css";

:root {
  --my-logo: var(--we-brand-navy);
}
.dark {
  --my-logo: var(--we-brand-white);
}
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
      "box": "#101554",
      "logo": "#ffffff",
      "accent": "#7e9cff"
    }
  }
}
```

That declaration is what found the live defect in Hikaru: a navy tile at 1.01:1
against its dark surface, so the sidebar mark had no luminance edge in dark mode.

An `<img>` cannot inherit `currentColor`. To make the mark follow a theme,
inline it from `dist/<product>/paths.json`:

```jsx
const { mark } = await import("@wavingeye/brand/hikaru/paths.json");
<svg viewBox={mark.viewBox} className="text-[--my-logo]">
  <path d={mark.d} fill="currentColor" fillRule={mark.fillRule} />
</svg>;
```

For plain JavaScript, `dist/tokens/color.js` exports every value with types
beside it.

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

| Gate                 | What it catches                                                            |
| -------------------- | -------------------------------------------------------------------------- |
| `check-geometry`     | a path that no longer matches `brand/tokens/geometry.json`                 |
| `check-contrast`     | any shipped pair under 3:1                                                 |
| `check-theme-roles`  | an ink that fails on a surface it can land on, in either theme             |
| `check-consumers`    | a change to the brand that breaks a product declared in `brand/consumers/` |
| `check-legibility`   | counters that close up at small sizes                                      |
| `check-cuts`         | an artefact drawn with the wrong cut for its role                          |
| `check-manifest`     | a manifest whose hashes, file list or digest disagree with its own dist/    |
| `check-provenance`   | a tuned number with no recorded origin, or one that moved without a new one |
| `check-safe-zones`   | ink outside an Android or maskable crop, measured on the shipped PNG       |
| `check-tight-bounds` | dead space, opaque backgrounds, colliding ids, fixed widths                |
| `check-baselines`    | a change that keeps every ratio valid and still draws something else       |
| `check-print`        | a missing CMYK build, or a print file that carries RGB                     |
| `check-vocabulary`   | a lightness ladder that cannot be solved into a compliant theme            |
| `check-workflows`    | a workflow that does not parse, so no gate runs at all                     |
| `check-dist-clean`   | a file in `dist/` edited by hand                                           |

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
done: kagami is private and consumed over `git+ssh`, so a public repository
would need a deploy key in its secrets to install it. The config is correct and
unused until then, and calling this repository "wired to kagami" overstates it.

One of kagami's gates was worth having anyway, so its rule is implemented here
rather than imported. `check-research` refuses a change to a normative file that
cites nothing. `gates/check-provenance.mjs` is the same idea aimed at the thing
that actually went wrong twice in this repository: a number that is picked, and
then grows a reason underneath it that reads like a finding. `OPTICAL` carried
"the eye does not weigh area linearly" and `STACK_RATIO` carried "the eye
compares widths"; neither was measured, neither was cited, and both sat in
shipped code looking exactly like the parts that are derived.

A gate cannot decide whether a claim is true. This one refuses a number that
claims nothing, and it records the value beside the answer, so moving the number
fails until somebody says where the new one came from.

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

|                                                        | What                                                       | Blocked on                                                             |
| ------------------------------------------------------ | ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| [#1](https://github.com/SebiShepherd/wavingbrand/issues/1) | Proof the CMYK builds, then decide on a spot colour        | a printed proof                                                        |
| [#2](https://github.com/SebiShepherd/wavingbrand/issues/2) | Nothing checks a consumer's vendored copy is current       | nothing; the repository is public, so a consumer can fetch and compare |
| [#4](https://github.com/SebiShepherd/wavingbrand/issues/4) | The theme solver is weakest on semantic hues               | a second product                                                       |
| [#5](https://github.com/SebiShepherd/wavingbrand/issues/5) | Two judgement calls settled by arithmetic, never looked at | an eye                                                                 |
| [#6](https://github.com/SebiShepherd/wavingbrand/issues/6) | The licence wording is placeholder drafting                | a decision                                                             |

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
  parameters as the assets, published at
  <https://sebishepherd.github.io/wavingbrand/>. `pages.yml` regenerates the page
  and refuses to deploy if the regeneration disagrees with what is committed, so
  the published page and the build it documents cannot drift apart.

## Licensing

Three things, three terms, and the split is the point. `NOTICE` states it in
full.

|                                                   |                                                         |
| ------------------------------------------------- | ------------------------------------------------------- |
| `src/`, `gates/`, `tools/`, the workflows         | Apache-2.0 (`LICENSE`)                                  |
| `dist/`, `init/`, `baselines/`, the colour values | the WavingEye identity. A trademark, licensed to nobody |
| `brand/fonts/Montserrat[wght].ttf`                | SIL Open Font License 1.1                               |

Apache-2.0 rather than MIT for section 6, which says in the licence itself that
it grants no trademark rights. Being able to fetch a mark is not permission to
use it; the files are public so WavingEye's own projects can install them
without a credential and so anybody working with WavingEye can be handed a URL.
