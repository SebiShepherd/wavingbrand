# Product icons for a lineup (research, October 2026)

Why this exists: every WavingEye product ships the company mark as its app icon,
so two products in one taskbar cannot be told apart. This is the research for
how multi-product companies make icons distinct and still one family. Web
research; claims carry their source, and _(unconfirmed)_ marks what rests on a
secondary source only.

## What others do

| Company | System | Shared | Varies | Known problems |
|---|---|---|---|---|
| Microsoft 365, 2018 and 2025 | symbol plus letter plate, letter demoted | Fluent layering and rendering | symbol, hue | the 2025 refresh cut detail "for readability on smaller screens" ([TNW](https://thenextweb.com/microsoft/2018/11/30/microsofts-new-office-logos-are-a-beautiful-glimpse-of-the-future/), [PCWorld](https://www.pcworld.com/article/2928105/microsofts-newly-redesigned-office-app-icons-go-soft-and-fluid.html)) |
| Windows, 2019 | unique symbol | Fluent materials; icons "fit in and stand out at the same time" | symbol, hue | few ([MobileSyrup](https://mobilesyrup.com/2019/12/12/microsoft-windows-new-icons-fluent-design/)) |
| Adobe Creative Cloud | two-letter tile | tile, typeface | letters; colour per category since 2020 | products in one category became near-identical ([Adobe](https://blog.adobe.com/en/publish/2020/05/28/evolving-our-brand-identity-uk), [Creative Bloq](https://www.creativebloq.com/news/adobe-icon-update-2020)) |
| JetBrains | initials on gradient shapes | black square with initials | initials, gradient hues | staff concede "some of the logos can look similar" ([JetBrains support](https://intellij-support.jetbrains.com/hc/en-us/community/posts/360008280379/comments/360001693979)) |
| Google Workspace, 2020 | unique symbol, shared four colours | all four colours on every icon | silhouette only | indistinguishable at small sizes ([Creative Bloq](https://www.creativebloq.com/news/gmail-logo-google-workspace)) |
| Google, 2026 correction | symbol plus one dominant hue | soft gradient of the Google colours | one colour per app | stated aim: cohesion plus "a more distinct identity" ([TechRepublic](https://www.techrepublic.com/article/news-google-workspace-icons-gradient-redesign-android-ios-web/)) |
| Atlassian, 2017 and 2024 | glyph on a tile | glyph grammar, tile container | glyph per function, tile colour per collection _(partly unconfirmed)_ | colour per collection repeats Adobe's risk ([Atlassian logos](https://atlassian.design/foundations/logos)) |
| Proton | symbol plus a gradient that starts from Proton purple | the starting colour | second hue, silhouette | few; Pass's diamond chosen to stay legible in small fields ([Proton](https://proton.me/blog/pass-logo-story)) |
| Zoho | linear symbols | line style | metaphor | users disliked the monochrome move ([Zoho](https://blog.zoho.com/office/new-zoho-office-suite-logos.html)) |
| Meta | endorsement in lockups | "from Meta" under logos, never in the app icon | everything | not an icon device ([Meta](https://www.meta.com/brand/resources/workplace/logo/)) |

## The strategies

- **Letter plate** (Adobe, JetBrains): cheapest, fails at 16 px where letters are
  4 to 6 px tall and colour has to do all the work; Apple advises against text
  in icons ([HIG](https://developer.apple.com/design/human-interface-guidelines/app-icons)).
- **Unique symbol, shared palette** (Google 2020, Atlassian 2017): meaningful, but
  with one palette everywhere small icons collapse into each other.
- **Unique symbol plus a distinct hue** (Windows 2019, Office, Google 2026,
  Proton): two independent cues, so colour is never the only one (WCAG 1.4.1);
  where the industry has converged.
- **Shared container, colour per category** (Adobe 2020): for large catalogues,
  and the documented cause of near-identical icons.
- **Endorsement badge**: under 5 px at 16 px and cut by platform masks;
  endorsement belongs in lockups, About and installers.

Evidence: colour helps find an icon, concrete shape helps learn it, and adding
colour does not speed learning ([VT](https://vtechworks.lib.vt.edu/handle/10919/29663),
[GI 2020](https://graphicsinterface.org/wp-content/uploads/gi2020-12.pdf)); fine
detail disappears at small sizes ([GNOME HIG](https://developer.gnome.org/hig/guidelines/app-icons.html));
about 8% of men have a colour-vision deficiency, so a greyscale test is the
check.

## Platform constraints

- **GNOME**: a free silhouette on a 128 px canvas, simple geometry with a
  darker bottom profile, no fixed tile, each app's icon unique, and a required
  **symbolic** icon (16 px, one colour, recoloured by the system)
  ([app icons](https://developer.gnome.org/hig/guidelines/app-icons.html),
  [UI icons](https://developer.gnome.org/hig/guidelines/ui-icons.html)).
- **Apple**: full-bleed square, system mask, dark and tinted variants, no text.
- **Android**: adaptive 108 dp layers with a 66 dp safe zone, any mask shape,
  and a **monochrome** layer for themed icons
  ([Android](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive)).
- **Windows**: 16 px title bar and tray, 24 px taskbar; unplated light and dark
  variants or a system backplate
  ([MS Learn](https://learn.microsoft.com/en-us/windows/apps/design/iconography/app-icon-construction)).
- **Everywhere a one-colour glyph is required** (GNOME symbolic, Android themed,
  Apple tinted, Windows tray), an identity that lives only in a tile colour
  disappears.

## Gaps

Microsoft's own 2018 and 2025 design posts and JetBrains' construction rules
were not retrieved directly; Atlassian's 2024 rule rests on quoted search
results; no NN/g study on dock icons was found.
