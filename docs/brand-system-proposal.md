# A brand system that builds itself

## What you asked

One repository that owns the logo, its parameters, its variants and its
distribution, so that a new product or a new colourway is a command rather than
an afternoon in Canva, and so that every project can consume the result.

The short answer: the idea is sound, the pieces all exist as open tooling, and
nobody sells the assembled thing. What follows is what exists, what does not,
and what to build.

## 1. What the industry actually uses

### 1.1 Tokens: solved, standardised, use it

Colour, spacing and type belong in a data file, not in an image. The standard
exists and stabilised recently: the W3C Design Tokens Community Group format
reached its first stable release (version 2025.10) in October 2025, backed by
Adobe, Figma, Google, Microsoft, Shopify and Salesforce
([DTCG announcement](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)).

- [Style Dictionary](https://styledictionary.com/info/dtcg/) v4 reads that
  format natively and compiles it to CSS custom properties, SCSS, JS, iOS,
  Android, or anything you write a formatter for.
- [Terrazzo](https://terrazzo.app/) is the same job with a different compiler.
- Penpot, Figma, Sketch, Framer, Tokens Studio, Supernova and zeroheight all
  read or write the same file.

**Take it.** Your palette becomes `tokens/color.json`, and every consumer gets
CSS variables generated from it. This part is a solved problem and you should
not invent anything here.

### 1.2 Vector build: no standard tool, assemble from parts

There is no "logo compiler". What exists are good, boring, deterministic
components:

| Job                        | Tool                                      | Why |
| -------------------------- | ----------------------------------------- | --- |
| Normalise and shrink SVG   | [SVGO](https://github.com/svg/svgo)       | strips the Canva clip-path debris |
| SVG to PNG                 | [resvg-js](https://github.com/thx/resvg-js) | Rust, no browser, byte-identical output across machines |
| Raster resize and compose  | [sharp](https://sharp.pixelplumbing.com/) | fast, libvips |
| PNG optimisation           | oxipng / pngquant                          | |
| PDF and EPS for print      | `rsvg-convert` or Inkscape CLI             | |
| Wordmark from a font file  | [fontkit](https://github.com/foliojs/fontkit) or opentype.js | converts glyphs to outlines at build time |

The determinism matters more than it looks. A headless-Chrome renderer produces
slightly different pixels on different machines, which makes a pixel-comparison
gate useless. resvg does not. Porsche run their visual regression in Docker for
the same reason
([Porsche Design System](https://github.com/porsche-design-system/porsche-design-system)).

### 1.3 Platform icon sets: partly solved

[pwa-asset-generator](https://github.com/elegantapp/pwa-asset-generator) and
[@vite-pwa/assets-generator](https://vite-pwa-org.netlify.app/assets-generator/)
generate favicons, Apple touch icons, maskable icons, splash screens and the
manifest entries from one source image. They solve the mechanical half. They do
not solve the part that matters here, which is that each target wants a
different amount of padding and, below 48 px, a different drawing. See
`asset-audit.md` section 6.

The constraints these tools encode, which your build has to respect:

| Target                    | Rule                                                    |
| ------------------------- | ------------------------------------------------------- |
| Android adaptive icon     | 108 dp layer, only the inner 72 dp circle survives masking |
| PWA maskable icon         | content inside the inner 80%                             |
| iOS / App Store           | 1024 px, flattened, no alpha, superellipse crop          |
| Google Play listing       | 512 px                                                   |
| Favicon                   | SVG plus a 32 px ICO fallback                            |

### 1.4 Distribution: npm plus a CDN is the norm

The established pattern is an npm package of assets, mirrored to a CDN, with
semantic versioning. Real examples to copy from:

- [`@porsche-design-system/assets`](https://www.jsdelivr.com/package/npm/@porsche-design-system/assets),
  which ships fonts, icons and the marque with a manifest of CDN URLs.
- [`@undp/design-system-assets`](https://www.jsdelivr.com/package/npm/@undp/design-system-assets)
- [`@lunit/design-system-logo`](https://www.jsdelivr.com/package/npm/@lunit/design-system-logo)

Porsche is the closest public analogue to what you want, including the licensing
split: the code is Apache-2.0 and the brand assets sit under a separate asset
licence. Copy that split. A logo is a trademark and must not be MIT-licensed
along with the build scripts.

For consumers who are not JavaScript projects, the same `dist/` on jsDelivr via
a git tag covers direct URL use, and a GitHub Release zip covers printers and
anyone who wants files.

### 1.5 Brand portals: all commercial, and you do not need one

Frontify, Brandfolder, Bynder, Canto and Marq are the category. All SaaS, all
priced for teams with marketers, and the search turned up no open-source
equivalent. For a one-person company the substitute is a static guidelines site
generated from the repo and published to GitHub Pages, which is what the portal
would have given you minus the seat licences and the upload step.

### 1.6 Design tool: keep one, demote it

If code is the source of truth, the design tool becomes a viewer and a sketchpad.
[Penpot](https://penpot.app/) is the sane pairing: MPL-2.0, self-hostable, stores
work as SVG and JSON rather than a proprietary blob, and exports DTCG tokens
natively. Figma is fine too if you already know it. The rule is that neither one
is where the logo lives.

### 1.7 Parametric marks: prior art exists, no product does

Generating a logo's variants from parameters is done with a template plus a
script. There is no package for it, because every mark's parameters are
different. Your mark is four quadrilaterals and a rectangle determined by six
numbers (`asset-audit.md` section 1), which is about as tractable as this gets.

### 1.8 Verdict

Every component exists and is free. The assembly does not exist as a product,
and building it for one brand is a few hundred lines. The reason nobody sells it
is that the parameterisation is brand-specific, which in your case is the easy
part because the mark is already geometric.

## 2. Proposed architecture

### 2.1 The principle

**The source of truth is the parameters, not the files.** `dist/` is a build
output. If somebody edits an SVG in `dist/` by hand, the next build overwrites
it and CI says so. That single rule is what stops the drift you had in Canva.

### 2.2 Layout

```
we_logo/
  brand/
    tokens/
      color.json            # DTCG: navy, pink, neutrals, dark-mode substitutes
      typography.json       # Montserrat 500, tracking, cap-height rules
      geometry.json         # s, middle_width, bar, gap, cut_offset, clearspace
    marks/
      wavingeye.mark.json   # the six numbers plus the small-size cut
    products/
      wavingeye.json        # wordmark "WAVING EYE", split lockup, navy accent
      hikaru.json           # wordmark "HIKARU", boxed lockup, navy box
    fonts/
      Montserrat[wght].ttf + OFL.txt
  src/
    mark.mjs                # parameters  -> path data
    wordmark.mjs            # string + font -> outlines
    lockup.mjs              # mark + wordmark + spacing rule -> SVG
    targets/                # favicon, ios, android, maskable, og, print, email
    build.mjs
  gates/                    # the checks, as builds
  dist/                     # generated, committed on release, never edited
  baselines/                # approved renders for pixel comparison
  docs/                     # guidelines site, generated
```

### 2.3 The variant matrix

A variant is a point in this space, and the build enumerates it:

| Axis        | Values |
| ----------- | ------ |
| form        | mark, wordmark, lockup-horizontal, lockup-stacked, boxed-icon |
| fill        | solid, outline |
| colour      | navy, pink, white, black, `currentColor` |
| background  | transparent, navy, pink, white |
| target      | web-svg, favicon, ios, android-adaptive, android-legacy, pwa-maskable, og-image, print-pdf, email-png |

Not every combination is legal, and the gates say which. Pink on navy fails
body-text contrast; `currentColor` only makes sense with a transparent
background; the small-size cut is mandatory below 48 px.

### 2.4 Adding a product

The thing you actually asked for. A new product is one file:

```json
{
  "name": "hikaru",
  "wordmark": "HIKARU",
  "lockup": "boxed-horizontal",
  "accent": "color.brand.navy",
  "targets": ["web", "favicon", "ios", "android", "og"]
}
```

`npm run build` then produces every legal variant, every platform size, the
manifest, and the guideline page. A new colourway is one more line. Nothing is
drawn by hand and nothing can be inconsistent with the parameters, because
nothing is drawn twice.

## 3. The CI half

These are cheap, deterministic, and each one corresponds to a mistake already
present in `init/`:

1. **Geometry invariants.** Every generated mark holds the ratios in
   `asset-audit.md` section 1 within tolerance. Catches a hand-edited path.
2. **Clear space.** Every rendered lockup has at least `1 x s` of empty pixels on
   all four sides, measured off the render.
3. **Contrast.** Every shipped foreground/background pair meets 3:1 for graphics
   and 4.5:1 where text is involved. Would have flagged white-on-pink.
4. **Small-size legibility.** Render the favicon variant at 16 and 32 px and
   assert the counters are still separate runs on a scanline. Would have flagged
   the 0.74 px counter.
5. **Platform safe zones.** Android adaptive ink inside the 72/108 circle,
   maskable inside 80%. Would have flagged the 8% overshoot.
6. **No background in transparent variants.** Would have flagged all five
   current files, and the pink knockout rectangle in the outline icon.
7. **Visual baselines.** Every render compared to a committed baseline. A change
   is approved by committing the new baseline in the same pull request, where
   the diff is reviewable.
8. **Licence presence.** Any embedded font carries its licence file.
9. **`dist/` is not hand-edited.** Rebuild and diff.

## 4. Where kagami fits

kagami is the right host and needs no adaptation to be one.

- Its **operating model** (references, research, spec, build, verification,
  acceptance) is exactly the sequence a brand change needs. A new lockup with no
  reference and no spec is how you end up with two different clear-space values,
  which is what happened.
- Its **visual layer** already draws the distinction this work depends on: a run
  that compared and disagreed is a finding about the artwork, and a run that
  never compared is a finding about the run (`src/visual.mjs`). It also already
  enforces that approving a deviation means committing the new baseline.
- Its **gate model**, rules as builds rather than as prose, is what turns the
  list in section 3 from a style guide nobody reads into something that fails a
  pull request.
- `tools/measure-ink.mjs` and `tools/measure-inset.mjs` exist because glyphs
  sitting high in their cap and unequal insets survive review by eye. Those are
  the same two defects as section 7.12 of the audit.

The `surfaces` concept maps cleanly: `brand/tokens/` is one surface, each mark
is a surface, each product is a surface, and a token change runs everything
because it reaches every render.

kagami has not been touched in this branch. It should not be until the decisions
in section 6 are made, because the config it would take is determined by them.

## 5. Sequencing

1. **Redraw the mark from parameters.** One `mark.json`, one generator, output
   compared against the current artwork at high resolution to confirm it is the
   same shape. This is the only step where the drawing changes, and it is where
   the audit's fixes land.
2. **Tokens and wordmark.** Palette to DTCG, Montserrat committed, wordmark
   generated from the font.
3. **Lockups and the target matrix.** Everything in section 2.3.
4. **Gates.** Section 3, in that order; contrast and small-size first because
   they already fail.
5. **Distribution.** npm package, CDN, release zip.
6. **Guidelines site.** Generated, on GitHub Pages.
7. **kagami wired in**, once there are baselines worth guarding.

Steps 1 to 3 are the bulk of it. Steps 4 onward are small and additive.

## 6. Decisions that are yours

These change what gets built, and guessing at them wastes work.

1. **Is this repository public?** It changes the licensing split and whether the
   npm package is scoped and private.
2. **The middle stroke and base bar widths.** Audit section 7.8 recommends
   moving 0.9087 and 0.8691 to a single 0.875. That is a visible change to the
   mark, roughly 4% on the middle stroke. Accept, or keep the current numbers as
   the parameters and lock them.
3. **The small-size cut.** Audit section 7.9. Below 48 px the mark needs wider
   counters or it has no favicon. The cheap version is a separate drawing that
   is 10% wider than tall.
4. **The mark-to-wordmark gap.** Currently 0.98 cap heights in one lockup and
   0.86 in the other. Recommendation is 1.0 for both, which moves Hikaru by 16%.
5. **Pink in print.** Whether to specify a Pantone and accept a CMYK shift, or
   to define a print-only pink that is reproducible.
6. **Which lockups exist.** Today there is a horizontal split lockup and a boxed
   product lockup. A stacked lockup and a one-colour lockup are the usual
   additions. Naming them now is cheaper than adding them later.
