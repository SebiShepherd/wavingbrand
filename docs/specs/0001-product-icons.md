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

## Next

Prototypes for KnowYourLimit and Hikaru in both forms, rendered beside each
other and beside the W at 16, 24, 32 and 128 px. The sponsor picks forms and
metaphors from those; the parameters and gates follow.
