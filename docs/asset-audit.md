# Asset audit: what is in `init/` today

Everything below was measured out of the SVG source, not estimated by eye. The
numbers are in the files' own user units; ratios are what matter and they hold
across all five files.

## 1. The mark is already a parametric system

All three lockups contain the same four shapes at three scales. Normalised to
`s`, the width of one outer vertical stroke:

| Quantity                      | Ratio to `s` | Icon (598 canvas) | Hikaru | WavingEye |
| ----------------------------- | ------------ | ----------------- | ------ | --------- |
| Outer stroke width `s`        | 1.0000       | 85.68             | 65.32  | 80.38     |
| Middle stroke width           | 0.9087       | 77.86             | 59.36  | 73.04     |
| Base bar thickness            | 0.8691       | 74.47             | 56.77  | 69.86     |
| Counter gap (both sides)      | 0.3234       | 27.71             | 21.13  | 25.99     |
| Mark bounding box (square)    | 3.5555       | 304.63            | 232.25 | 285.78    |
| Vertical drop of every cut    | 0.3333       | 28.56             | 21.77  | 26.79     |
| Outer stroke height           | 2.7261       | 233.57            | 178.08 | 219.12    |
| Middle stroke height          | 1.6042       | 137.45            | 104.79 | 128.95    |

The agreement is to four decimal places in every column, so the three files are
one artwork scaled, not three drawings. The bounding box is square to within
0.01 units in all three.

The horizontal layout follows from three numbers alone:

```
mark_width = 2·s + middle_width + 2·gap = 2 + 0.9087 + 0.6468 = 3.5555 s
left stroke   at x = 0
middle stroke at x = 1.3234 s
right stroke  at x = 2.5555 s
```

**The construction rule you used is a constant vertical offset, not a constant
angle.** Every angled cut in the mark drops by exactly `s/3` from one side of
the shape to the other. Because the shapes have different widths, that produces
three different visual angles:

| Element             | Width   | Drop     | Angle   |
| ------------------- | ------- | -------- | ------- |
| Outer strokes (top) | 1.000 s | 0.333 s  | 18.43°  |
| Middle stroke (top) | 0.909 s | 0.333 s  | 20.14°  |
| Base bar            | 3.556 s | 0.333 s  | 5.36°   |

This is a legitimate rule and it is what makes the mark work. It is worth
knowing that it is what you did, because the alternative rule (constant angle)
would slant the base bar by 101 units instead of 28 and produce a completely
different mark.

## 2. Lockup geometry

| Measurement                             | WavingEye lockup | Hikaru lockup |
| --------------------------------------- | ---------------- | ------------- |
| Cap height of wordmark                  | 78.23            | 117.42        |
| Stem width / cap height                 | 0.1429           | 0.1429        |
| Mark or box height                      | 285.78           | 455.91        |
| Mark height / cap height                | 3.653            | 3.883 (box)   |
| Gap between mark/box and wordmark       | 76.90 / 76.89    | 101.22        |
| Gap in cap heights                      | 0.983            | 0.862         |
| Wordmark cap-centre vs mark centre      | off by 0.53      | off by 0.01   |
| Mark inset inside the navy box          | n/a              | 24.5% a side  |
| Mark area as share of icon canvas       | n/a              | 50.9%         |

Two things are right and should be kept:

- Both lockups centre the wordmark on **cap height**, not on the baseline. That
  is correct practice and it is why the lockups look level.
- In the WavingEye lockup the two gaps around the mark are equal to 0.01 units.

One thing is inconsistent: the same relationship (block of artwork next to
wordmark) is set at 0.983 cap heights in one lockup and 0.862 in the other.

## 3. Colour

| Pair                     | Contrast | WCAG 2.2 verdict                          |
| ------------------------ | -------- | ----------------------------------------- |
| White on navy `#101554`  | 16.70:1  | passes AA and AAA for text                |
| Navy on white            | 16.70:1  | passes AA and AAA for text                |
| White on pink `#EF2F88`  | 3.87:1   | passes 3:1 for graphics, fails 4.5:1 text |
| Pink on navy             | 4.32:1   | passes graphics and large text, fails body text |
| Black on pink            | 5.43:1   | passes AA for text                        |
| Navy on black            | 1.26:1   | invisible                                 |

Consequences that are already true and will bite later:

1. The pink icon with the white mark is compliant as a graphic, with 29% margin
   over the 3:1 floor. It is not a surface you can put white text on.
2. Navy is unusable on dark UI. There is no dark-mode substitute defined.
3. `#EF2F88` is outside CMYK gamut. Anything printed from it will come back
   duller and slightly more orange unless a Pantone and a CMYK fallback are
   specified deliberately.
4. There are no neutrals, no tints, and no state colours, so every project that
   consumes this palette will invent its own greys.

## 4. Defects in the files

Ordered by how much damage each one does.

**4.1 There is no transparent mark asset.** Every SVG paints an opaque
background first. The icons paint a full-bleed rectangle (`-217.85` to `816.35`
in a 598 canvas) and the lockups paint a white rectangle over the whole canvas.
Placed on any coloured surface, all five files show a box.

**4.2 The outline icon only works on that exact pink.** It draws the mark as
stroked paths and then covers the overlaps with an opaque `#EF2F88` rectangle:

```xml
<path fill="#ef2f88" d="M 305.3125 0.949219 L 305.3125 103.976562 ..."/>
```

That patch is why the rendered outline mark shows a horizontal seam across the
right-hand stroke. The file cannot be recoloured or placed on anything.

**4.3 The wordmark is outlines with no font recorded.** The typeface is
identifiable from the outlines and it is **Montserrat Medium (weight 500)**.
Measuring every letter's ink width against its own cap height and comparing
against 48 candidate families at 8 weights each gives:

| Letter | Artwork  | Montserrat 500 | Delta   |
| ------ | -------- | -------------- | ------- |
| H      | 0.86002  | 0.85931        | -0.08%  |
| I      | 0.14291  | 0.14198        | -0.65%  |
| K      | 0.87572  | 0.87607        | +0.04%  |
| A      | 1.04857  | 1.04883        | +0.03%  |
| R      | 0.82422  | 0.82413        | -0.01%  |
| U      | 0.84564  | 0.84623        | +0.07%  |
| W      | 1.51700  | 1.51683        | -0.01%  |
| V      | 1.02000  | 1.02026        | +0.03%  |
| N      | 0.85991  | 0.85931        | -0.07%  |
| G      | 0.92019  | 0.92054        | +0.04%  |
| E      | 0.72576  | 0.72604        | +0.04%  |
| Y      | 0.93590  | 0.93455        | -0.14%  |

Mean deviation 0.10%, worst 0.65%. The next best family is off by 2.5% and the
next best Montserrat weight by 1.3%, so this is not a coincidence.

The letterspacing is recoverable too. Reconstructing the pen positions from
Montserrat's own advance widths gives +50/1000 em on every pair that Montserrat
does not kern (H-I, I-K, A-R, R-U, I-N, N-G, all within 0.3% of 50), and less on
exactly the pairs it does kern (K-A, W-A, A-V, V-I, E-Y, Y-E). So the setting is:

> **Montserrat Medium (500), uppercase, tracking +0.05 em, kerning on.**

Montserrat ships under the SIL Open Font License 1.1, which permits commercial
use, embedding, and use in a logo. Nothing needs to be bought and nothing needs
to be relicensed. Put the font file in the repo with its OFL text and generate
the wordmark from it at build time; then a new product name is one string.

**4.4 The canvases are not tight on the artwork and not centred on it.**

| File                          | Left margin | Right margin |
| ----------------------------- | ----------- | ------------ |
| `WE_LogoV2_TextLogo_LeftRight` | 4.15        | 182.20       |
| `WE_LogoV2_Hikaru_V01`         | 0.24        | 80.34        |

Anything that centres these SVGs in a container will show the logo pushed left
by roughly 6.6% and 3% of its own width respectively.

**4.5 The icon set has two different canvas sizes.** `Icon_Filled` and
`Icon_Outline` are 598.5 square; `Icon_Filled_RegularColor` is 648 square. The
mark occupies 50.9% in all three, so the artwork agrees and the frames do not.

**4.6 The naming does not say what differs.** `Icon_Filled` is the pink one and
`Icon_Filled_RegularColor` is the navy one. `V2` is in every filename while git
is sitting right there doing versioning.

**4.7 The files are 10 to 20 times larger than the shape requires.** Four
quadrilaterals and a rectangle are expressed through 20-plus nested `clipPath`
elements and identity matrices, at 5.7 to 10 KB. The same shape is under 700
bytes of path data.

**4.8 The generated IDs will collide.** `clipPath id="ec6771e93b"` and friends
are unnamespaced. Two of these inlined into one HTML page clip each other.

**4.9 Fractional viewBoxes and absolute sizes.** `viewBox="0 0 598.5
598.499981"` with `width="798" height="798"`. Neither number means anything and
the fixed width fights fluid layout.

**4.10 No accessibility metadata.** No `role="img"`, no `<title>`.

**4.11 The four PNGs are slides, not assets.** They are 1920x1080 compositions
with the logo placed inside a white frame.

## 5. Size behaviour

The counter gap is 0.3234 s, and `s` is 0.2813 of the mark's width, so the
counters are 9.1% of the mark's width. Rendered at 1x:

| Icon canvas | Mark width | Counter width | Result                  |
| ----------- | ---------- | ------------- | ----------------------- |
| 16 px       | 8.1 px     | 0.74 px       | counters vanish         |
| 32 px       | 16.3 px    | 1.48 px       | counters grey out       |
| 44 px       | 22.4 px    | 2.04 px       | first usable size       |
| 64 px       | 32.6 px    | 2.97 px       | fine                    |

So the mark as drawn has no favicon. It needs a separate small-size cut, which
is normal practice and is the same reason typefaces have optical sizes.

## 6. Platform safe zones

The mark is 50.9% of the icon canvas, giving 24.5% padding a side.

- **Android adaptive icon.** Only the inner 72 of 108 dp survives a circular
  mask. A square mark fits inside that circle at up to 47.1% of the canvas. At
  50.9% the corners of the bounding box, which are ink (the bar's bottom-left
  and the strokes' tops), sit 8% outside the safe circle and get clipped.
- **PWA maskable icon.** Safe zone is the inner 80%, so a square mark fits up to
  56.6%. 50.9% passes.
- **App Store 1024 icon.** No mask beyond the superellipse. 50.9% is far smaller
  than peers; 70% to 78% is the normal range.
- **Favicon.** Wants 85% to 95%.

One padded file cannot satisfy four targets. This is the argument for generating
each target from an unpadded master.

## 7. Recommended changes to the artwork

Split into things that are wrong and things that are judgement.

### Wrong, fix them

1. Produce an unpadded, background-free master of the mark as a single closed
   path in a `0 0 1000 1000`-style integer viewBox, filled with `currentColor`.
2. Rebuild the outline mark as one closed path using an even-odd fill, so it
   carries no knockout rectangle and works on any background.
3. Commit `Montserrat[wght].ttf` and its OFL licence to the repo, record the
   setting (weight 500, uppercase, +0.05 em tracking, kerning on), and generate
   every wordmark from the font at build time instead of storing outlines.
4. Crop every distributable SVG tight to its ink, then let padding be a build
   parameter per target.
5. One canvas convention for the whole icon set.
6. Namespace or strip all IDs.
7. Add `role="img"` and `<title>`.

### Judgement, with a recommendation

8. **The middle stroke is 9.1% narrower than the outer strokes and nothing
   explains why.** Set it to a stated ratio. `7/8` (0.875) is close to what you
   drew and is a number you can defend; `1.0` is cleaner still and widens
   nothing else. Same for the base bar at 0.8691, which should become 0.875 and
   match.
9. **Open the counters for small sizes.** At 0.3234 s they are the reason the
   mark dies below 44 px. A small-size cut at 0.50 s counters, used below 48 px,
   fixes it. Keeping the square bounding box at that gap means narrowing the
   middle stroke to 0.5555 s, which is ugly; the better trade is to let the
   small cut be 10% wider than tall and accept that it is a different drawing.
   (Shipped as a rule by role rather than the pixel threshold proposed here: see
   `decisions.md` D3, which measures why a threshold cannot hold.)
10. **Standardise the mark-to-wordmark gap at 1.0 cap heights.** That is a 1.7%
    change to the WavingEye lockup and a 16% change to Hikaru. Cap height is the
    right unit because the gap separates artwork from type.
11. **Define clear space as 1 x `s`** on every side of any lockup, measured from
    the ink. Everything else in the system is already expressed in `s`.
12. **Consider raising the mark 1.5% to 2% inside the Hikaru box.** It is
    geometrically centred to 0.5 units, and its mass is all in the base bar, so
    it reads slightly low. Test it at 32 px before committing.
13. **Decide what the base bar's 5.36° tilt means** relative to the strokes'
    18.43°. The constant-offset rule produces it and the mark works, so the
    recommendation is to keep it and write the rule down rather than to
    normalise the angles.
14. **Fill the palette out**: neutrals, a dark-surface navy substitute, a
    Pantone and CMYK pair for the pink, and a rule that pink never carries white
    text.
