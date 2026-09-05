/**
 * This repository, as kagami sees it.
 *
 * Most of kagami does not apply here and saying so is the point of this file.
 * There is no product to walk: no screens, no personas, no accounts, no API
 * whose data can confirm that a task actually happened. A brand repository has
 * one user and they are looking at pictures.
 *
 * What does apply is the half that grades a change and the half that judges
 * pixels. `surfaces` decides how much of a run a change owes, and the visual
 * layer's rules are the ones this repository was already following before it
 * had a name for them: a deviation is surfaced rather than silently accepted,
 * approving one means committing the new baseline in the same change, and a run
 * that never compared is a finding about the run rather than about the artwork.
 *
 * The last of those needed a change on kagami's side. Its "we compared"
 * signatures were Playwright's, hard-coded, and this repository's comparator is
 * not Playwright: it has no browser, renders through resvg and diffs the pixels
 * itself. `visual.comparedPatterns` exists because of that.
 */
export default {
  /**
   * What a file *is*. Order matters: first match wins.
   *
   * A surface here is not a screen. It is a thing a change can move that
   * somebody would look at separately: the shape of the mark, the colours, the
   * arrangements those two make, what goes to a printer, and the page that
   * explains all of it.
   */
  surfaces: [
    [/^brand\/tokens\/geometry\.json$/, 'mark'],
    [/^src\/mark\.mjs$/, 'mark'],
    [/^brand\/tokens\/(color|vocabulary)\.json$/, 'colour'],
    [/^src\/(theme|emit)\.mjs$/, 'colour'],
    [/^tools\/(tokens|theme)\.mjs$/, 'colour'],
    [/^src\/(lockup|wordmark)\.mjs$/, 'lockups'],
    [/^brand\/(products|themes)\//, 'lockups'],
    [/^brand\/tokens\/typography\.json$/, 'lockups'],
    [/^src\/(print|pdf|path)\.mjs$/, 'print'],
    [/^brand\/(stationery|tokens\/print\.json)/, 'print'],
    [/^src\/docs\.mjs$/, 'guidelines'],
  ],

  /**
   * Code no single surface owns. The build reaches every asset, so a change to
   * it can move any of them, and a run is not narrowed by one.
   */
  shared: [
    /^src\/(build|svg|tokens|baseline)\.mjs$/,
    /^brand\/fonts\//,
    // The lockfile belongs here rather than in `ignored`, and the reason is
    // specific: the renderer is a dependency. A resvg patch bump moves the
    // antialiasing on every asset in the repository, and a change that can do
    // that is not a change to nothing.
    /^package(-lock)?\.json$/,
  ],

  /**
   * Appearance without structure: a colour that moved cannot change what a
   * lockup *is*, only what it looks like, and the visual layer runs on every
   * change anyway.
   */
  tokensOnly: [/^brand\/tokens\/color\.json$/],

  /**
   * Files that cannot change what anybody sees. `baselines/` is here for a
   * reason worth stating: it is the record of what changed, not a thing that
   * changes, and grading a run by the size of its own evidence would make every
   * approval look like a rewrite.
   */
  ignored: [
    /^docs\//,
    /^\.github\//,
    /\.md$/,
    /\.test\.mjs$/,
    /^baselines\//,
    /^init\//,
    // The verification layer itself. kagami's own defaults make this argument
    // and it holds here: a change to what checks the artwork is not a change to
    // the artwork. These files are still `normative`, so they still owe their
    // research; they just do not owe a run of themselves.
    /^gates\//,
    /^src\/validate\.mjs$/,
    /^tools\/(validate|baselines)\.mjs$/,
    /^brand\/consumers\//,
    /^kagami\.config\.mjs$/,
  ],

  /**
   * The rules, as opposed to the things that carry them out. A change here owes
   * its research: a gate whose threshold moved without a reason is a gate that
   * will move again.
   */
  normative: [/^gates\//, /^brand\/tokens\//, /^src\/(?!.*\.test\.mjs$).+\.mjs$/, /^kagami\.config\.mjs$/],

  visual: {
    command: ['node', 'gates/check-baselines.mjs'],
    baselinesDir: 'baselines',
    updateHint: 'npm run baselines, and commit the result in the same change',

    /**
     * What this repository's comparator says when it compared and disagreed.
     *
     * Three states, not two, which is why both are here: a render that differs
     * is a finding about the artwork, and a baseline that is missing is a state
     * waiting to be approved rather than a broken run. Anything else in the
     * output means the comparator never got to compare.
     */
    comparedPatterns: [/channel samples differ/, /no baseline\. Run/, /became \d+x\d+/],
  },

  /**
   * No personas, no tasks, no seed, no API. There is nobody to walk and nothing
   * to sign into. `gates/` is this repository's own verification layer and it
   * runs on every push; kagami grades what those gates owe rather than
   * replacing them.
   */
  catalogueRoots: [],
};
