The brand as parameters and a build. Everything in `dist/` is generated from
eight integers, one font file and a colour table.

The attached zip is what to hand somebody who is not going to clone a
repository: every asset, the tokens, the font and its licence, and the four
documents. A printer, an agency, a contractor.

## In the box

| | |
| - | - |
| `dist/<product>/` | marks, lockups, boxed icons, every colourway, as SVG |
| `dist/<product>/*.png`, `.ico` | favicons, Apple touch, Android, maskable, App Store, Open Graph |
| `dist/print/` | vector DeviceCMYK PDF and EPS, business card, letterhead |
| `dist/tokens/` | the identity as CSS, SCSS, JS and types, plus the shared vocabulary |
| `dist/email/` | an email signature that survives a mail client |
| `brand/fonts/` | Montserrat and its OFL licence |
| `asset-audit.md` | every measurement taken from the original artwork |
| `decisions.md` | fourteen decisions, what each cost, and the one still open |

## Read before printing

The CMYK builds are **not proofed**. See `dist/print/README.md`.

## Also outside the zip

The guidelines are at <https://sebishepherd.github.io/wavingbrand/>, generated
from the same parameters as the assets by the workflow that publishes them, so
the page cannot describe a build that does not exist.

Every file in `dist/` is on a CDN at this tag, no download required:

```
https://cdn.jsdelivr.net/gh/SebiShepherd/wavingbrand@v0.1.0/dist/tokens/brand.css
```
