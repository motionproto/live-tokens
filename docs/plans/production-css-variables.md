# Production CSS variables

Plan of 2026-10-14. A reviewer opened the demo site in Chrome DevTools and
found pages of custom properties, most of them crossed out, on every element.
They asked whether an app that only uses a theme ships that many.

Live editing needs every token on `:root`, because the editor rewrites any of
them at runtime. A production build runs no editor: `LiveTokensRouter`
renders the editor routes only under `import.meta.env.DEV`. So `vite build`
can rewrite the bundle's CSS for a page whose values never change. Dev keeps
every variable. The build keeps only the variables whose values change while
the page runs, and substitutes the rest with their values.

## Measurements

Taken 2026-10-14 with `node scripts/css-var-census.mjs <dist>`, which
parses each CSS asset with `postcss`. Two builds:

- **Scaffold.** `live-tokens create` from the 0.94.2 tarball, built
  unchanged. Its Home page imports Card and Button.
- **Card and Button alone.** A scratch entry that imports `tokens.css`, the
  default `tokens.generated.css`, Card and Button, and no package entry. It
  shows what the scaffold would ship without the editor.

| Measure | Scaffold | Card and Button alone |
|---|---|---|
| Distinct variables declared on `:root` | 2,177 | 932 |
| Declarations on `:root` | 2,570 | 1,325 |
| Redeclarations on `:root` (crossed out in DevTools) | 393 | 393 |
| Declared variables the JS names | 2,274 | 10 |
| Variables some rule reaches | 2,175 | 213 |
| Reached variables that must stay variables | 2,175 | 15 |

The scaffold ships every component's defaults. Its main CSS chunk holds 156
SideNavigation and 132 Badge declarations although no page uses either. The
demo site's build matches the scaffold: 2,177 on `:root`.

Sources of the crossed-out declarations:

- `tokens.generated.css` redeclares all 309 theme tokens in a `:root:root`
  block over the `tokens.css` defaults. 24 of those repeat the default value.
- The two responsive `@media` blocks in `tokens.css` redeclare 84 size tokens.

Most of the 719 unreached variables in the Card and Button build are full
palette scales (ten families of
eleven steps), every text style's sub-properties, easing curves and border
widths.

### The editor in the production bundle

The scaffold's 2,177 come from the editor. `bootLiveTokens`
(`src/editor/bootstrap.ts:25`) imports `registerComponent` statically from
`component-editor/registry.ts`, and the package root
(`src/editor/index.ts:85`) re-exports it. `registry.ts` imports all 29
component editors and their runtime components, 61 imports in all. Each
runtime component carries its `:global(:root)` defaults, and each editor
carries its token schema as strings. `package.json` declares no
`sideEffects`, so Rollup keeps every one of those modules even though
`bootstrap.ts:54` calls `registerComponent` only under
`import.meta.env.DEV`. The build also emits the Editor, Docs, ColorsPage and
ComponentEditorPage chunks, because `LiveTokensRouter.svelte:229-232`
imports them inside a branch Rollup cannot prove dead.

This defeats the transform twice. The CSS declares every component's
variables, and rule 2 of the dynamic rule keeps any name a JS chunk mentions,
which is nearly all of them. Wave 1 removes the editor from the production
bundle before any CSS work starts, and that change alone takes the scaffold
from 2,177 variables to about 932.

### The Card and Button floor

Fifteen variables stay in the Card and Button build:

- **Named in the components' scripts.** Card and Button set their hover
  switches through `style:` directives, and the values they assign are
  `var()` strings. The JS names `--card-hover-border-enabled`,
  `--card-hover-shadow-enabled`, `--button-hover-tint-enabled`,
  `--card-hover-border`, `--card-hover-shadow`, `--card-default-border`,
  `--card-default-shadow`, `--button-hover-tint`, `--text-secondary` and
  `--color-transparent`. Some of these never change at runtime, and the rule
  keeps them anyway. That costs a few variables and never breaks a page.
- **Redeclared in `@media`.** `--font-size-2xl`.
- **Derived from those.** `--card-default-title-font-size`,
  `--card-default-body`, `--button-outline-surface` and
  `--button-outline-disabled-surface`.

## Ground truth

- `themeFileApi` (`vite-plugin/themeFileApi.ts:136`) is the one plugin every
  consumer installs. `configResolved` (`:2249`) already detects
  `config.command === 'build'`, and `buildStart` (`:2252`) runs the design
  checks before a build. `ThemeFileApiOptions` (`:112`) takes `checks?:
  boolean` as the switch for that step.
- `LiveTokensRouter.svelte:160-164` gates the editor, components, colors and
  docs routes on `import.meta.env.DEV`. Their chunks still land in a demo
  build's output, and production never loads them.
- `vite-plugin/pruneMarkers` already strips component variants the production
  config never uses, through a Svelte preprocessor. This plan is its CSS
  counterpart and runs on the bundle.
- Components set per-instance variables with `style:--name` directives. 20
  exist across `src/system/components`, for example `Card.svelte:78-80` and
  `ImageLightbox.svelte:680-683`. The compiled JS carries each name as a
  string literal.
- Runtime code reads tokens by literal name: `backdrop.ts:183` and
  `backdrop/watch.ts:123` read `--page-bg`, and `Dialog.svelte:33` reads
  `--dialog-confirm-variant` and `--dialog-cancel-variant`.
- `SectionDivider.svelte:499-529` queries custom property values in
  `@container sd style(--_divider-hairline: ...)`. A name in an at-rule
  prelude is a runtime dependency.
- Vite's CSS minifier (lightningcss) lowers `light-dark()` into the
  `--lightningcss-light` and `--lightningcss-dark` toggles, declared under
  `[data-backdrop]` and `:where(:root)`. The transform runs on that lowered
  CSS, so the toggles count as dynamic by rule 1, and any token built on them
  by rule 6.
- `tokens.css` scopes `color-scheme` under `[data-backdrop]`, and its colors
  use `light-dark()`. An unregistered custom property holds a token stream,
  and `light-dark()` resolves on the element that uses it. Substituting the
  token stream unchanged keeps that behavior.
- `postcss` 8.5.26 arrived through `tsup` until Wave 0 made it a direct dev
  dependency.
- `scripts/smoke-create.sh` scaffolds a consumer from the tarball and runs
  `npm run build`, inside `prepublishOnly`.

## The rule

A custom property is **dynamic** when any of these hold:

1. A rule declares it under a selector other than a bare `:root`, or inside
   an at-rule (`@media`, `@supports`, `@container`).
2. Its name appears in any JS chunk or in `index.html`. This covers
   `style:` directives, `setProperty`, `getPropertyValue` and inline `style`
   attributes.
3. Its name appears in an at-rule prelude, such as a `style()` container
   query.
4. An `@property` rule registers it.
5. The `keep` option lists it.
6. Its value references a dynamic property.

Every other property is **static**. The build then:

- **removes** each property that no regular declaration reaches through
  `var()`, directly or through other properties;
- **substitutes** each `var(--static)` with the property's winning `:root`
  value, recursively, and keeps any `var()` fallback that the value itself
  contains;
- **merges** each surviving dynamic property's bare `:root` declarations into
  one, the cascade winner, so DevTools shows it once.

A name built at runtime from parts (`` `--${id}-bg` ``) defeats rule 2. Wave 0
confirms that no runtime path in `src/system` or the sketch layer does this,
and the docs tell consumers to list such names under `keep`.

## Invariants

1. **Dev never changes.** The transform runs only when `config.command ===
   'build'`. The dev server serves every variable as it does today.
2. **Computed styles stay identical.** For every element on every tested page,
   at every tested viewport and backdrop, each computed property matches the
   untransformed build. Wave 4 proves it.
3. **Source files stay untouched.** The transform rewrites emitted assets only.
   `tokens.css`, `tokens.generated.css` and component sources keep every
   token. Token names remain the public API in source.
4. **The analysis sees the whole bundle.** It reads every CSS asset and every
   JS chunk in `generateBundle`, including lazy chunks, before it rewrites
   any of them.
5. **Substitution copies token streams.** It never evaluates `calc()`,
   `color-mix()` or `light-dark()`.
6. **The data tree stays untouched.** A wave that runs the editor or a build
   restores `src/live-tokens/data` as `CLAUDE.md` describes.
7. **Copy follows the writing rules,** including the CHANGELOG and docs.

## Out of scope

- Moving component defaults off `:root` onto each component's own element.
  Live editing writes overrides on `:root`, so this needs its own design.
- Minifying values or renaming variables.
- Changing how the editor bakes `tokens.generated.css`.

## Decisions

The user settled these on 2026-10-14.

1. **Default.** The transform runs on every `vite build`.
   `productionCss: false` disables it. Token names stay the API in source, and
   a consumer who reads tokens at runtime by computed name lists them under
   `keep`.
2. **Depth.** The build removes and substitutes.
   `productionCss: { substitute: false }` removes only, which keeps token
   names visible while debugging.
3. **Parser.** `postcss`. Its AST exposes each declaration with its parent
   rule and at-rule, which the dynamic rule needs. Wave 0 adds it as a dev
   dependency for the census script, and Wave 3 moves it to `dependencies`
   when the plugin uses it at build time.
4. **Release.** A minor version with a `### Changed` entry, since a consumer's
   runtime reads of removed tokens return empty.

## Agents and workflow runs

| Wave | Execute | Verify | Review | Gate |
|---|---|---|---|---|
| 0 Baseline | by hand, 2026-10-14 | none | none | done |
| 1 Editor out of the production bundle | `svelte:svelte-file-editor` | `test-verifier` | `wave-reviewer` | automatic |
| 2 Analysis | `wave-executor` | `test-verifier` | `wave-reviewer` | automatic |
| 3 Transform | `wave-executor` | `test-verifier` | `wave-reviewer` | automatic |
| 4 Equivalence check | `wave-executor` | `test-verifier` | `wave-reviewer` | automatic |
| 5 Docs and release notes | `wave-executor` | `test-verifier` | `wave-reviewer` on Sonnet | automatic |

**Saved workflows.** `production-css` is an entry in the `PLANS` tables of
`.claude/workflows/plan-wave.js` and `plan-all.js`. The run is attended and
works in the main checkout, so its preflight needs a clean working tree.

| Command | Runs |
|---|---|
| `/plan-all production-css` | Waves 1 to 5 |
| `/plan-all production-css from <wave>` | Resumes a stopped run |
| `/plan-wave production-css <wave>` | One wave |

**Ledger.** Every executor commits with the subject prefix `Production-css
W<n>:`. `git log --grep "Production-css W"` is the record the reviewer reads.

**Scaffold build.** Waves 1 and 3 measure a consumer built from the working
tree:

```sh
npm run build:eval-project
(cd scratch/eval-project && npm run build)
node scripts/css-var-census.mjs scratch/eval-project/dist
```

`build:eval-project` rebuilds only when shipped sources changed. Pass
`--json` to the census for the chunk list, the per-prefix counts and
`dynamicReachedNames`.

## Wave 0: baseline

**Status.** Done by hand on 2026-10-14. The Run log's Baseline holds the
results.

1. Add `scripts/css-var-census.mjs`. Given a build output directory, it
   reports the measures in the table above, using the parser from decision 3.
   It prints JSON and a table.
2. Run it on this repo's `vite build` and on a `create` scaffold built from
   the working tree. Record both under **Baseline** below.
3. Confirm that no runtime path in `src/system`, `src/editor/core/sketch` or
   `bootLiveTokens` writes or reads a variable whose name it assembles at
   runtime. Record each finding.

**Done when** the Baseline section holds both reports and the runtime-name
finding.

## Wave 1: editor out of the production bundle

The editor runs only in dev, so a production build must contain none of it.

1. `bootstrap.ts` loads `registry.ts` with a dynamic `import()` inside its
   `import.meta.env.DEV` block, so the build drops the branch and the module.
   The same applies to every other editor-only module `bootstrap.ts` imports;
   measure each with the census script.
2. `registerComponent` stays importable from the package root without
   pulling `registry.ts` into a build. Candidates: a small queue module that
   `registry.ts` drains in dev, a `sideEffects` entry in `package.json` that
   lets Rollup drop the unused re-export, or both.
3. `LiveTokensRouter.svelte` guards each editor `import()` with
   `import.meta.env.DEV` so a build emits no editor chunks.

**Review rule.** Dev behaves exactly as before: registered custom components
appear in the components editor, and every editor route loads. A change that
alters dev behavior is a defect.

**Verify.** `npm run check`, `npm test`, `npm run test:e2e`,
`npm run check:smoke-create`, then the scaffold build.

**Done when** the census of the scaffold build lists no `Editor-`, `Docs-`,
`ColorsPage-` or `ComponentEditorPage-` chunk under `jsFiles`, its
`rootDistinctByPrefix` holds no `sidenavigation` and no `badge`, and it
reports fewer than 50 declared variables the JS names. Record the census
table under Calls.

## Wave 2: analysis

Create `vite-plugin/productionCss/analyze.ts`, pure, with no Vite or file
system access.

- `analyze({ css: string[], js: string[], html: string[], keep: string[] })`
  returns, per name, its declarations with their selector and at-rule
  context, whether a regular declaration reaches it, whether it is dynamic and
  which rule made it so, and its winning `:root` value.
- The cascade winner among bare `:root` rules follows specificity, then
  source order across the CSS assets in the order Vite emits them.
  `:root:root` beats `:root`, and `:where(:root)` loses to both.

Tests in `analyze.test.ts`, one fixture each: a root-only property, a
property redeclared in `@media`, one under a class, one in a JS string, one
in a `style()` container query, one under `@property`, one in `keep`, a static
property that references a dynamic one, an unreached property, a `:root:root`
override, and a chain of three static properties.

**Review rule.** When a property could fall either way, `analyze` classes
it dynamic. A false dynamic costs one variable; a false static breaks a page.

**Verify.** `npx vitest run vite-plugin/productionCss`, `npm run check`.

**Done when** the tests pass, and `analyze` run over the scaffold build's
assets reports the same reached and dynamic counts as the census script.
Record any difference and its cause under Calls.

## Wave 3: transform

1. Create `vite-plugin/productionCss/rewrite.ts`: given the analysis and one
   CSS asset, remove unreached and static declarations, substitute static
   references, and merge each dynamic property's bare `:root` declarations.
   Each rewrite step is a pure function with its own tests.
2. Wire it into `themeFileApi`: a `generateBundle` hook, active when
   `config.command === 'build'` and `opts.productionCss !== false`. Add
   `productionCss?: false | { substitute?: boolean; keep?: string[] }` to
   `ThemeFileApiOptions`.
3. Log one line per build: properties before and after, and bytes saved.
4. Move `postcss` from `devDependencies` to `dependencies`.

**Review rule.** The hook returns early under `vite serve`, and a test proves
it. Substitution copies the token stream unchanged.

**Verify.** `npx vitest run vite-plugin`, `npm run check`, `npm run build`,
the census on `dist`, then the scaffold build.

**Done when**, for this repo's build and the scaffold build, the census
reports `bareRootRedeclared` 0, and every variable left on `:root` appears in
`dynamicReachedNames` of the same build made with `productionCss: false`.
Record both census tables under Calls.

## Wave 4: equivalence check

Add a Playwright spec that builds the same app twice, once with
`productionCss: false`, serves both with `vite preview` on free ports, and
compares `getComputedStyle` for every element and every standard property.
Custom properties differ by design and stay out of the comparison.

- Pages: every route of this repo's demo site. Its routes include Card,
  Button, Dialog and every component the scaffold's Home uses.
- Viewports: 1280, 768 and 480 pixels wide, so both `@media` blocks apply.
- States: a `data-backdrop="light"` section and a dark one, a hovered Card and
  Button, and an open Dialog.

Any difference fails the spec and names the element, property and both
values.

**Review rule.** A difference the spec finds is a defect in the transform.
The spec never gains an allowance for one.

**Verify.** The new spec, then `npm run test:e2e`.

**Done when** the spec passes at all three widths, and it fails when the
transform substitutes `--font-size-2xl`, a dynamic variable. Revert that
deliberate break before committing, and record the failing output under
Calls.

## Wave 5: docs and release notes

1. A docs page under `src/editor/docs/content` that explains the production
   transform, the dynamic rule, `keep`, `substitute: false` and
   `productionCss: false`.
2. The `create` template's `vite.config.ts` comment names the new behavior.
3. A `## Unreleased` entry in `CHANGELOG.md` under `### Changed`.

**Review rule.** The copy follows the writing rules in invariant 7.

**Verify.** `npm run check:docs-content`, `npm run check:smoke-create`.

**Done when** the docs page lists in the docs route, the template comment
names `productionCss`, and `CHANGELOG.md` carries the entry.

## Run log

### Baseline

2026-10-14. `scripts/css-var-census.mjs` measured three builds, and the
Measurements section holds the numbers. The scaffold came from the 0.94.2
tarball, whose sources match the working tree. This repo's own `vite build`
matches the scaffold: 2,177 distinct, 2,570 declarations, 393 redeclarations,
2,277 names in its JS.

- The scaffold from the 0.94.2 tarball declares 2,177 distinct variables on
  `:root`, and its main JS chunk names 2,270 of them. The editor causes both, as
  "The editor in the production bundle" describes. This finding added Wave 1.
- No runtime path in `src/system`, `src/editor/core/sketch` or
  `src/editor/overlay` assembles a variable name from parts. Every
  `setProperty`, `getPropertyValue` and `style:` directive names its variable
  literally.
- Every gate this plan names passed on 2026-10-14 in CI's Verify run for
  v0.94.2 (`38583210967`). No failure predates this plan.

### Calls

**Wave 1, 2026-10-14.** The scaffold build from the working tree, measured
with the census script:

| Measure | Before | After |
|---|---|---|
| CSS files, JS files | 9, 9 | 2, 2 |
| Distinct variables declared on `:root` | 2,177 | 821 |
| Declarations on `:root` | 2,570 | 1,214 |
| Redeclarations on `:root` | 393 | 393 |
| Declared variables the JS names | 2,274 | 14 |
| Variables some rule reaches | 2,175 | 401 |
| Reached variables that must stay variables | 2,175 | 53 |

`jsFiles` lists `Home` and `index` only, and `rootDistinctByPrefix` holds no
`sidenavigation` and no `badge`. The count falls below the planned 932
because the scaffold's Home renders its two Buttons inside `{#if isDev}`, so
the build drops Button. This repo's own build declares 1,445 variables on
`:root`, and its JS names 147. The demo site uses most of the catalogue.

- `registerComponent` moved to `component-editor/registration.ts`, a queue
  that `registry.ts` drains as it loads. `bootLiveTokens` imports the
  registry, `editorStore`, `themeDocumentSync`, `liveStateStream` and
  `themeInit` inside its `import.meta.env.DEV` block.
- `package.json` declares `"sideEffects": ["**/*.css"]`. The package root
  re-exports `getComponentRegistryEntries` and the store's API, and without
  the declaration Rollup keeps those modules for their top-level code. The
  measurement with the dynamic imports alone stayed at 2,177.
- `editorStore` no longer runs in a production build. It used to write 16
  variables inline on `:root` from its empty state: the scrim and tint
  washes and the four gradients. Those values match the default theme. A
  production theme with its own gradients or washes now renders them, where
  before the store's defaults overrode them.

**Wave 2, 2026-10-14.** A scratch script fed the scaffold build's assets to
`analyze` and compared its counts over the names declared on `:root` with the
census:

| Measure | Census | `analyze` |
|---|---|---|
| Distinct variables declared on `:root` | 821 | 821 |
| Declared variables the JS names | 14 | 14 |
| Variables some rule reaches | 401 | 401 |
| Reached variables that must stay variables | 53 | 53 |

The two lists of reached dynamic names match name for name. The build of this
repo from before Wave 1, 17 CSS assets with `@container` style queries,
matches as well: 2,177, 2,277, 2,175 and 2,175.

- `analyze` classes three cases dynamic beyond rules 1 to 6, since
  substituting the winning value would change a page: a winning value that is
  a CSS-wide keyword, a `var()` loop, and bare `:root` values that differ
  between assets. Neither build has a loop or a split value. The keyword case
  hits only `--lightningcss-dark`, which rule 1 already classes dynamic.
- Rules 2, 4 and 5 also seed rule 6 with names no CSS declares. A `:root` value
  that reads a name the JS sets on some element resolves there differently
  once substituted. The scaffold has no such reference. In the repo build, 13
  SectionDivider, SegmentedControl and sketch properties have one, and rules 1
  and 2 already class each of them dynamic.
- `!important` outranks specificity in the cascade winner. Neither build
  declares an important custom property.

**Wave 3, 2026-10-14.** Each build ran twice from the working tree, once
with `productionCss: false`, and the census measured both. This repo's
`vite build`:

| Measure | `productionCss: false` | Default |
|---|---|---|
| CSS files, JS files | 12, 11 | 12, 11 |
| Distinct variables declared on `:root` | 1,445 | 564 |
| Declarations on `:root` | 1,838 | 648 |
| Redeclarations on `:root` | 393 | 84 |
| `bareRootRedeclared` | 309 | 0 |
| Declared variables the JS names | 147 | 147 |
| Variables some rule reaches | 1,139 | 564 |
| Reached variables that must stay variables | 564 | 564 |
| CSS bytes | 323,003 | 241,202 |

The scaffold build:

| Measure | `productionCss: false` | Default |
|---|---|---|
| CSS files, JS files | 2, 2 | 2, 2 |
| Distinct variables declared on `:root` | 821 | 53 |
| Declarations on `:root` | 1,214 | 127 |
| Redeclarations on `:root` | 393 | 74 |
| `bareRootRedeclared` | 309 | 0 |
| Declared variables the JS names | 14 | 14 |
| Variables some rule reaches | 401 | 53 |
| Reached variables that must stay variables | 53 | 53 |
| CSS bytes | 184,180 | 122,863 |

- In both builds the variables that stay on `:root` match the
  `dynamicReachedNames` of the `productionCss: false` build name for name.
  No `var()` in either rewritten build reads a property the rewrite removed.
- The redeclarations that remain sit in the two responsive `@media` blocks.
  The scaffold drops 10 of them because no rule reaches those sizes.
- The build logs `live-tokens: the production CSS declares 663 of 1,548
  custom properties and is 81.8 kB smaller.` for this repo, and 76 of 848
  and 61.3 kB for the scaffold. Those counts include the component-scoped
  properties off `:root`.
- `analyze` gained a tenth reason, `undeclared`: a value that reads a name
  no CSS declares and no script, `keep` entry or `@property` names. A
  computed name may set that name at runtime. Without a fallback the value
  is guaranteed-invalid, so a `var()` fallback that reads the property
  applies, and substitution would drop it. Every count of both builds stays
  the same.
- The merge keeps one bare `:root` declaration per property in each asset.
  A lazy chunk's CSS loads on its own, so a winner in another asset cannot
  stand in for it. Neither build declares a surviving property on bare
  `:root` in two assets.
- `substitute: false` merges the static properties it keeps as well.
- The hook runs with `order: 'post'`, after Vite's own `generateBundle`
  hooks, so the bundle holds the minified CSS and `index.html`.

### Deferred
