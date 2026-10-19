# Spec 0001: product icons

Status: **draft.** The direction below follows from the research; the forms are
reviewed by the sponsor when they can be seen, as rendered prototypes.

Input: [`../research/product-icons.md`](../research/product-icons.md).

## The problem

Every product renders the company mark as its app icon, so two WavingEye apps in
one taskbar are the same picture. The brand repository was built for one mark;
the lineup is now several products and growing.

## Decisions

1. **The W stays the company mark and leaves the product icons.** It appears in
   lockups ("KnowYourLimit by WavingEye"), About dialogs, installers and
   websites, which is where endorsement works (Meta, Atlassian). No corner
   badge: under 5 px at taskbar sizes and cut by platform masks.
2. **Each product gets its own glyph, built with the W's grammar.** Quadrilaterals
   and a bar on the same grid of ninths, the same stroke widths and the same
   angled cuts, encoding the product's metaphor (KnowYourLimit: a gauge or an
   hourglass; Hikaru, "light": a ray). The family resemblance comes from the
   construction rules, not from repeating the W, and the glyph stays
   recognisable in one colour, which GNOME, Android and Windows all require.
3. **Each product gets its own hue**, the same one its interface accent uses,
   solved at a fixed lightness and chroma so no product outweighs another. Brand
   navy stays as the one constant, for example as the start of the tile's
   gradient (Proton's device).
4. **No letters in icons.** They fail at 16 px and Apple advises against them.
5. **Two forms from one parameter set**: a full-bleed tile (Apple, Android,
   Windows, favicons) and a free silhouette with a symbolic variant (the GNOME
   app icon and its required 16 px one-colour icon).
6. **Distinctness is a gate.** Every pair of product icons is rendered at 16 and
   24 px in greyscale, and the build fails when two are too similar. The same
   check runs on the symbolic set.

## Prototypes

`prototypes/icons/render.mjs` renders seven KnowYourLimit directions into
`sheet.png` at every size the spec names. The level meter is out: it reads as a
statistics icon, which is the one meaning a screen-time product must not
borrow. How each direction reads at 16 and 24 pixels:

1. **Odysseus knot**, a mast with a rope wound twice around it. Carries the
   product's idea (bind yourself in a calm moment for a weak one) and holds as
   a silhouette down to 24 px; at 16 px it is a texture.
2. **Line against a wall.** Clear at every size; says "limit" without the
   padlock cliché, and says little else.
3. **Time ring.** Reads as a power button; rejected.
4. **Shackle.** Reads as a magnet or a letter n without its lock body.
5. **Gate.** Reads as the letter H.
6. **Hourglass.** Clear and common; other timer apps use it.
7. **Monogram KYL.** Legible at 32 px and up, a smudge below.

Chosen: **6, the hourglass**, for KnowYourLimit, in the **tile form on every
platform, GNOME included** (the sponsor's choice, SebiShepherd/KnowYourLimit#14).
The GNOME HIG asks app icons not to fill the canvas, to sit on a common baseline
and to carry a subtle darker front profile
(https://developer.gnome.org/hig/guidelines/app-icons.html); it does not
forbid a square shape. So the GNOME icon is the tile inset on its canvas, with
the same tile in navy drawn a few pixels lower as its front profile
(`render.mjs --export`). The free silhouette stays the basis of the symbolic
icon.
