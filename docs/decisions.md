# Decisions

The sponsor delegated these. Each one is written down with what it costs, so
that reversing it is a one-line change to `brand/tokens/` rather than an
archaeology exercise.

## D1 The repository is private, and the licences split

`package.json` is `private: true` and `UNLICENSED`. Distribution is by git tag
and a GitHub Release rather than by public npm.

The split follows Porsche's: build code is one thing and brand assets are
another. Nothing in `src/` or `gates/` is secret and it could be opened later;
the marks are a trademark and never can be. Keeping them under one permissive
licence would give anybody who reads the repository a licence to use the logo,
which is the opposite of what a logo is for.

**Cost:** consumers install from a git URL or a tarball instead of `npm i`.

## D2 The mark moves onto a grid of ninths

Every dimension becomes a whole number of ninths of one outer stroke width.

| Dimension          | Original      | Now  | Change    |
| ------------------ | ------------- | ---- | --------- |
| outer stroke       | 9             | 9    | unchanged |
| cut drop           | 3             | 3    | unchanged |
| middle stroke      | 8.18          | 8    | -2.2%     |
| base bar           | 7.82          | 8    | +2.3%     |
| counter gap        | 2.91          | 3    | +3.1%     |
| bar top edge       | 21.18         | 21   | -0.8%     |
| middle stroke top  | 10.10         | 10   | -1.0%     |
| bounding box       | 31.9996       | 32   | +0.003%   |

Nothing moves by more than 3.2%, and two side effects are worth having: the
counter now equals the cut drop, and the base bar now equals the middle stroke.
Eight integers replace eight measurements, which is what makes a variant
reproducible.

This is a smaller change than the 0.875 proposed in the audit, and a better one:
0.875 is a fraction somebody chose, and 8/9 is the number the artwork was
already closest to.

**Cost:** the new mark is not pixel-identical to the old one. At any size where
a person could tell, the difference is under a third of a percent of the mark's
width.

## D3 A second cut for small sizes

Below 48 px the standard counters hold one fully-clear pixel, which disappears
on any display that scales by something other than a whole number. The small cut
widens the counter from three ninths to five, which makes the mark 36 wide
against 32 high and gives two clear pixels at 16 px.
`gates/check-legibility.mjs` measures it rather than assuming it.

**Cost:** the small cut is not square, so it is a different drawing and has to
be used deliberately. The build picks it for every favicon automatically.

## D4 Artwork to type is one cap height, everywhere

The two original lockups used 0.983 and 0.862 cap heights for the same
relationship. One cap height is the rule now, which moves the WavingEye lockup
by 1.7% and the Hikaru lockup by 16%.

Cap height is nine ninths, so a capital letter is exactly one outer stroke width
tall. That relation was already true to within 2.7% in the WavingEye lockup.

**Cost:** the Hikaru lockup is visibly looser than it was.

## D5 Padding is a per-target number

The original icon put the mark at 50.9% of its canvas. That is 7.6% outside the
circle an Android adaptive icon survives, and far inside what the App Store and
a favicon want. So there is no single padding:

| Target                   | Mark as share of canvas | Why                          |
| ------------------------ | ----------------------- | ---------------------------- |
| Android adaptive layer   | 44%                     | inner 72 of 108 dp after a circular mask |
| PWA maskable             | 50%                     | inner 80%                    |
| General boxed icon       | 50%                     | matches the original         |
| Android launcher, PWA    | 55%                     | no mask beyond the shape     |
| Apple touch, App Store   | 62%                     | superellipse only            |
| Favicon                  | 94%                     | not masked at all            |

`gates/check-safe-zones.mjs` measures the shipped PNG rather than the intent.

## D6 The mark is lifted when it sits in a box

The mark's mass is in its base bar, so its area centroid is 5.5% of its height
below the bounding box centre, and a measured centring reads low. The correction
is 40% of the centroid's deviation, computed from the geometry so it follows any
change to the parameters. A full correction overshoots, because the eye does not
weigh area linearly.

## D7 One secondary colour is dropped, and the rest get roles

`#ff005c` goes. Its lightness matches the brand pink to 0.001 and its hue sits
14.6 degrees away, so at any real size the two are the same colour, and a
palette with two of them guarantees the wrong one gets used. Danger moves to
hue 25.

The rest keep their hues and gain a system:

- **Brand**: pink, navy, white, plus contrast-safe pink for light and dark
  surfaces. The identity pink is never altered; the variants exist so it can
  carry text without breaking WCAG.
- **Neutral**: eleven steps on the navy's own hue (271.3), so the greys read as
  part of the brand rather than as leftovers.
- **Accent**: seven hues at three steps each. 400 for dark surfaces, 500 for
  fills, 600 for text on light. Every 600 clears 4.5:1 on white and every 400
  clears 4.5:1 on navy, checked at generation.
- **Semantic**: success, warning, danger and info are aliases into the accents,
  so a UI never picks a brand colour to mean "this failed".

Black leaves the primary palette. Every asset already used `#101554`, pure black
has no identity, and it is harsh on a screen. It stays available for
one-colour reproduction, which is what it is for.

**Still open:** print. `#EF2F88` is outside CMYK gamut and will come back duller
and slightly warmer. A process build of roughly C0 M82 Y22 K0 is the honest
fallback. A spot colour is the alternative, and no Pantone number should be
written down here, because a screen cannot choose one; that is a fan deck under
daylight, against a printed proof.

## D8 The lockup set

Seven forms, because the two that existed cannot cover the space:

| Form               | Aspect | For                                    |
| ------------------ | ------ | -------------------------------------- |
| mark               | 1:1    | avatars, favicons, anywhere tight      |
| mark, small cut    | 1.13:1 | below 48 px                            |
| mark, outline      | 1:1    | single-colour and engraved reproduction |
| wordmark           | 9.96:1 | running headers, documents             |
| lockup split       | 4.14:1 | the original corporate lockup          |
| lockup horizontal  | 4.08:1 | site headers, email signatures         |
| lockup stacked     | 0.80:1 | square and portrait space              |
| boxed icon         | 1:1    | app icons, product tiles               |
| boxed lockup       | 3.4:1  | a product beside the company mark      |

The stacked lockup scales the mark to 72% of the widest line's width, because a
square mark at its natural size over a long word reads as an afterthought.

## D9 Contrast is solved against the worst surface, not against white

Every accent's text step was solved against `#ffffff` and every page is painted
on `neutral-50` or `neutral-100`. That costs about 0.2 of a ratio, which took
the whole set from 4.52:1 to between 4.22 and 4.37, which is the difference
between passing and failing. Nobody would have caught it by looking.

A light ink can land on `surface`, `surface-raised` or `surface-sunken`, and
`surface-sunken` is the darkest of the three, so that is what the light steps
are solved against. The dark steps are solved against `surface-sunken` in the
dark theme for the same reason, `neutral-800`, the lightest surface they land on.

Dark-surface steps are set at a chosen lightness and then checked, rather than
solved. Solving finds the darkest colour that scrapes the floor, which is a
muddy colour that happens to be legal; on a dark ground the eye wants a
comfortably light one and the floor is the check, not the target.

`gates/check-theme-roles.mjs` puts every ink on every surface it can land on in
both themes, which is 54 pairs, and it found this on its first run.
