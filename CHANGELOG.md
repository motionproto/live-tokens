# Changelog

## 0.74.0 — A theme is three decisions and one document

### Changed

- **Breaking: the three theme CLI verbs are renamed, and there is no alias.**
  `generate-theme` is now `set-colors`, `set-fonts` is now `set-type`, and
  `adjust-geometry` is now `set-geometry`. Each verb names the dimension it
  sets, and each matches the skill that runs it. A script or note that types
  an old verb fails with "Unknown command"; there is no deprecation path,
  because nothing is released against these names yet. `set-type` and
  `set-geometry` keep their flags, their file formats, and their behaviour, and
  the geometry ops file is now written to `scratch/geometry-ops.json`.

  **`set-colors` writes the color buffer, and `save-theme` writes the theme.**
  A theme is three decisions and one document. Each set verb now writes only
  its own dimension into the unsaved buffers the app already renders:
  `set-colors` joins `set-type` and `set-geometry` there, and no longer writes
  or opens a theme. The new `save-theme <name>` composes the live state into
  `themes/<slug>.json` and opens it, and with no unsaved edits it saves a copy
  of the open theme under the new name. `--no-activate` saves without opening,
  which is how a set of themes comes off one starting look. `--carry-from` is
  gone: it existed because `set-colors` activated, and nothing activates now
  until you save. The base color file no longer carries `name`; a name in it
  is ignored with a notice. `live-tokens-create-theme` runs `save-theme` once,
  after its three contributing skills. `init`, an undocumented alias for
  `create` since 0.21.0, is gone: type `create`.

  **36 dead keys left the override bag.** Themes carried the color, type, and
  border-width siblings of keys an earlier migration dropped (Badge's `trait`
  variant, SectionDivider's title and description slots, Dialog's variant and
  state axes). Nothing read them, and every Adopt baked them into
  `tokens.generated.css`. A colors-and-type migration drops them from your
  themes on the next Save, the nine shipped themes are rewritten, and
  `check:preset-themes` now refuses any shipped theme, `default` included,
  whose override bag names a variable `tokens.css` does not declare.

  Internal: the engine bundles are `dist-plugin/setColors`, `setType`, and
  `setGeometry`, named for the verbs that load them. They have no `exports`
  entry and no consumer imports them.

- **A theme is one design direction routed to three contributing skills.**
  `live-tokens-generate-theme` did two jobs: it read the request and fixed a
  whole look, and it executed the color layer itself. So two of a theme's three
  dimensions were skills and the third was a section. It is now
  **live-tokens-create-theme**, which reads the request once, states one design
  direction, states a color, a type, and a geometry intent, routes each to
  **live-tokens-set-colors**, **live-tokens-set-type**, and
  **live-tokens-set-geometry**, and assembles their three reports. Its one CLI
  is `save-theme`. Every contributing skill still works when invoked directly
  with an intent and no direction behind it. This changes four `description` triggers:
  a whole look reaches create-theme, and a request naming one dimension goes
  straight to that dimension's skill, including a color-only refinement like
  "warmer".

- **The anchor tables split by dimension.** A row in the old mood and style
  vocabularies fixed color, type, and geometry at once, which meant the
  coordinator read color mechanics and handed on the other two. create-theme
  now holds `references/design-directions.md`, an index placing each anchor on
  the valence, energy, and dominance axes with its one-line direction; each
  contributing skill holds the column it executes, keyed on the same names.
  `check:skills` gains an anchor-key parity gate, so a name that reaches only
  some of the four files fails at commit.

- **The theme skills call the user's own words the request, not the brief.**
  "Brief" named two things at once: the user's words, and the seed JSON at
  `scratch/<slug>-brief.json`. The second sense is fixed in two filenames and
  in the CLI's own `<brief.json>` usage string, so the first sense moves.
  Layer 0 of the pipeline in `docs/terminology.md` is now the request; the
  files stay where they are and the prose calls them the seed file and the
  pairing file. This changes one `description` trigger, in
  `live-tokens-generate-theme`, from "from a natural-language brief" to "from
  a natural-language request". set-fonts loses its one clash with the new
  term: every family is a download rather than a request. The atlas tagline
  named the wrong layer and now credits the design direction, the one sentence
  three skills actually read.

- **A palette's base color is called that, not its seed.** The word already
  meant something else in this product: sketch mode displaces its strokes on
  random seeds, and says so in copy a user reads. The theme document has always
  called the value `baseColor`, so the skill and the CLI were the drift. The
  generator's input key is now `baseColors` rather than `seeds`, and the file
  the skill writes is `scratch/<slug>-base-colors.json`; the pairing file
  `set-fonts` reads is `scratch/font-pairing.json`. Both CLI verbs report
  against the new names, so a contrast failure now says "raise the Brand base
  color lightness". Internally `buildColorsAndTypeFromSeeds` becomes
  `buildColorsAndType`, dropping a "from" clause that was never true on the
  type half, and `ColorsAndTypeBrief` becomes `ColorsAndTypeInput`; neither is
  a public export. A kept base color file with
  the old `seeds` key needs that one key renamed, and the skill rewrites the
  file from scratch on every run anyway.

## 0.73.0 — The skill atlas ships from the package

### Added

- **A public export for the skill atlas, `@motion-proto/live-tokens/skill-atlas`.**
  The atlas is a Svelte component that diagrams the reasoning tree behind each
  bundled skill, with the source `SKILL.md` and its reference files alongside
  so a reader can see which lines drive which step. It carries no route of its
  own; a consumer mounts it wherever it likes. `live-tokens-online` is its
  first consumer, mounting it at its existing `/skills` route. Skill text
  reaches the component through a generated module built from `.claude/skills`
  and gated by `check:skill-sources`; the trees each carry a digest of the
  `SKILL.md` they cite and are gated by `check:skill-atlas`. Both run in
  `prepublishOnly`.

### Changed

- **`live-tokens-build-page` lays out the page before it places columns.**
  The Layout section opens with bands: name each by its job, put a tool
  page's stage on top and its toolbar along the bottom edge, separate bands
  with space and a rule, and stretch a band's boxes to one height. Two new
  subsections follow. *Containers by job* says what `Panel`, `Card`, a bare
  compact `Card` with its own text-style label, and a toolbar are each for,
  and that a card header is typed by the card's own tokens at 2xl. *Density*
  covers `size="small"` in toolbars and compose rows, forwarding `size` from
  a project component, text inside a card body inheriting the card's size,
  and toggling `MenuSelect` from a `Button`. Verify now asks for a look at
  the page band by band, since the checker cannot see a layout. The gap
  came from a studio page whose card headers, buttons, and inherited body
  text all ran large with every check green; `docs/build-page-gap-analysis.md`
  records it.

- **`live-tokens-build-page` opens Layout with the laws behind its rules.**
  A short block before the bands states what a layout is for: the page
  shows one thing, each mark that is not content must do a job no other mark does,
  separate with the smallest difference that separates (space, then a
  hairline rule, then a second surface), rank content, labels, and
  scaffolding on their own tokens, show related items side by side, and
  give a tool page's space to the stage. Verify adds a look from a distance,
  a removal question for each border and header bar, and a check of the
  reading order. The laws are Tufte's (smallest effective difference,
  1+1=3, layering and separation, administrative debris), with
  Müller-Brockmann and Refactoring UI as the working restatements;
  `references/layout-sources.md` in the skill names each source and where
  it lands.

- **`live-tokens-pick-component` says `MenuSelect` renders open.** The
  selection table called it a compact dropdown; the shipped component is a
  list, and a dropdown is a `Button` that toggles it.

## 0.72.1 — The compliance skills have a spine

### Changed

- **`live-tokens-check-compliance` and `live-tokens-fix-findings` open with a
  numbered workflow**, the same spine the other six skills have: run the
  command, read the result, apply the recipe, re-run, hand off. Both were
  prose-first, so a reader (and the Skill Atlas that draws them) had no steps,
  no gate, and no hand-off to find. fix-findings now also covers the four
  wiring rules its table skipped (`invalid-id`, `no-tokens`,
  `missing-component-const`, `missing-all-tokens`).

- **`live-tokens-create-component` is 189 lines, down from 247.** The
  standalone Toggle walkthrough is folded into the worked-examples list, the
  verification checklist no longer restates the checker step, and the
  registration caveat is shorter. Nothing a consumer needs to author a
  component was removed.

- **The sketch reference's inner-part example carries its reserved class.**
  The prose said a drawn part takes its own class and its own five
  `--sketch-*` values; the code under it showed only the CSS, so a part
  authored from the example was left crisp inside a drawn box.

### Fixed

- **`live-tokens-build-page` no longer promises a Cmd+G shortcut.** There is
  none; the columns overlay is the vertical-lines button in the overlay's
  header.

- **`live-tokens-pick-component` no longer lists `Slider` as a component the
  catalogue lacks.** It shipped in 0.71.0.

## 0.72.0 — The contract a consumer can run

### Added

- **The registry contract is a function a consumer can run.** The six
  per-component checks that hold this package's own components — registration
  resolves, schema variables are unique, every editable token is declared in
  the runtime `<style>` and seeded in `default.json`, a declared `minOpacity`
  is honoured, `setComponentAlias` round-trips — are now `checkRegistryEntry`,
  exported from `@motion-proto/live-tokens/component-editor/contract`. It takes
  one registry entry and returns a violation line per failure, so a project
  outside this package holds its own components to the same contract with a
  `describe.each` and one call. Paths resolve against `process.cwd()` and
  `src/live-tokens/data/component-configs`, or the `projectRoot` and
  `componentConfigsDir` passed in. Node-only, hence its own subpath.
  `live-tokens-create-component` carries the test file in
  `references/contract-tests.md`; filtering the registry on
  `origin === 'custom'` is the line that matters, since the shipped entries
  name paths relative to the package root.

- **`"checks": { "exclude": [...] }` in `live-tokens.config.json`.** Paths the
  checkers skip when they discover their own targets: a project-relative path,
  a directory covering what is under it. For a file that is not a themed
  surface at all — hand-tuned artwork, vendored CSS — where the only other way
  out was downgrading a rule for the whole project. Naming the file on the
  command line still checks it, so the escape hatch cannot hide a file from
  someone looking straight at it. The dev plugin now also recognises `checks`
  and `componentDirs`, which the CLI has read for some time while the plugin
  warned they were unknown keys.

### Changed (breaking)

- **`FloatingTokenTags` is demo artwork, not a shipped component.** It moved to
  `src/demo/`, so it leaves the published package, the component query and the
  count, which now agree with the registry at 26. **Breaking for anyone
  importing `@motion-proto/live-tokens/components/FloatingTokenTags.svelte`;**
  it was only ever the hero animation of the demo, and it never had a
  `:global(:root)` block, an editor, or a registry entry.

- **The SectionDivider title outline is removed.** It was the only reason the title was an
  SVG `<text>` behind a `feMorphology` filter rather than an element, and that
  SVG carried a `getBBox()` viewBox, a per-instance `MutationObserver` on the
  document's inline style (filter primitives cannot read a CSS var, so the
  resolved width and colour had to be read back and pushed onto them by hand),
  font-load listeners to re-measure, and a title that was neither selectable nor
  findable. It shipped transparent in the default and in all eight presets, and
  the trap-out it was built for is done by the layout: the `through-label`
  hairlines flank the title in a flex row, so no rule ever runs behind the
  glyphs. The title is now a span that inherits typography like every other
  component's. `--sectiondivider-{lg,md,sm}-title-outline-width` and
  `-title-outline-color` are dropped by a component-config migration; the
  `outlineWidthVariable` / `outlineColorVariable` rows on `TypeGroupConfig` go
  with them, since nothing else declared one.

### Changed

- **`registered` is read from the registry for shipped components too.** The
  query assumed a component under `src/system/components` was registered, so
  `live-tokens components` could name one the editor cannot open and
  pick-component does not list. It now reads the package's own
  `builtInRegistry`, the same parse `check-component` uses, which the two now
  share. A component that is discovered but registered nowhere reports
  `registered: false`, prints `(NOT registered)`, and is counted out of the
  catalogue in the summary line.

### Fixed

- **A bare `-width`, `-height` or `-size` no longer renders a colour picker.**
  The three sat in `KIND_RULES` under `surface`, so `--widget-panel-width` drew
  a palette while the naming vocabulary documented it as geometry. They are now
  a `length` kind, matched last among the geometry rules so `-border-width`,
  `-divider-height`, `-icon-size` and the rest still claim their token first,
  and drawn with the `--space-*` picker `-gap` uses. The suffix vocabulary is
  unchanged, so no token is renamed and no project has to migrate. `adjust`
  does not take the kind: its ladders are density and shape, and a panel width
  is neither.

## 0.71.0 — Check this project

### Added

- **`npx live-tokens report` is the project as facts.** Pending `tokens.css`
  migrations, the tokens each component declares and how many its own CSS
  reads (a read counts a `var()`, a `style:` directive, a padding mixin's
  string, or an SCSS-interpolated pattern), whether a component is registered
  and carries the description comment the picker reads, which page renders
  which component and how many times, the shipped and custom components used
  nowhere, and both checkers' findings by rule under the project's severities
  and again under `--strict`. It always exits 0: a reading, not a gate. `--json`
  for data.

- **`live-tokens-check-compliance`, the eighth skill.** "Check this project"
  runs the report and presents it without editing a file: what fails the
  build now, what `--strict` would add, the components and usage facts, and a
  list of recommended fixes marked mechanical or judgement with any visible
  shift named, handed to `live-tokens-fix-findings`. A finding that looks
  deliberate is flagged with the config entry that would record the decision,
  which stays the user's call. `live-tokens-fix-findings` no longer claims the
  audit wording, and starts from the report when the user has not seen it.

## 0.70.0 — The registry is a query

### Added

- **The registry is a query.** `npx live-tokens components` lists every
  component a project has, shipped and its own, with the variants and props
  read from each `interface Props` and the purpose its header comment states;
  `components <id>` prints one component's props, unions, tokens, and
  defaults. `npx live-tokens tokens` lists every theme token the project's
  `tokens.css` declares by family with its value, `--family <name>` for one
  scale. Both take `--json`. A project's components in a directory other than
  `src/system/components` are found through `"componentDirs"` in
  `live-tokens.config.json`. The same vocabulary the checkers read answers the
  query, so a skill sees exactly what the checkers will hold it to.

- **`getComponentRegistryEntries` is exported from the package**, so a
  project's own test suite can run the registry contract over every
  registration, shipped and custom. The create-component skill pointed at it
  before it was public.

### Changed

- **The skills read the registry instead of carrying it.** The picker's
  catalogue line is the shipped set only; a project's own component is found
  by `live-tokens components`, weighed by the description its header comment
  states, and never written into a skill file, so `setup-claude --force` no
  longer loses anything. build-page and fix-findings read a component's props
  from the same query, and fix-findings reads a token scale from `tokens`.

## 0.69.0 — Every value reads a token, and the build says so

### Changed

- **SideNavigation's panel widths read the spacing scale.** `16rem` and `3rem`
  were the only shipped defaults with no token behind them; both now derive
  from the largest step, `calc(var(--space-64) * 4)` and
  `calc(var(--space-64) * 0.75)`. Values are unchanged.

- **The starter `site.css` is fully tokenized.** A paragraph margin and three
  rule and blockquote strokes were px literals; they read `--space-16` and
  `--border-width-*` now, so a scaffolded project starts clean under
  `check-page --strict`. The paragraph margin moves from 14px to 16px.

- **TabBar's active tab and Button's inline-code badge are tints, not scrims.**
  Both washed a surface rather than dimming what sat behind it, and only read a
  scrim because no tint family existed. **They restyle**: a 38% near-black wash
  becomes a 10% white one, so each reads lighter and softer. A theme that pointed
  the TabBar alias somewhere else keeps its choice.

- **Optional-interaction gates take `-enabled`, not a state word.**
  `--card-hover-border-active`, `--card-hover-shadow-active`,
  `--image-zoom-hover`, and `--image-grow-hover` read as state-after-property and
  failed `check-component`, which meant the documented gate pattern was one a
  consumer could not use. A gate is not a state: it says whether the interaction
  is on at all. Values are unchanged.

- **Button's shimmer and ImageLightbox's tile fit are declared intrinsics.**
  Both were bare keywords with no theme token and no declaration, which is the
  thing `intrinsics` exists to record. `--button-shimmer` now defaults to
  `var(--shimmer-on)`, the token that was already there for it.

- **`--hover-*` is now `--tint-*`, and it has a baseline for the first time.** A
  state is a segment of a property name (`--button-outline-hover-surface`), not
  a token of its own, so the three stops are named for what they are: a tint
  shades the surface it sits on. Values are unchanged.

  The theme engine had always emitted these stops, but `tokens.css` never
  declared them, so they resolved to nothing until a theme was adopted. That is
  why `var(--hover)` painted no pressed state on a fresh install. `--tint-*` is
  baselined, and that half of the migration is additive, so it auto-applies.

- **`--overlay-*` is now `--scrim-*`.** A scrim is a translucent layer that dims
  what sits behind it, which is what a dialog draws over the page. The old name
  had spread to cover surface tints as well, which are the opposite operation,
  and it collided with `backdrop`, the exported concept for what paints behind
  an element and which way it leans. Each name now means one thing. Values are
  unchanged, so nothing repaints.

  `npx live-tokens migrate` renames the three tokens in a vendored `tokens.css`.
  Token names are public API, so the migration is breaking and never
  auto-applies. Saved themes and component configs migrate on load.

  Dialog's part follows its token: `--dialog-overlay-surface` is
  `--dialog-scrim-surface`, and the editor labels it "scrim color" rather than
  the "backdrop color" that named a third thing again. The editor's Overlays
  section is now Washes, holding Scrims and Tints.

### Added

- **The shipped catalogue is now the component contract's fixture.**
  `check-component` reported 109 errors across all 26 shipped components, and
  none of them were defects in the components: the checker's suffix list had
  simply drifted narrower than the catalogue it governs, rejecting `-accent`,
  `-title`, `-margin`, `-easing` and a dozen more names our own components use.
  A test now runs the full contract over every registered component and requires
  zero errors, so the rule and the components can never disagree again.

  The suffix vocabulary moved to `KIND_RULES` in the editor's `aliasKinds.ts`.
  The picker, the `adjust` CLI, `check-component`, and `check:skills` all read
  that one table, so a name the checker accepts always has a control behind it.

  Three rules got more accurate along the way. A token the editor declares in
  `intrinsics` is exempt from the suffix check, because a structural keyword is
  not a themeable value. Membership in the package's own `builtInRegistry`
  counts as registration. And a component may prefix its tokens with the
  hyphenated form of its id, which is what CornerBadge has always done.

- **An optional hover tint on Button, IconButton, TabBar, SegmentedControl,
  MenuSelect, and SideNavigation.** One stop for the whole component rather than
  one hover surface per variant: Button and IconButton carried 36 hover tokens
  each, and every one was tuned by hand. `--<id>-hover-tint` aliases a `--tint-*`
  stop, and `--<id>-hover-tint-enabled` gates it.

  Off by default, so nothing changes until a project turns it on. The tint rides
  as a `background-image` over the hover rule's own `background-color`, so it
  needs no pseudo-element.

  A **tint layer** switch in the component editor's hover state turns it on and
  points every hover surface at its own base surface, so hover is the tint alone
  rather than a swap wearing a wash. The hover-surface rows grey out while it is
  on, since they no longer change anything. Switching it off clears those
  overrides, returning each surface to its shipped default.

  Switching it on reveals a **tint color** row beside it. It starts on `--tint`,
  the theme's middle tint stop, and takes any colour token with an alpha, like
  every other colour row. A `-tint` suffix now resolves to the surface picker
  rather than falling through, so the row offers the whole palette, not only the
  tint stops.

  Per instance, the `hoverTint` prop overrides the global default (`undefined`
  inherits, `true` and `false` force).

- **`live-tokens check-page` validates a page against the build-page
  contract.** It fails on a component outside the catalogue, a deep import into
  package internals, a `var()` naming a token that does not exist, a colour
  literal, a route under the reserved `/live-tokens/*` namespace, and `site.css`
  imported from `main.ts`, a prop a shipped component does not declare, and a
  variant or size outside that prop's union. It warns on a px or rem literal
  in spacing, stroke, radius, or shadow, a hardcoded page-grid count of four
  columns or more, an absolute type value (the `font` shorthand included), and
  a route entry with no `source`. Sizing is layout and is never reported.
  Inline `style=` attributes and `style:` directives are read under the same
  rules as the `<style>` block, and a named colour is a literal like any hex.
  Given no paths it checks every page under `src/`.

- **Both check commands take `--json`, `--strict`, and per-rule severity
  flags.** `--json` prints findings with a stable `rule` id and line number, so
  a skill can fix one rule at a time and re-run until the exit code is 0.
  `--strict` promotes warnings to errors. `--off=<rule>`, `--warn=<rule>`, and
  `--error=<rule>` change a rule for one run; `"checks": { "rules": { ... } }`
  in `live-tokens.config.json` sets it for the project.

- **`check-component` now checks what a default *resolves to*, not just what it
  is named.** A component token names a semantic property and its default is the
  theme token that property reads, which is what makes the component repaint
  when the theme changes. A default reading a token that does not exist is now
  an error, including a `var()` naming a state word rather than the token that
  state should paint. A default with no token behind it is an error unless the
  editor declares it in `intrinsics`; a colour literal in any notation is an
  error; a token-backed default that still carries a px or rem term warns.
  Two more rules read the name alone: `disabled-is-terminal` rejects a token
  that combines `disabled` with `hover`, `focus`, `selected`, `on`, `active`,
  or `checked`, and `phantom-editor-token` rejects an editor row naming a
  token the runtime never declares. Given no id, `check-component` checks
  every component authored under `src/system/components`, and a scaffolded
  project runs both checkers as `npm run check:design` before every
  `vite build`. `check-component` also finds a shipped component's editor
  beside the other editors, not only next to its runtime.

- **`npm run check:pages` runs the page check over this repo under `--strict`
  and is part of `prepublishOnly`.** The unit suite covers the same ground:
  the repo's pages carry no finding at all, and every shipped component
  default resolves to a real token. Both suites also hold a mutation table: a
  clean component and a clean page that pass `--strict`, and one smallest
  break per rule that must fail, so a rule cannot stop firing unnoticed.

- **`Slider`, in two variants.** `single` moves one thumb to a value; `range`
  moves two thumbs to a low and a high bound on one track. Both share track,
  fill, and thumb tokens, linked in the editor so an edit to one moves the
  other until deliberately unlinked, with hover and disabled states and a
  label and value readout. It was authored by following
  `live-tokens-create-component` end to end, and `check-component --strict`
  was clean on the first run.

- **`live-tokens-fix-findings`, the seventh skill.** The loop for code that
  already exists: run both checkers with `--json`, take the largest group of
  errors first, apply that rule's recipe, re-run, stop at exit 0. It carries
  one recipe per rule id, with colour mapped by role rather than hue and
  geometry by scale, and three refusals: never silence a rule to pass, never
  mint a token, never shift the look without saying so. Its first run, on the
  package's own demo site, took three rounds and ended clean.

### Fixed

- **The tint layer switch was unreachable in four editors.** SegmentedControl,
  TabBar, MenuSelect, and SideNavigation gated the row on a state named
  `hover`, and their hover states are `hover option`, `hover tab`,
  `hover item`, and `<Part> / Hover`, so the switch and the tint colour row
  never rendered. Each condition now names the state the editor has. The
  render contract caught it once it learned to turn a gate on: a gate row
  carries `data-token-variables` and the harness flips a `role="switch"`
  Toggle the way it clicks a checkbox, then exercises the row the gate
  revealed. A selector whose selections are locked carries a `locked` class,
  which the harness skips instead of retrying a chip it can never click.

- **`check-page` no longer reports a `var()` fallback as a colour literal.**
  `var(--surface-neutral, #111)` paints the token; the literal only renders
  when the token is missing. Against the package's own demo site this was 33
  of 39 errors.

- **`check-page` reads a custom property with a digit in its name as one
  declaration.** `--heading-2xl: 1.875rem` was parsed as the property `xl`
  and reported as a raw dimension. The project's own `tokens.css` and the
  generated token files are also no longer discovered as pages.

- **Both checkers read a `:global(:root)` block the same way.** They had two
  extractors, one of which stopped at the first `}`, so a nested at-rule or
  SCSS block truncated the block. One brace-balanced extractor is shared.

- **An `intrinsics` array on one line still exempts its token.** The
  exemption required the closing `];` on its own line.

- **A persisted editor session from before the rename no longer breaks the
  renderer.** `hydrate` shallow-merges persisted state, so a `washes` (or
  `overlays`) slice saved by an older build replaced the current one wholesale
  and arrived without its tint stops, throwing `w.tints is not iterable` out of
  the render path on load. Hydration now reshapes the slice: it carries the
  saved stops across under their new names and falls back to the shipped
  defaults for anything unusable.

- **The outline Button and IconButton pressed state had no colour.** Both read
  `var(--hover)`, which names nothing: a state is a segment of a semantic
  property name (`--button-outline-hover-surface`), never a token of its own.
  They read `--surface-neutral-low` now, one step along the scale from their
  hover surface. `check-component` catches this class of mistake by name.

## 0.68.1 — A look is a Theme, or it's a sketch style

### Changed

- **"Look" is gone from the public surface.** The word covered two different
  things, a whole design identity and the hand-drawn sketch effect, and every
  export now names the one it means. `adoptLook` is `adoptTheme`,
  `AdoptLookResult` is `AdoptThemeResult`. From `@motion-proto/live-tokens/sketch`,
  `registerSketchLook` is `registerSketchStyle`, `SketchLook` is `SketchStyle`,
  `SketchLookSource` is `SketchStyleSource`, `RegisterSketchLookInput` is
  `RegisterSketchStyleInput`, the `sketchLooks` store is `sketchStyles`, and
  `themeSketchLook` is `unsavedSketchStyle`. `bootLiveTokens`'s `sketchLooks`
  option is `sketchStyles`.

- **A theme's embedded sketch settings moved from `sketchStyle` to
  `sketchSettings`.** The field holds a sketchstyle's settings, not a
  sketchstyle, so it is named for what it holds. Reading a theme accepts
  either key, so nothing breaks on upgrade; the boot migration rewrites the
  file to the new key the next time it saves. Schema version 5.

### Fixed

- **Picking a sketchstyle in the Sketchstyle view now updates a page's own
  picker.** Selection went through `selectSketchStyle`/`selectUnsavedSketchStyle`,
  separate from the door a page picker calls, so the two could disagree about
  what was on screen. Both go through `setSketch` now: one call applies the
  style, turns the effect on, and keeps every picker in step.

- **The mask's Rotation dial appears whenever its two axes differ**, not only
  when they were never linked. Un-linking the axes and moving just one used to
  leave Rotation hidden even though the mask was no longer round.

## 0.67.1 — The Napkin you tuned is the Napkin that ships

### Changed

- **Napkin's shipped dials match the look it was tuned to.** Four dials moved on
  a theme's own copy of the sketchstyle and never reached the file the package
  ships, so a project loading Napkin from the shipped set got a paler, softer
  ballpoint than the one on screen. The ink floor lifts to 0.62 over a harder
  mask edge, coverage runs to full, and instances vary a little less in size.

- **Pencil's blurb says what the grain does.** It is drawn long and on the
  diagonal, the way a pencil shades, which the old sentence left out.

### Documentation

- **The README covers sketch mode.** What the layer is, the seven shipped looks
  with the blurb each one carries, seeding a built site from a theme, registering
  your own sketchstyles at boot, building a picker, and the four classes the
  layer reserves for elements you draw yourself. A test pins each blurb to the
  README, so a look renamed or reworded here fails the suite until the page
  catches up.

## 0.67.0 — Every sketchstyle is a file

### Added

- **A saved sketchstyle ships with your site.** 0.66.0 carried the look a theme
  holds into a build, which covers one look per theme. Everything else a project
  saved in the Sketchstyle view stayed behind: the files live in
  `src/live-tokens/data/sketch-styles/` and only the dev server could read them,
  so a picker on a built site silently listed the shipped seven and nothing
  else. Hand them to `bootLiveTokens` and they are real everywhere:

  ```ts
  const files = import.meta.glob('./live-tokens/data/sketch-styles/*.json', {
    eager: true,
    import: 'default',
  });

  await bootLiveTokens(App, '#app', {
    sketchLooks: Object.entries(files).map(([path, file]) => {
      const id = path.split('/').pop().replace('.json', '');
      return { id, label: file.name || id, settings: file.settings };
    }),
  });
  ```

  Unlike `components`, these register in a build as well as in dev. Reaching a
  published site is the whole point of them.

  `create` writes this into `src/main.ts`, so a new project publishes what it
  saves without wiring anything.

- **A Save pill in the Sketchstyle view**, which writes the dials back over the
  sketchstyle you have selected. Updating a saved sketchstyle used to run
  through the naming form: open it, accept the pre-filled label, submit, and
  nothing on screen said a file had been replaced rather than created. Save
  lights as soon as the dials leave the sketchstyle they name. On one of your
  own it writes that file; on a shipped one it writes your project's own copy
  under the same name, which takes its place in the list, and deleting that file
  brings the shipped look back. **Save As** always creates, and starts its form
  empty to say so.

### Changed

- **Every sketchstyle ships as a file.** The seven looks were a constant in
  `sketchStyles.ts`. The Sketchstyle view could save over one, but the thing it
  saved over had no file to read, copy or compare against, so "restore the
  shipped Pencil" meant trusting that a deleted file fell back to something
  nobody could open. They now ship as JSON under
  `src/live-tokens/data/sketch-styles/`, one per look, and the module reads
  them: the file is the look.

  A shipped sketchstyle behaves like a shipped colors-and-type. Save over one
  and your project gets its own copy that shadows it; delete that copy and the
  packaged file comes back. The listing marks which is which (`isPackage`), and
  deleting a look that only the package ships answers 403 rather than reporting
  success and leaving it on screen.

  Pencil, Marker and Whiteboard ship with reworked ink coverage. Pencil's grain
  is now stretched and turned rather than square (`maskBlobX` 40 to 525 at 67
  degrees, on turbulence), Marker's blobs are twice the size over a much higher
  floor with the softness off, and Whiteboard's streak is finer and harder with
  more rotation on the jitter. The other four are unchanged.

- **Primary and secondary buttons rest one rung lower.**
  `--button-primary-surface` moves from `--surface-brand-high` to
  `--surface-brand` and `--button-secondary-surface` from
  `--surface-neutral-high` to `--surface-neutral`, with `--iconbutton-*`
  following. The border scale runs at the same lightness as the `-high` surface
  rung, so a filled button was outlined in its own fill colour: the sketch
  effect's hatch, which inks itself from the part's stroke, came out invisible
  on exactly these two variants while Danger, Success, and Warning shaded
  normally. Those three already rest on `-low`. This puts Primary and Secondary
  on the rung Badge and CornerBadge already use, and lifts white text off the
  surface by a further step. The eight preset themes carry the new value.

- **Ink coverage scales on two axes, and the px it states are the px it
  paints.** The Scale dial fitted a whole number of blobs to a fixed 600px tile,
  so it could only reach the sizes that divide 600: it read 250px at the top of
  its travel and painted 300px, there was nothing above that at all, and every
  reading in between was the nearest fit rather than the number on the dial. The
  tile is now painted at whatever the dial says, which makes the px exact and
  opens the travel to 8px speckle and 600px patches.

  The dial is a pair, **Scale across** and **Scale down**, held together by a
  chain. Click it and the two part company: blobs wider than they are tall read
  as ink dragged sideways, taller than wide as a vertical grain, and the fill
  keeps the same field underneath either way. Sketchstyles stored before the
  split come back square and linked, which is the look they had.

  Unlinked, a **Rotation** dial appears with them and points the stretch
  wherever you like. It is offered only there because a field the same in every
  direction is the same field turned. The tile still meets itself at every
  setting: a turned pattern repeats seamlessly only at the angles that land the
  page's own axes back on whole noise cells, so the dial takes the nearest of
  those and reads back the turn it landed on, usually within a degree or two of
  the one you asked for.

- **Shipped and saved sketchstyles are one list, in one id namespace.** A
  sketchstyle named after a shipped one replaces it and keeps its place, so a
  project that wants its own Pencil saves one. The Sketchstyle view shows a
  single grid; the ✕ marks the rows your project owns.

### Fixed

- **Saving no longer reloads the page.** A project registers its saved
  sketchstyles with `import.meta.glob`, which is what `create` writes into
  `main.ts`, so writing one invalidated the entry module and Vite answered with
  a full reload. The Sketchstyle view the save came from was torn down and
  rebuilt mid-edit, which read as the editor closing itself every time you
  pressed Save. The dev server now keeps every JSON under the data directory off
  its watcher: the editor reads that directory over its own API and re-lists
  after each write, so the page already holds what the reload would fetch.
  `tokens.generated.css` and `fonts.css` stay watched, since the page really
  does import them and CSS updates without a reload. A data file changed from
  outside the editor, by a CLI run or a branch switch, now needs the page
  reloaded by hand.

### Breaking

Pre-1.0, and the sketch API is days old. Every consumer we know of is in this
repo or in a site we own.

- `SKETCH_LOOKS` is now the `sketchLooks` store, since looks register after the
  module is imported and a constant array would be stale. A picker reads
  `$sketchLooks` the way it already reads `$themeSketchLook`.
- `USER_STYLE_PREFIX` and `selectSavedSketchStyle` are gone. A saved
  sketchstyle's id is its file slug, so `setSketch(id)` and
  `selectSketchStyle(id)` take it like any other.
- A `user:` id already in a browser's storage is stripped on read, so no
  migration is needed and nobody loses their selection. Themes need nothing at
  all: a theme has always stored its `sketchStyle` by value, never by id.

## 0.66.0 — A theme's sketchstyle reaches the built site

### Added

- **`seedSketchFromTheme` carries a theme's sketchstyle into a build.** A theme
  saved from the Sketchstyle view carries its dials, and 0.63.0 said in as many
  words that a built site ships no sketch. That left a theme half applied: the
  page in dev drew with the look the theme records, the page a visitor gets drew
  with whatever shipped preset the bundle happened to hold. Three links dropped
  it, and only one of them was a decision. `initializeTheme` runs behind
  `import.meta.env.DEV`, so nothing in a build ever read the field; the entry
  point exported no way to apply a look it had not shipped; and there was
  nothing for the field to be baked into, since the layer is an SVG filter bank
  rather than a set of custom properties.

  The new export is the whole route. Hand it the theme's `sketchStyle` field
  before mounting and the built page draws with it:

  ```ts
  import { seedSketchFromTheme } from '@motion-proto/live-tokens/sketch';

  seedSketchFromTheme(theme.sketchStyle);
  await bootLiveTokens(App, '#app');
  ```

  It takes the field raw and hydrates it, because a built site reads its theme
  JSON with no dev server to run `normalizeTheme` over it first. Absent, `null`,
  and anything that is not an object all mean no sketch, which is what absence
  has always meant.

  It is the rule boot already followed, not a second one: `initializeTheme` now
  calls it too, so one piece of code decides what a theme's sketchstyle means at
  boot in dev and in production. A visitor who has recorded a pick keeps it,
  None included. The theme seeds a browser that has decided nothing and never
  overwrites one that has, so calling it on every boot is safe.

  Adopt still bakes nothing, and `tokens.generated.css` still holds token values
  only. That half of 0.63.0's note stands; what it said about a built site
  shipping no sketch does not.

- **`themeSketchLook` is the theme's own look, as a picker row.** A seeded look
  that no shipped sketchstyle names read as `adjusted` through `sketchPick`, so
  a picker could only label a look it had just booted into "Adjusted", and a
  visitor who moved off it had no way back. The new store carries the same
  `id`/`label`/`blurb` shape a shipped look has, `setSketch` takes its id, and
  `sketchPick` reports it as the look it is. It is null when the theme carries
  no sketchstyle, and null when what it carries is one of the shipped looks,
  since that look's own row already names it.

- **`SketchStyle` is exported from `@motion-proto/live-tokens/sketch`**, so a
  site can type the field it pulled out of its own theme JSON.

## 0.65.1 — applyFontStacks returns what it wrote

### Changed

- **`applyFontStacks` returns the variables it wrote.** It writes the `--font-*`
  stacks from a list it kept to itself, so a consumer tracking what it had
  applied — to tear those vars down when switching looks — had to hand-maintain
  a copy of that list. A copy falls behind silently the moment a stack is added
  here, and the missed variable stays stuck at the outgoing look's value:
  `--font-editorial` did exactly that to a site that had listed the original
  four. The return value is additive, so existing calls keep working.

  ```ts
  applied = [...applied, ...applyFontStacks(theme.fontStacks, theme.fontSources)];
  ```

## 0.65.0 — A link the router cannot serve is the browser's

### Fixed

- **The router hijacked links it could not serve.** Its click interception
  claimed every anchor whose `href` began with `/`, reading neither `target`,
  `download`, `rel`, nor whether any route rendered the path. So a link to a
  file the origin serves — a PDF or an image under `public/`, a download, a
  server endpoint — had its click cancelled and its path pushed at a router with
  nothing to show for it, and the link silently did nothing. A left-click is now
  claimed only when the anchor asks for ordinary same-tab navigation and a route
  actually renders the path; everything else loads for real. Protocol-relative
  hrefs (`//host/x`) are no longer mistaken for local paths either — they start
  with `/`, and `pushState` throws on a cross-origin URL.

### Changed (breaking)

- **An unrouted path now performs a real navigation.** `pages['/']` is a
  fallback for *rendering* an unmatched path, not a claim on it, so the router
  no longer intercepts clicks on paths no route declares. On an SPA-rewriting
  host the page still lands on the `pages['/']` fallback, now via a page load
  rather than a client-side swap; on a host without the rewrite the URL 404s
  instead of quietly rendering the home page. Return your own entry from
  `resolve()` to keep claiming such paths.

## 0.64.3 — The add button names the act

### Changed

- **The add button names the act, not the font.** It read `+ add Domine` — the
  next family it would reach for — so the label changed under the pointer as a
  stack filled up, and a control that renames itself between clicks is hard to
  aim at. It now reads `+ add font`, and still falls back to `+ add fallback`
  once every project font is in the stack.

## 0.64.2 — A stack can gain a second font

### Fixed

- **A stack could not gain a second font.** "+ add fallback" only ever walked
  the system-and-generic ladder, and the row `<select>` could only retarget a
  row that already existed — so the one path to a font was to add a fallback
  and then change it, and once every fallback was in use the button disabled
  itself and the path closed. The add button now leads with any project font
  the stack doesn't carry, names it (`+ add Domine`), and drops it in with the
  other fonts above the fallbacks.

- **Duplicate slots survived 0.64 and made a stack look frozen.** 0.64 kept a
  stack persisted by the old add bug renderable, but left the repeats in place:
  two identical rows are indistinguishable, so dragging one past the other
  changed nothing on screen, and each repeat ate a rung of the add ladder.
  Repeats are now dropped as the stack is read, and no row offers a value
  another row in the same stack holds, so the state can't be re-entered.

## 0.64.1 — The sketch entry point carries its last symbol

### Added

- **`hasPersistedSketchState` joins `@motion-proto/live-tokens/sketch`.** A site
  moving its visitors off its own storage key has to guard that one-time carry
  on whether the store has already recorded a decision, or it overwrites a pick
  the visitor has since made in the Sketchstyle view with the stale one. It was
  the only symbol that errand still needed and the only one 0.64.0 left inside,
  so the bundler alias the entry point set out to retire survived for it alone.
  Reading `lt.sketchTouched` directly was never the answer: the key is ours to
  rename.

## 0.64.0 — A site picks the sketch through the front door

### Added

- **A public entry point for the sketch layer, `@motion-proto/live-tokens/sketch`.**
  A site that wants to offer its visitors a sketchstyle picker had nothing to
  build one from: nothing sketch-related was exported, so the only route to the
  looks was a bundler alias aimed at `src/editor/core/sketch/`. The new entry
  carries `SKETCH_LOOKS` (the shipped looks, with the label and blurb a picker
  shows), `setSketch(id | null)`, and the `sketchPick` store. All of it routes
  through `sketchStore`, which stays the one owner of the live look, so a pick
  made on the page and a dial moved in the Sketchstyle view are the same state.
  `setSketch` throws on an id it does not know rather than returning quietly.

  `sketchPick` reports three states, not two. The effect can be on under a look
  no shipped sketchstyle names — one saved to a file, or one a theme carried —
  and a picker that folds that into "off" tells the visitor the page is crisp
  while it is visibly drawn. A dial moved off a shipped look still names it,
  which is `selectSketchStyle`'s own rule: the pick says where the look came
  from and `sketchDirty` says it has since drifted.

### Fixed

- **"+ add fallback" took the Variables tab down.** The button offered a stack
  its preferred generic, and substituted the matching System UI preset when that
  generic was already present — but never checked whether the preset was there
  too. Every shipped stack carries both, so the click appended a slot the stack
  already held. Slot rows are keyed by their own content, so the duplicate threw
  `each_key_duplicate` and killed the tab; the mutation had already been
  debounce-written to localStorage by then, so a reload crashed on the same key
  rather than recovering, and font editing was over until storage was cleared by
  hand. The button now walks the whole system-and-generic ladder for a fallback
  the stack lacks, and disables itself once every one is in use. Rows are also
  keyed to survive a repeat, so a stack already persisted in the broken state
  renders and the extra row can be removed with its own X.

- **A family Google Fonts rejected reported nothing useful.** Google omits
  `Access-Control-Allow-Origin` from its error responses, so in a browser a 400
  rejects the fetch rather than arriving as `ok: false` — which left the
  `not on Google Fonts` branch unreachable and put a bare CORS failure in its
  place. Both shapes now read as "no CSS came back". The retry that follows is
  why it matters: the CSS2 API matches family names case-sensitively, and
  `domine` 400s where `Domine` resolves, so a lower-cased typing is tried again
  in Google's own casing before the family is called missing.

- **The by-name field accepted a pasted embed.** The whole `<link>` snippet went
  to Google as a family name, and the 400 it earned came back as the same opaque
  CORS failure. The field now recognises an embed or an `@font-face` block and
  points at the Paste tab, which has parsed both all along.

- **The Sketchstyle view's dials went dead against a layer the store did not
  install.** `installed` was a module-local flag, so a layer painted by anything
  but `render` left the store believing the page was crisp: the on/off switch
  had nothing to take down, and every dial wrote settings that reached no
  document — silently, since the page was drawn the whole time. It is now read
  from the DOM, for the reason `applySketchLayer` already compares against it:
  with the overlay open two instances of the module render into one page, and
  the document is the only ground they share.

## 0.63.0 — A theme carries its sketchstyle

### Added

- **The editorial role reaches above the reading size.** It shipped as a pair,
  so a lede, a standfirst or a pull quote had nowhere to go but a heading style:
  the display face, at heading leading. `--editorial-lg-*` and `--editorial-xl-*`
  are the two steps above `md`, set in the same editorial face, editable in the
  editor's Text Styles section and carried by an `.editorial-lg` /
  `.editorial-xl` class in `site.css`. Leading follows the role's own rule: `md`
  is the reading step and takes the most open leading, and every step away from
  it tightens by one. Sizes stay inside the band the responsive scale leaves
  constant, so an article does not resize itself between breakpoints. An
  `additive` tokens.css migration (`2026-08-27-editorial-large-steps`) adds both
  steps to a vendored `tokens.css`.

### Changed

- **A theme carries its sketchstyle.** Save folds the live dials into the open
  theme's `sketchStyle` field; Load applies whatever the theme carries, or
  turns the effect off for a theme with none. A sketchstyle keeps its old job:
  a reusable look you pick from, saved and loaded independently of the open
  theme. Production is unchanged: Adopt still does not bake the layer, and a
  built site still ships no sketch. No migration runs for the theme field
  itself: a browser that already had sketch dials set reads them as off the
  theme on its first boot after upgrading, and Save folds them into the open
  theme like any other unsaved change.
- **The Theme Picker previews the sketch layer.** Picking a theme showed its
  colors and type over whatever drawing the previously applied theme had left
  painted, so two themes' looks were on screen at once, which is the one thing a
  preview exists to prevent. A previewed theme now paints its own sketchstyle,
  and one carrying none previews crisp whatever is live. Leaving the picker puts
  back exactly what was there before, an unsaved dial included: the preview
  paints without writing the live buffer, so browsing costs nothing and Cancel
  reverts to the buffer rather than to a snapshot taken before it.
- **Sketchstyle, named as one thing.** "Sketch preset" is retired: the code,
  the Theme panel row, the editor's fourth view and the on-disk directory all
  say "sketchstyle" now. The saved-look directory moves from
  `data/sketch-presets/` to `data/sketch-styles/`; `npx live-tokens migrate`
  renames it (boot only warns on the old name, it does not refuse the tree).

## 0.62.0 — Editorial type reads as a pair

### Added

- **The editorial role has its own sizes.** The role shipped with a single
  unsized bundle, so an editorial surface could only take the body size. It now
  reads as a pair, matching body: `--editorial-md-*` and `--editorial-sm-*`,
  both editable in the editor's Text Styles section beside the other styles, and
  both carried by an `.editorial-md` / `.editorial-sm` class in `site.css`. Each
  step mirrors its body counterpart apart from the family, so a project that
  never repoints `--font-editorial` renders exactly as it did.
- **`Card` takes `variant="bare"`.** A card with no icon and no title dropped
  its header silently, which read the same as a card whose title had gone
  missing. `bare` says the headerless card is the intent; the frame and body
  keep every token the default variant uses, so padding, stroke and fill stay
  editable. A default-variant card with nothing to put in its header now warns
  in dev.
- **Sketch mode reaches the component editor.** A component demo draws itself
  the way the page will, sketch included, while the tab strips and property rows
  around it stay chrome: they run on `--ui-*` tokens the layer knows nothing
  about. The router hands the layer the root to paint, so a sketch style never
  bleeds onto the editor's own routes.

### Changed (breaking)

- **`--editorial-*` is now `--editorial-md-*`.** The unsized bundle became the
  medium step. A `breaking` tokens.css migration
  (`2026-08-27-editorial-size-steps`) renames it and backfills both steps,
  carrying any value already tuned. It never auto-applies: run
  `npx live-tokens migrate`.

### Changed

- **Ink coverage is a levels control.** The dials read as a pile of unrelated
  knobs because each one meant something different depending on the grain and
  octave count under it. The field is now normalized to run black to white
  whatever the noise beneath, so **Steps** flattens it into tones and **Output**
  squeezes the whole of it into the range the ink covers, from palest to
  densest. The field is squeezed into that gap, never clipped at it, so both
  ends mean the same thing at every setting. The seven shipped presets are
  retuned against the new response.
- **Menus and tooltips are drawn solid whatever the coverage dials say.** They
  float over arbitrary page content, so a fill worn through in patches let the
  page show through them and they stopped reading as a surface the pointer can
  land on.
- **`SectionDivider` titles take no outline by default.** The three sizes each
  carried a themed outline color, which drew a halo around every subsection
  title on a page that never asked for one. All three default to transparent;
  a theme that wants the halo sets the color.

### Fixed

- **Per-side padding no longer strands the base token.** `themed-padding`
  emits `var(--x-side, <base>)` for each side, so a per-side token is an
  override slot the editor fills when the user splits the padding. `Card` and
  `SegmentedControl` declared sides that named a literal step instead, which
  always beat that fallback and left the base inert: merging split padding back
  to one value cleared the side aliases, the fallback never took over, and the
  padding control moved nothing. Both now track their own base, and
  `paddingBaseStaysLive` holds every component that uses `themed-padding` to
  the same rule. `Card`'s header and body padding are symmetric as a result;
  a theme that wants the asymmetry back sets the per-side aliases.
- **`ImageLightbox`'s tile fill stays on the closed tile.** The fill also
  painted the opened stage, where it had nothing to do: the stage rides a
  near-opaque overlay that already backs transparent art, so the fill only
  showed as a slab of theme color in the gap the image's aspect left inside the
  stage box. The open stage now takes no fill of its own, matching the tile
  shadow, which already stopped at the same edge.
- **Sketch settings no longer accumulate a trace on `globalThis`.** Debug
  instrumentation left in `sketchStore` pushed an entry onto an unbounded
  global array on every settings write, every share and every cross-frame
  adopt. It is gone.

## 0.61.0 — A surface says which way it leans

### Added

- **One answer to "is this surface light or dark".** A wordmark drawn in white
  disappears on a pale theme, ink that multiplies onto paper vanishes on a dark
  one, and a headline over a photograph is on a dark ground whatever the palette
  says. Every one of those needs the same fact, and every one of them was
  answering it for itself: a luminance probe here, a `--page-bg` poll there, a
  hand-picked token pair somewhere else. `@motion-proto/live-tokens/backdrop`
  answers it once. `data-backdrop` is the single channel — state it in markup
  where the surface knows its own tone, or let `use:backdrop` measure what
  actually paints and stamp it — and `tokens.css` turns the attribute into
  `color-scheme`, so `light-dark()` under it resolves the half that reads. The
  module also answers in JavaScript, for a canvas, a WebGL uniform, or an image
  that comes in two versions: `isLightBackdrop`, `watchBackdrop`, `polarityOf`,
  `contrastTokenFor`, and `cssColorToHex`. A new guide chapter, **Light and
  dark**, covers the whole of it.
- **A theme's own polarity is baked, not probed.** Nothing in a saved theme
  recorded whether it was light or dark — the generator takes `scheme` as a
  brief and throws it away — so anything that needed to know had to measure at
  runtime and repaint. `tokens.generated.css` now carries a `color-scheme`
  measured from the production theme's `--page-bg`, at zero specificity: it is
  the answer at first paint, and any `data-backdrop` stamp — the editor
  switching themes live, a section stating its own tone — outranks it.

- **`ImageLightbox` has a tile fill.** A diagram drawn in light ink, or any
  cut-out with a transparent ground, disappeared into a light page: the tile is
  exactly the image's own box, so nothing stood behind the art to separate it
  from the section. `--imagelightbox-tile-surface` paints behind the image on
  the closed tile and the opened stage alike, inside the radius and border the
  tile already carries. It takes any fill the editor offers, solid or gradient,
  and defaults to none, so every existing lightbox renders as it did.

## 0.60.1 — A drawn heading is type, not an icon

### Fixed

- **`SectionDivider`'s title holds still in Sketch mode.** The title is type
  drawn as an SVG, so the sketch layer read it as one glyph and pushed it as
  far as it pushes a 16px icon. It asked for the soft bank rather than opting
  out, and at heading size any travel at all pulls the letters apart. The
  title now declares `--sketch-icon-off: none`, which drops the ink mask along
  with the displacement, so the heading stays crisp while the rest of the page
  keeps its hand-drawn edge.

## 0.60.0 — A brief names a feeling or an idiom

### Added

- **The theme skill reads two new anchor references: feelings and idioms.**
  `live-tokens-generate-theme` turned a brief into seeds through a six-row dial
  table. It covered "cheerful" and "calm" and left everything else to guesswork,
  so "Bauhaus", "terminal" and "wistful" all landed on the same polished-UI
  defaults. `references/mood-vocabulary.md` places eighteen feelings on valence,
  energy and dominance axes, and says which of the three color carries at all.
  `references/style-vocabulary.md` fixes color, type and geometry together for
  nineteen idioms, eras and genres, and names the one layer each is allowed to
  break the chroma budget in. An entry overrides the generic bands, and its Type
  and Geometry columns go verbatim to `live-tokens-pair-fonts` and
  `live-tokens-adjust-geometry`, so all three decisions come from one reading of
  the brief. `named-themes.md` keeps the holidays and seasons, and the three
  files are now read as one set of anchors.

### Changed

- **The menu panel is mostly opaque, and cannot be dialled below 90%.** At 85%
  the page behind a dropdown ghosted through it: a headline or a rule crossing
  the panel read as content inside the list, and the panel stopped looking like
  a solid thing you could touch. `--menuselect-menu-surface` now defaults to 95%
  of `--surface-neutral-lower`, enough translucency to sit above the page
  without competing with it. The floor is declared on the token itself, so the
  opacity slider stops at 90 and the `None` chip is gone from that one picker.
  Any component, shipped or consumer-authored, can declare `minOpacity` on a
  colour token; the registry contract test holds its shipped default above the
  line.

### Fixed

- **Sketch mode leaves the editor's own chrome alone.** The layer draws glyphs
  and inline SVG with a filter and an ink mask, and chrome inside the scope
  turns both off by declaring `--sketch-icon-off`. Only the filter read it: the
  mask went on regardless, so the overlay bar's icons came out blotched by an
  effect meant for the page behind it. The mask now answers to the same one
  declaration, and the column guides, which never opted out at all, now do.

## 0.59.0 — The shadow traces the art

### Added

- **`shadow` on `ImageLightbox`.** The tile cast its shadow from its own
  rectangle and offered no way out, so a PNG or WebP with transparency sat on a
  phantom slab: the shadow drew the box, and the box was not the picture. Art
  cut out against the page — a device mockup, a logo, a chart on no background —
  showed a hard rounded rectangle behind it. `shadow` now picks where that
  shadow falls. `box` is the old behaviour and stays the default. `content`
  casts from the image's own alpha, so the shadow follows the silhouette.
  `none` drops it. All three read the one `--imagelightbox-tile-shadow` the
  theme already sets — the mode moves the shadow, it does not restyle it. The
  open modal keeps its shadow only under `box`: it casts against a near-opaque
  scrim where nothing reads, and filtering the pan-and-zoom surface would
  repaint it every frame.

### Changed

- **A shadow token writes its spread slot only when the spread is set.**
  `--shadow-md` read `3px 3px 6px 0px hsla(…)`, and that fourth length was the
  reason a shadow token could not also be a filter: `drop-shadow()` has no
  spread slot, so the declaration was invalid and dropped. Every shipped theme
  carries a zero spread, so the slot said nothing and cost the scale half its
  reach. The zero-spread form is now three lengths, which `box-shadow` reads
  identically and `drop-shadow()` accepts — one token, both properties, no
  second scale to keep in step. The spread control is untouched: dial one and
  the token grows its fourth length back, still a shadow but no longer a
  filter, so a theme with a real spread has no shadow under `content`.
  Four-length values still parse, and normalise on the next save.

### Fixed

- **The colour edit panel wears editor chrome again.** Its confirm, cancel and
  "Remove override" buttons were the shipped `Button` and `InlineEditActions`
  components, which read the theme's own tokens — so the controls you edit a
  theme *with* restyled themselves as you edited, and a saturated success or
  danger palette turned three small chrome buttons into slabs. They are now
  `UIInlineEditActions` and `UIPillButton`, drawn from the theme-immune `--ui-*`
  scale like the rest of the editor. `UIInlineEditActions` is the editor's
  check/cross pair, sized to the 1.5rem chrome buttons it sits beside.
- **The base colour panel offers a confirm and a cancel.** Opening a palette's
  editor showed the base panel with no way to accept or discard — every slider
  wrote straight through, and only the docked step panel carried the pair. The
  panel now shows both, greyed until an edit is pending; the first touch of a
  slider, a hex field or the eyedropper opens the same session the step panel
  uses, so cancel restores the colour the panel opened with and confirm keeps
  the drag as one undo step.

## 0.58.0 — The sketch layer states its contract

### Added

- **`flush` on `Card`.** A card holding full-bleed media has to reach its own
  border, but the body's inset stood in the way and the only way around it was
  for the page to zero the five `--card-default-body-padding*` tokens at its own
  scope — reaching around the component to undo something the component did, and
  repeating it at every such card. `flush` drops the inset from the body alone,
  outweighs `size="compact"` so it holds at either size, and pairs with
  `prose={false}`: a flush body is a frame, not a column of text.
- **`sketch-container` and `sketch-chip`, beside the existing `sketch-surface`
  and `sketch-rule`.** The sketch layer draws a fixed set of selectors, so a
  consumer-authored component stayed crisp while the page around it went
  hand-drawn. The four reserved classes are now a size ladder — a container
  tilts less than the type inside it can tolerate, a chip is smaller than one
  blob of the fill mask — and a consumer picks the band its part belongs to
  instead of inheriting the middle treatment or borrowing a shipped part's
  selector to get drawn at all. The classes name no colours, so the element's
  own `--sketch-fill` / `--sketch-stroke` survive untouched.

### Changed

- **The `Sketches` preset theme is now `Sketchy`.** The old name read as a
  collection of sketches rather than as the look itself, which is the one thing
  a preset name has to do. The theme's files move to
  `themes/sketchy.json` and `colors-and-type/sketchy.json`. Presets are served
  read-through from the package, so a consumer who never opened it sees only the
  new name; one whose active or production pointer names `sketches` has to
  repoint it at `sketchy`.
- **The editor's `Sketch` and `Colors` views are now `Sketch Style` and
  `Color Wheel`,** and the condensed rail cycles Tokens, Components, Sketch
  Style, Color Wheel. `Sketch` named the mode and the view identically while
  `Colors` said less than the view does; the flow order now runs from the
  narrowest edit to the widest.
- **The sketch layer's contract is now documented from both sides.** The guide
  and the component-authoring skill each described what an element has to
  declare to be drawn, and neither said what the layer takes away from it: the
  element's `background`, `border-color` and `box-shadow` are forced off, its
  `overflow` is forced visible, it is given a stacking context, and both its
  pseudo-elements are claimed. That is what decides where the opt-in class can
  go, so a component that owned a `::before`, clipped its content or positioned
  its root failed in a way neither document accounted for. The skill reference
  now carries the full contract, including the icon controls, the hatch-ink
  fallback for a part with no outline, and the `PART_SPECS` path a first-party
  component takes instead of the reserved classes. The guide gains a short
  section on where the dials live, since nothing said they are held in the
  browser rather than in the theme.

### Fixed

- **Sketch mode's "Drawing your own elements" section showed the custom
  properties without the class that opts an element in**, so the example it gave
  drew nothing. It now documents all four reserved classes, how to pick one, and
  that variants, states and gradients are all just further declarations of
  `--sketch-fill` / `--sketch-stroke`.
- **Nothing said how to keep an image inside a drawn part from bleeding.** A
  part's `overflow` is forced visible so the fill and outline can travel past
  the box, which is right for a background and wrong for a photo: it kept square
  corners while the card around it turned. `--sketch-radius` was already the
  radius the layer drew and already inherited, so the fix was a documentation
  one. Both the Sketch mode chapter and the component-authoring reference now
  show media reading it, with a fallback for the effect being off.
- **`live-tokens-create-component` never mentioned sketch mode.** Joining the
  layer is now step 5 of the recipe, with `references/sketch-mode.md` behind it
  and a line on the verification checklist. A component authored to the old
  recipe was invisible to the effect and nothing said so.

## 0.57.0 — A theme can be drawn by hand

### Added

- **Sketch mode: a fourth editor view, beside Tokens, Colors and Components.**
  It is an effect layer over the active theme, not a set of theme values. It
  reads nothing from the theme and writes nothing back. Each component's fill
  and outline are repainted onto `::before`/`::after` from the tokens that
  component already owns (`--<component>-<variant>-surface`, `-border`,
  `-radius`), the real background and border are hidden behind them, and both
  are pushed around one shared noise field. Turning it off removes every trace.
  While it is on it applies to the page behind the editor as well as to the
  preview, because the layer is injected into every document `cssVarSync`
  tracks. Scope is the `data-sketch` attribute, so it switches on for a whole
  document root or for one preview container.
- **Seven shipped looks, and every dial behind them.** Pencil, Marker,
  Whiteboard, Hatched, Dashed, Napkin and Dry marker, each a complete set of
  settings with a blurb naming what it is. The dials sit under five headings:
  **Border** (travel, wavelength, width, ink, pressure, pooling, dashes, a
  second pass that either copies the first line or runs it through the pen again
  on its own seed), **Fill** (solid or hatched, travel, per-instance offset,
  rotation and scale), **Shape** (corner spread, and a corner travel that leans
  the drawn box into a quadrilateral with no two sides parallel), **Icons and
  SVG** (glyph travel and wavelength on their own scale, because a glyph is all
  curves and needs more travel than a card's long straight edge), and **Noise**
  (the shared displacement field's wavelength, roughness and waveform).
- **Ink coverage as a generated field.** The mask that thins a fill is a tiling
  Perlin field rasterised to a greyscale PNG and applied with `mask-mode:
  luminance`, rather than an `feTurbulence` primitive. Turbulence lands in a
  narrow band around its own midpoint, so a dial walking a cut across 0 to 1
  spends most of its travel outside the field and the rest reads as flat grey.
  Generated, the tile is stretched onto its own measured range first, so Min and
  Max always mean levels at every grain and octave count. The panel previews the
  field at each stage: noise, output, blur.
- **Saved sketch presets.** Any set of dials saves under a name and reloads
  later, as files under `<dataDir>/sketch-presets/` served by a new
  `/api/sketch-presets` route on the dev plugin. A sketch look is a draft
  effect, never part of a theme: it has no active/production pointer, it is not
  adopted, and it never reaches `tokens.generated.css`. The shipped seven stay
  in code, so the directory holds nothing but your own files.
- **A page can hand the layer its own elements.** The effect displaces boxes, so
  a rule drawn as a `border` is not one of them. `--sketch-fill`,
  `--sketch-stroke`, `--sketch-hatch-color` and `--sketch-radius` name what an
  element should be drawn with, and `--sketch-icon-off: none` opts a subtree
  out. The demo app's kit section draws its rules this way; the editor's own
  overlay bar opts out, because the effect is for the page being designed and
  not for the tool looking at it.
- **A Sketch mode chapter in the user guide.** It sits after Editing tokens and
  covers the presets, the dials, and the `--sketch-*` properties a page uses to
  hand the layer its own elements. Editing tokens itself now names all four
  views; it had been describing two since the Colors view landed.
- **Sketches ships as an eighth preset theme.** A whole look built on the
  effect: Cabin Sketch over Shantell Sans, square corners, and component
  aliases tuned for a page that is drawn rather than rendered. Load it from the
  Theme panel like any other preset. It stands on its own with Sketch mode off,
  and the effect is what it was designed under.
- **The gradient library is open-ended.** `--gradient-N` was a fixed four-slot
  scale; the Gradients section now has Add and Remove, and any number of
  numbered slots loads from a theme file. A new slot seeds from the last one, so
  it lands as a gradient you edit rather than an invisible transparent one.
- **A gradient can point at a corner.** Alongside degrees, a linear gradient
  takes CSS's `to top right` and its seven neighbours. A keyword angles the
  gradient line off the box's own diagonal, so it tracks the element's aspect
  where a fixed angle cannot: `to bottom right` reads as about 95deg across a
  wide heading and about 111deg once that heading wraps. The degrees underneath
  are kept, so clearing the keyword lands on the nearest angle rather than
  snapping to 0deg.
- **`--gradient-N-stops`.** Each slot now also emits its stop list on its own,
  so a consumer can keep the theme's colours and supply their own geometry:
  `linear-gradient(to top, var(--gradient-5-stops))`. One set of stops then
  serves every direction a design needs, instead of a token per angle.
- **The editorial type role.** A fifth font stack (`--font-editorial`) and a
  ninth text-style bundle (`--editorial-*`), for the long-reading surfaces that
  should not carry the body face under an expressive display face. Both default
  to indirections rather than literals: the stack resolves to `var(--font-sans)`
  and the bundle mirrors `--body-md-*`, so a project that never mentions
  editorial renders byte-identically. `live-tokens set-fonts` gained a matching
  `editorial` slot, and the stack is editable in the editor beside the other
  four.

### Changed

- **Derived palette values serialize unclamped.** A palette's basis is OKLCH,
  and clamping every derived step into sRGB on the way out threw away chroma a
  wide-gamut display can show. Values already inside sRGB serialize identically,
  so nothing moves in an existing theme; intent authored beyond sRGB now
  survives to the browser, which does its own gamut mapping at paint. The hex
  readouts still show the clamped projection, which is what a hex readout is
  for.
- **The product is spelled LiveTokens.** One word, in the README, the docs and
  the demo app. The package name is unchanged.
- **A test fails on any engine load at module top.** `bin/engineLoadsLazily.test.ts`
  follows every `.mjs` module a test suite can reach, transitively, and rejects
  a top-level import of the compiled engine. CI runs the suite before it builds
  the plugin, so such a load is a publish failure rather than a test failure.
  This is the bug that took down 0.56.0.

### Fixed

- **A session persisted before the OKLCH palette basis no longer throws on
  hydrate.** Such a session holds hex strings where every palette color is now
  `{ l, c, h }`. `loadFromFile` migrated those on the way in and `hydrate` did
  not, so the session reached the renderer with an undefined hue and threw on
  the first serialization.
- **The overlay panel's chrome keeps its own font.** `tokens.css` sets the theme
  font on `:where(*)`, and a matching rule beats inheritance, so the panel's
  font-family never reached its children. The editor page already restored
  inheritance for its chrome; the overlay now does the same.

### Migration

- Two **tokens.css migrations** ship here, both additive: `--font-editorial`
  with the `--editorial-*` bundle, and a `--gradient-N-stops` companion per
  gradient slot. Each companion is read out of the slot it belongs to rather
  than hardcoded, so a retuned gradient does not get a stop list contradicting
  it. Run `npx live-tokens migrate` to apply them to a vendored `tokens.css`, or
  set the plugin's `autoMigrate` option and let it apply additive migrations on
  boot. Until then the dev plugin warns on the gap and the new names simply
  resolve to nothing.
- The **editorial font stack** is added to a theme file on load, cloned from
  that theme's `--font-sans`. It is presence-based and idempotent, so there is
  no schema step and a theme that never touches editorial keeps rendering as it
  did.

## 0.56.1 — Release fix

### Fixed

- **The 0.56.0 publish failed in CI and never reached npm.** `scripts/lib/presetFonts.mjs`
  loaded the compiled font-pairing engine at import time, and a vitest suite
  imports that module for its `PRESET_FONTS` table; CI runs the tests before
  it builds the plugin. The engine now loads inside `stampPresetFonts`, the
  one caller that needs it. Everything listed under 0.56.0 ships here.

## 0.56.0 — Type is a first-class half of a theme

### Added

- **`live-tokens set-fonts` and the `live-tokens-pair-fonts` skill.** A theme's
  type can now be chosen the way its color already could: describe the voice you
  want and get a verified Google Fonts pairing bound to `--font-display`,
  `--font-sans`, `--font-serif` and `--font-mono`. The skill carries the
  reasoning (anchor on the body face, classify both candidates by form model,
  apply the font matrix, gate every candidate on screen legibility); the CLI
  does the verifying and the writing. Like `adjust`, it edits the unsaved
  colors-and-type buffer, so a retype is an edit you keep by saving the open
  theme. Color, component aliases, `tokens.css` and `fonts.css` are untouched.
- **URLs are negotiated from the family's real weights, not guessed.** A 200
  from the Google Fonts API never proved weight coverage: the API silently drops
  enumerated weights a family lacks and only rejects a *range* its axis cannot
  serve. `set-fonts` now takes a census from the returned CSS and builds the
  narrowest URL that delivers everything the family has: a range for a variable
  family, an enumeration for a static one, a bare URL for a single-weight
  display face. It also reports the weights your typography tokens ask for and
  the family does not have.
- **`generate-theme` owns the whole look.** A theme is three decisions made
  from one brief: color, type, and geometry. The skill reads the brief once,
  names its voice, seeds the color, then invokes `live-tokens-pair-fonts` and
  `live-tokens-adjust-geometry` with the same voice, so a moody night theme
  arrives with type and corners to match rather than with the previous look's.
  The three CLIs stay separate, so any one decision retunes without re-rolling
  the others.

### Changed (breaking)

- **`live-tokens-adjust-shape-space` is now `live-tokens-adjust-geometry`.**
  Same skill, same `adjust` verb; the name now matches the heading the token
  suffix vocabulary already uses for radius, padding, gap, and border width.
  Re-run `npx live-tokens setup-claude --force` to pick it up, then delete
  `.claude/skills/live-tokens-adjust-shape-space/` by hand: `setup-claude`
  never removes a directory, and the stale copy would keep triggering under
  the old name.

### Changed

- **Skills are leaner and read the package instead of copying it.** The
  create-component skill no longer inlines the shipped `Toggle` (the copy had
  drifted 174 lines from its source); it points at the files in
  `node_modules` and moves the linked-siblings, intrinsics, and fixed-overlay
  material into reference files read on demand. The theme skill moved its
  holiday anchors the same way. Every skill body is now under 250 lines.
- **The picker catalogue lists `Panel` and `InlineEditActions`.** Both shipped
  without an entry, so the picker could never recommend them.
- **`npm run check:skills` gates the bundle.** It asserts the catalogue names
  every shipped component, every reference file is pointed at and present,
  every CLI verb a skill mentions exists, every skill has a sample prompt, and
  no skill pastes a long file inline.

### Fixed

- **Adding a Google font by name in the editor no longer persists a dead URL.**
  The by-name field built a `wght@100..900` range URL and never checked it, so
  any family without that exact variable axis (every static family, every
  single-weight display face) was saved with a URL the API answers 400 to. It
  now runs the same negotiation `set-fonts` does, reports the family's real
  weights, and fails loudly for a family that is not on Google Fonts.

## 0.55.1 — The anchored step is the base color

### Fixed

- **Editing the anchored palette step edits the base color.** The anchor pins
  the lightness, saturation and hue curves through one step, so that swatch was
  already rendering the base color. Clicking it opened a per-step override,
  which forked the two apart: the ramp moved, the family's base swatch and hex
  did not, and the palette stopped passing through the base color the anchor
  guarantees it passes through. That step now opens the base color itself. The
  whole ramp re-derives, a bound harmony axis follows the hue, and the header
  swatch moves with it. Both swatches carry the selection ring together and the
  panel titles itself "Base Color > 500", so the pairing is stated rather than
  inferred. An override left on the anchored step by an earlier build is cleared
  when the step is opened, inside the edit session, so Cancel and undo both put
  it back. Every other step keeps its own override, unchanged.

### Changed

- **The color editor docks under the row it edits.** It rendered at the bottom
  of the family block, past the curve editors and the Text, Surfaces and Borders
  section, far enough from the swatch that opened it to read as unrelated
  chrome. It now opens directly beneath the ramp for a palette step, or beneath
  the derived row that owns the step, with a caret on the step's own column. The
  caret is placed on the grid rather than positioned, so it stays under its
  swatch at any width. Showing and hiding use the disclosure motion the
  expandable sections already use.

- **Selection reads by weight.** The editor's chrome is greyscale by design, so
  a selected swatch is marked by a heavy ring drawn inside it: a white band
  between two dark keylines, which survives both ends of a ramp running white to
  black where a single-tone ring disappears at one end. The ring is inset rather
  than an outline, which would close the gutter between neighbouring swatches,
  or a thicker border, which would resize the swatch inside its own grid.

## 0.55.0 — A focused palette arrives ready

### Changed

- **A palette focused before mount opens without the reveal.** `paletteEditorOpen`
  started false and flipped in an effect, so a deep link that set the focus
  ahead of mount landed the visitor mid-animation, reading as a page still
  loading. The editor now reads the pending focus when it constructs and opens
  on the first frame; the scroll that brings it into view jumps rather than
  gliding, since nothing expanded for the motion to match. A jump from the
  Colors view, where the editor is already mounted, keeps its reveal.

- **"Base color must appear in palette" moved to the family band.** The toggle
  sets `anchorToBase`, which is family-level config persisted in the theme,
  but it sat in the base-colour panel among the controls that edit the colour's
  *value* — and it only occupied a row of its own because it wrapped out of that
  panel's title row. It now sits beside the family's name as
  "Must appear in palette", the swatch alongside supplying the subject the label
  drops; the full sentence stays as its title. The colour panel closes back up
  to a title row and its sliders. Collapsed families are untouched: the setting
  shows only while that family's editor is open, so a page of ten collapsed
  palettes does not repeat it ten times.

- **The palette band holds two columns at every width.** With the setting on
  the band's row, a band too narrow for it wrapped the buttons to the left edge,
  under the swatch. The setting sits in the identity column instead, a third
  line under the hex — name, value and constraint all describe the family and
  share its left rail — which leaves the buttons a column of their own that no
  width takes away. They wrap among themselves against the right edge before the
  cluster ever drops a line. The swatch keeps its square: the taller column
  would otherwise stretch the chip into a rectangle.

## 0.54.2 — Palette focus is public API

### Added

- **`openPaletteInTokens` and `openPaletteInWheel` are exported.** Both hand a
  palette family to a view, and both were already what the palette jump buttons
  call; only the package's own code could reach them. A consumer building a deep
  link into the editor — "open the app with Brand's palette editor showing" —
  now has the same entry point the UI uses. `selectedPalette` comes with them,
  so a consumer can read which family is current. The one-shot
  `pendingPaletteFocus` store they drive stays internal.

## 0.54.1 — Palette editing opens on a curve

### Changed

- **The base-color panel opens with the rest of the palette editor.** The panel
  above the swatch grid appeared and vanished in one frame while the swatch
  grid and the derived row animated, so opening a base color read as a jump. It
  now reveals on the same height transition as its neighbours.

- **The floating token pills read as polished chrome.** The gradient was tuned
  against a dark ground and sat too low in the scale for a light page, where it
  looked tarnished. The bands keep their spacing and move up the scale, the
  border becomes a dark hairline, and the strings drop to 0.3 opacity on light
  pages, where a black stroke at 0.5 reads far heavier than the white stroke it
  mirrors. The darkest stop stays at `#8f9090`, so the black label keeps AA.

- **The demo hero labels its theme picker.** The trigger showed the open
  theme's name with nothing saying what it picked. A "Theme" label sits above
  it, and the actions row bottom-aligns so the picker and the buttons sit on
  one line.

## 0.54.0 — Shadow weight and text insets follow their context

### Fixed

- **Padding that holds text stops at `--space-6`.** One floor for every inset
  treated a card and a button alike, but the components that hold text double
  their padding horizontally, so `--space-4` on a button is 4px over an 18px
  line and 8px at each end. `adjust` now reads which floor applies off the
  config itself: a variant that also declares a `-text-font-size` is holding
  type. Containers keep the `--space-4` floor, `-margin` and `-gap` stay
  exempt, and both rungs stay reachable by `set` and by the editor picker.
  Midnight Study shipped with every text inset on the old floor, its pill
  buttons worst of all; its controls move up, and the six full-size button
  variants to `--space-8` so the capsule has room for its label.

### Changed

- **Shadow weight follows the canvas.** The `--shadow-*` scale was one fixed
  near-black at 0.9 opacity in every theme, which is what a dark ground needs
  and what puts a smudge under every card on a light one. `generate-theme` now
  derives the opacity from the Canvas seed's lightness: 0.9 holds up to L 0.5
  and eases to 0.2 by L 0.9. Geometry and color carry forward untouched, so a
  hand-tuned elevation ramp survives regeneration. The three light presets
  (Ocean, Spring Meadow, Autumn) ship with the derived values; the dark presets
  and the default theme are unchanged.

## 0.53.0 — Themes are complete documents

### Fixed

- **The editor no longer imports build tooling.** `themeService.ts` and
  `themeTypes.ts` read `THEME_SCHEMA_VERSION` from
  `vite-plugin/themes/normalizeTheme`, a path that resolves in this repository
  and in no installed copy, because the tarball ships no tooling. Any consumer
  building the editor failed on an unresolved import. The constant now lives in
  `themeTypes.ts` and the plugin re-exports it. `check:no-tooling-imports`
  gates the direction.

### Changed

- **Content insets stop at `--space-4`.** Below it the text sits against its
  own edge, so a relative "tighter" no longer deposits a `-padding` alias on
  `--space-0` or `--space-2`. Both stay available in the editor picker and
  through an explicit `set` op, which is where that call belongs. A shift that
  would push an alias under the floor reports as clamped and writes nothing.
  Outer space is exempt: a 2px gap between an icon and its label, or a 2px
  margin under a bar, is ordinary design.

- **An off-ladder value spends its first step reaching the ladder.** Shifting
  such a value used to snap it to the nearest rung and then apply the full
  shift on top, so a one-step request moved two visible steps, and an
  above-ladder value could be quietly pulled *down* by a request to go up.
  The snap now follows the shift's direction and counts as its opening step.
  This retires the report card's `!` marker, which existed only to flag that
  backwards case.

- **Themes are complete documents.** A theme now stores every component and
  every alias, by value, at `schemaVersion` 4. Boot migrates and fills a
  local theme once; an incomplete imported theme still loads with whatever
  components it carries, filled from the current defaults, and the fill is
  reported in the Theme panel. The preset generator that re-derived the
  seven shipped presets on every run is gone. `seed-preset-theme.mjs <slug>`
  seeds a new preset once and `check:preset-themes` guards the shipped seven
  against drift.

### Fixed

- **`generate-theme` no longer inherits gaps from an incomplete open theme.**
  The live resolution path gained the missing default layer, so a theme
  missing a component no longer leaves the generator working from a hole.
- **A pre-rename alias key in an old theme is migrated before the bake**,
  instead of being emitted verbatim into `tokens.generated.css`.
- **A component's gradient default survives a fresh checkout.** The dev
  server derives `component-configs/<comp>/default.json` from the component's
  `:global(:root)` block, and it could not read a baked gradient back. On a
  tree with no prior file it dropped the alias. It now parses the gradient
  into its structured form, so the derivation covers every value the bake
  emits.
- **A radial gradient bakes the shape the editor shows.** The production bake
  carried its own copy of the gradient renderer, which ignored the centre and
  both aspect factors and wrote `circle … at center` for every radial. Both
  sides now share one renderer.
- **The shipped `panel` aliases sit in derivation order.** `Panel.svelte`
  declares `--panel-stage-surface` before the stage spacing, but every
  committed copy carried it last. On a fresh checkout, where the component
  source is newer than the data tree, boot re-derived `default.json` into
  source order while the seven presets kept the old one, and the preset gate
  read two different key orders. The committed data now matches the source.

## 0.52.1 — Notification header actions are previewable

### Fixed

- **The Notification editor can show a header action.** The four
  `--notification-*-action-surface` tokens paint the backdrop behind a
  header-slot button, and no preview ever rendered one, so nothing in the
  editor could show what they do. A "Header button" checkbox in the preview
  toolbar turns the slot on.

## 0.52.0 — A third palette curve

### Added

- **Palettes gain a third curve, for hue.** Alongside Saturation and
  Lightness, a Hue curve offsets each step by up to ±45 degrees, so a
  palette can drift warmer or cooler across its ramp without moving
  contrast. OKLCH keeps hue rotation close to lightness-preserving, which
  makes that possible. The curve is closed by default, and existing
  themes are unaffected: an absent hue curve renders as flat zero, exactly
  as before.

## 0.51.0 — OKLCH end to end

### Changed (breaking)

- **Color tokens are written as `oklch()`, not hex.** The editor already
  stored, edited, and computed color in OKLCH; only the final CSS string was
  hex, which quantized every value to 8 bits on the way out. Derived colors now
  serialize as `oklch()` in the live `:root` and in `tokens.generated.css`, and
  `tokens.css` ships its 283 primitives in the same form. Values are still
  clamped into the sRGB gamut before serialization, so nothing changes color.
  Hex remains the readout and text-field format in the editor, and is still
  what you copy out.

  This sets a browser floor of Chrome 111, Safari 15.4, and Firefox 113
  (2023). Run `npx live-tokens migrate` to convert a vendored `tokens.css`; the
  transform is idempotent and touches values only, never names. Because it
  rewrites values rather than renaming them, it never auto-applies — the dev
  plugin will not touch your file.

  Any code of your own that parses these tokens as hex needs updating. Inside
  the package, the generator's contrast gate, the Color Story readouts, and the
  runtime background-contrast picker were the three such readers.

## 0.50.0 — Live editing stays in sync

### Added

- **Save and Adopt can capture every unsaved component.** When component
  editors have pending changes, the Theme panel offers to save them together
  before saving or adopting the theme, so the look on screen can be persisted
  without visiting each component editor first.

- **Font-weight choices follow the selected family.** The editor detects the
  weights available for project and Google fonts, keeps the current custom
  value visible, and avoids offering weights the font cannot render.

### Fixed

- **Theme changes paint as one transaction.** Loading, previewing, and applying
  a theme now update colors, type, and components together instead of exposing
  intermediate mixed states or flashing through the previous live look.

- **Editor controls react reliably to live token changes.** Reused selectors,
  gradient controls, linked aliases, typography, spacing, and component state
  now refresh when their bound variable or upstream token changes.

- **Component saves preserve migrated values.** Theme-level saves serialize
  the current component state consistently, including corrected migration
  handling for Section Divider and Corner Badge configurations.

## 0.49.1 — Automatic working-copy cleanup

### Fixed

- **Upgrades clean up 0.48's materialised working copies automatically.** At
  dev-server boot, a `_working.json` that exactly matches the active theme is
  removed. A differing buffer is preserved as unsaved work, so upgrading needs
  no manual migration and cannot discard real edits.

## 0.49.0 — Working buffers are active-theme deltas

### Changed (breaking)

- **Working buffers are deltas from the active theme.** Loading a theme now
  clears working buffers and changes only `themes/_active.json`; live reads
  resolve through the active theme. Saving removes buffers whose content is now
  durable, while deleting an active theme materialises only the deltas needed
  to preserve the visible look.

## 0.48.1 — Demo typography follows the theme

### Fixed

- **The demo hero follows semantic typography.** The subtitle and supporting
  tagline now take their font families from the heading and body text-style
  tokens, so changing the theme's primary font pairing repaints the whole hero.

- **Floating-tag connectors stay visible.** Connector strings choose the
  black or white invariant with the stronger contrast against the current page
  background, including backgrounds with multiple gradient stops.

## 0.48.0 — Themes are documents

### Added

- **Loading is preview first.** Picking a theme in the Load window paints
  it on the page while the window stays open: switch between looks freely,
  then Save to keep one or Cancel to return to exactly what you had,
  unsaved edits included. The preview is paint only; nothing touches disk
  until Save. A "Colors and type only. Keep my shapes" toggle previews and
  loads just a theme's palette and fonts over your current component
  shapes, and your own saved colors-and-type files appear in the same list
  under a badge, where that mode is implied.

- **One Theme panel.** The editor's separate colors-and-type and theme
  managers merge into a single panel: one identity, Save, Save As, Load,
  Import, Export. Colors & Type and a Components drift count appear as
  read-only parts inside it, the way a component shows its parts. The seven
  presets live in this panel's Load list and nowhere else. Save captures the
  look on screen, the colors and type you have been editing included, so
  there is no separate save first.

- **Adopt ships the whole look.** Production state and the Adopt action
  live on the Theme panel's root card: one action saves the open theme and
  publishes it, colors and type plus every component it carries, with one
  CSS regeneration. Component editors hold their own unsaved state, which
  the panel cannot write, so Save and Adopt both say how many components are
  waiting on their own editors before they run.

- **`generate-theme` turns a mood brief into a complete theme.** `npx
  live-tokens generate-theme <brief.json>` takes ten OKLCH seeds plus a
  scheme, assembles the full curve set, enforces AA contrast with automatic
  correction rounds, writes `themes/<slug>.json`, and opens it. The bundled
  `live-tokens-generate-theme` skill translates natural-language briefs
  ("dark and moody night theme", "St. Patrick's Day with green and gold")
  into seeds. Seven preset themes generated this way ship in the package:
  Autumn, Halloween, Midnight Study, Ocean, Royal Velvet, Spring Meadow,
  Sunset.

- **`adjust` moves shape and space along the token scales.** `npx
  live-tokens adjust <ops.json>` shifts or sets every matching radius,
  padding, gap, and border-width alias across component configs: relative
  shifts preserve the cross-component hierarchy, `--radius-full` is a
  gated rung so a global "softer" never silently turns the UI into
  capsules, and spacing moves along the editor picker's 12-step subset so
  every written value stays hand-editable. The result lands in each
  component's unsaved buffer, so save the open theme to keep it. The bundled
  `live-tokens-adjust-shape-space` skill maps "make the buttons pill
  shaped", "make the UI softer", "space it out" onto ops files.

- **Gradients travel with the theme.** The `--gradient-N` swatch tokens
  round-trip through colors-and-type files as a structured `gradients` field:
  the editable type, angle, and stops, not just the rendered CSS strings, which
  stay in `cssVariables` as a projection for production. Loading restores your
  tuned gradients; files saved before the field existed keep the stock set they
  rendered. `generate-theme` carries tuned gradients forward and rebuilds stock
  ones from the new theme's color families.

- **Themes are encapsulated.** A theme now carries its whole look by value
  (`schemaVersion: 3`): its full colors and type plus a copy of every
  non-default component config. Deleting any colors-and-type or component
  file never breaks a saved theme, and the import/export bundle is the same
  format as the file on disk. Existing pointer themes migrate on first
  dev-server start, resolving and embedding what they reference.

- **The seven presets ship as full example looks.** One theme per preset
  embeds its colors and type plus a distinct shape personality and a Google
  Fonts pairing: Halloween goes fully square with heavy borders and Mystery
  Quest, Midnight Study pairs sharp windows and round buttons with EB
  Garamond, and no two presets share a corner-radius and spacing profile or
  a font family. Load one to try the complete look, load Motion Proto to
  come back. `npm run generate:preset-themes` regenerates all seven from the
  component defaults.

### Changed

- **Themes are documents; the working set is a buffer. (breaking)** A theme file
  is the whole look, `themes/_active.json` names the one the editor has open,
  and `themes/_production.json` names the one your site ships. Anything not yet
  saved into a theme lives in one reserved slot per layer, `_working.json`, and
  a slot exists only where the look sits off the shipped default, so a new
  project has none. The per-layer `_active.json` / `_production.json` pointer
  files, about fifty in a full tree, are retired, and applying a theme no longer
  writes a copy of it under its own slug. The files that piled up, one set per
  theme sampled, go with the mechanism that made them.

- **Trying a theme no longer publishes it. (breaking)** Loading a theme used to
  set production in the same step, so sampling the presets rewrote
  `tokens.generated.css` behind your back. Loading now opens the theme and does
  nothing else. Adopt is the only action that changes what your site ships.

- **A component ships with its theme. (breaking)** Production is one saved theme
  rather than a mix of per-slice pointers, so a component editor's Adopt saves
  and publishes the open theme, that component with it. The per-slice promote
  door is gone.

- **Existing projects need one `npx live-tokens migrate`.** It starts with the
  directories: a project last opened on 0.47.1 or earlier keeps its colors and
  type in `data/themes/` and its whole looks in `data/manifests/`, so the
  migration moves `themes/` to `colors-and-type/` and `manifests/` to `themes/`
  before reading a single file. Then it heals what is inside. It reads what the
  retired pointers resolved to and records it as the production theme, keeps
  live state that had drifted from the open theme as a buffer, deletes the
  copies a saved theme already carries, and clears the pointer files. A file
  matching no theme is yours and is kept; the effective production output never
  changes without being written down as `themes/recovered-production.json`, so
  that file appearing is the normal outcome when your live look had drifted from
  the production pointers, not an error. `--check` prints the whole plan,
  renames included. Until you run it the dev server leaves the data directory
  alone: it writes nothing, rebuilds no CSS, refuses the editor's save doors,
  and prints what to run. Restart it afterwards.

  Two things to finish by hand. Token references that the migration repaired
  reach `tokens.generated.css` on the next save and adopt, not at migration
  time, so re-save your theme (make any edit, or Save As over it) and adopt it
  once. And a `.gitignore` entry for `data/themes/_backups/` or
  `data/manifests/_backups/` now names the wrong directory: any old backups move
  with their directory, so repath the entry to `data/colors-and-type/_backups/`
  or drop it.

- **`npm update` will not bring you here.** Pre-1.0 a caret range pins the
  minor, so `^0.47.1` never resolves to 0.48.0. Ask for it by name: `npm
  install @motion-proto/live-tokens@0.48.0`.

- **Re-copy the bundled skills.** `npx live-tokens setup-claude` copies the
  Claude Code skills into your repo's `.claude/skills/`. That copy is a copy: it
  does not follow the package, and a stale one describes CLIs and files this
  release changed. Run the command again after upgrading, with `--force` to
  overwrite.

- **The REST surface, before and after.** For anyone who proxies, mocks or
  scripts `/api/live-tokens/*`. A door retired in place answers 405, so a caller
  that still holds one gets an answer it can read. The `/manifests/*` paths are
  not retired in place: they are gone, and the middleware passes them through to
  your app like any unclaimed URL.

  | Before, through 0.47.1 | Now |
  | --- | --- |
  | `/themes`, `/themes/:name` (colors and type) | `/colors-and-type`, `/colors-and-type/:name` |
  | `GET /themes/active`, `PUT /themes/active` | `GET /colors-and-type/active`; writes go to `PUT /colors-and-type/working` |
  | `GET`/`PUT /themes/production` (colors and type) | `/colors-and-type/production`, 405 on every method |
  | `PUT /component-configs/:comp/active` | `PUT /component-configs/:comp/working` |
  | `GET`/`PUT /component-configs/:comp/production` | 405 on every method: a component ships with its theme |
  | `/manifests`, `/manifests/:name`, `/manifests/:name/apply`, `/manifests/:name/export`, `/manifests/import` | the same shapes under `/themes` |
  | `GET`/`PUT /manifests/active` | `GET`/`PUT /themes/active` |
  | new | `PUT /production`: adopt the open theme, the only door that publishes |
  | new | `GET /themes/production`: the whole theme your site ships |
  | new | `GET`/`PUT`/`DELETE /colors-and-type/working` and `/component-configs/:comp/working` |

- **Public API. (breaking)** `setActiveFile`, `setProductionFile`,
  `getProductionInfo`, the `ProductionInfo` type and the `activeFileName` store
  leave with the per-layer pointers they drove. `getProductionTheme`,
  `writeWorkingColorsAndType`, the `LiveSource` type and the `openThemeSlug`
  store arrive.

- **CLIs follow the model.** `generate-theme` writes `themes/<slug>.json` and
  opens it, instead of writing a colors-and-type file and flipping pointers at
  it. `adjust` writes each touched component's buffer; its `--no-activate` flag
  named files that no longer exist, so it is rejected with what to do instead.
  `live-tokens migrate` runs the data heal alongside the tokens.css migrations.

- **One Theme panel, one save and load surface.** The editor sidebar holds a
  single Theme panel: Save, Save As, Load with preview, Import, Export, the
  production state and Adopt at the root, with Colors & Type and Components
  as read-only parts under it. Colors and type stops being a file the user
  manages: no list, no Save, no Save As, no lifecycle of its own. It names
  the two faces the page is showing, and no working file name appears
  anywhere in the panel.

- **Load can take colors and type alone.** "Colors and type only. Keep my
  shapes." in the Load window previews and applies just the palette and the
  fonts, leaving every component setting as it is. Older colors and type
  files are listed there too, marked, and picking one is always that
  narrower load. `GET /colors-and-type` marks each file `isPackage`, so a
  local copy of a shipped preset stays reachable while the presets
  themselves are offered once, as whole themes.

- **The Default theme is written and regenerated at boot.** It is a full set
  derived from the package default colors and type and each component's
  `:global(:root)` defaults, rewritten whenever the derived content drifts
  and restored if deleted outside the file manager. The package no longer
  ships the file; a consumer's boot always materializes a current local
  copy.

- **Almost everything is deletable.** Colors-and-type and component files are
  presets now, so nothing live points at one and any of them can go. Deleting
  the theme you have open is legal too: the buffer survives its document, so
  the look on screen stays, and open heals to the shipped version if one
  shadows it, otherwise to Default. Three refusals remain, each about
  something a delete would break: the protected `default` name, the theme in
  production, and a shipped file with no local copy.

- **Load applies the complete look.** Loading a theme opens it: its embedded
  copies fill the working buffer and components it does not carry go back to
  their defaults. Components that are not installed are skipped and reported
  instead of silently ignored.

- **"Manifest" retires; a theme is the whole look.** The file that carries a
  complete look is a **theme**, and the colors-and-typography layer inside it
  is **Colors & Type**. Every surface follows: `data/manifests/` →
  `data/themes/` and the old `data/themes/` → `data/colors-and-type/`;
  `/api/live-tokens/manifests/*` → `/api/live-tokens/themes/*` and the old
  `/api/live-tokens/themes/*` → `/api/live-tokens/colors-and-type/*`; the
  public exports `listManifests`, `applyManifest`, `saveAsManifest` and their
  siblings become `listThemes`, `applyTheme`, `saveAsTheme`; `npm run
  generate:preset-manifests` and `collapse:manifest` become
  `generate:preset-themes` and `collapse:theme`. The manifest family never
  shipped, and the routes ship as a matched client and server pair, so no
  compatibility shim exists anywhere. The one key a consumer must act on is
  below.

- **Config keys follow the vocabulary.** `themesDir` now names the whole-look
  directory, the meaning `manifestsDir` used to carry; the new
  `colorsAndTypeDir` names the colors-and-typography directory that
  `themesDir` used to name. A consumer that set `themesDir` in
  `live-tokens.config.json` before this release must rename it to
  `colorsAndTypeDir`.

- **A theme file is `schemaVersion: 3`.** The embedded key `theme` becomes
  `colorsAndType`. The boot migration carries a v1 pointer file or a v2
  encapsulated file to v3 in one pass. Export writes `kind: "theme-bundle"`
  at that version; the `manifest-bundle` kind every release through 0.47.1
  wrote is still imported, and only at its own v1, so a crossed pair stays
  rejected.

### Fixed

- **Dead shape and space keys dropped from every colors-and-type file**
  (colors-and-type schema version 4): the `--badge-trait-*`,
  `--sectiondivider-padding`, and `--dialog-{primary,secondary}-*` shape keys
  had no consumers since their components were restructured; a migration
  removes them from `cssVariables`.

- **Line-height references follow the scale that was renamed under them**
  (colors-and-type schema version 5, component-config schema version 21):
  0.41.0 reshaped `--line-height-{xs..xl}` into leading vocabulary in
  `tokens.css`, but nothing carried a saved file's references across, so every
  one of them pointed at a token that no longer existed. Both layers now migrate
  on load, a colors-and-type file's `cssVariables` and a component config's
  alias values alike: `xs` to `none`, `sm` to `tighter`, `md` to `normal`, `lg`
  to `relaxed`. The retired 2.0 slot (`xl`) lands on `relaxed`, the nearest
  surviving step, which is a visible change to any line that used it.

- **A colors-and-type file left among the themes is refused, not read as a
  theme.** Both kinds carry a `schemaVersion` and the sequences overlap, so one
  parsed as a current theme whose colors resolved to the package default: it
  listed as a theme that painted the shipped look, and the boot migration
  rewrote it, taking the palette with it. Every door that reads a theme off disk
  now checks the shape, answers 422, and leaves the file alone.

- **Adopting while a shipped theme is active records the adoption.** The
  adopt path used to return success while writing nothing when the active
  theme resolved from the package; it now forks the theme locally,
  shadow-and-restore style.

- **Orphan component-config directories removed** (`detailnav`, `stateditor`,
  `slotprobe`, `floatingtokentags`): no shipped component reads them.

- **`collapse-theme-to-default` no longer drops `harmonyAxes`** or coerces a
  missing `fontStacks` to an empty object when baking a theme into the
  shipped defaults.

### Known limitations

- **Production freshness resets on reload.** Nothing on disk records when the
  last bake happened, so the editor tracks it for the session. Save a theme
  after adopting it and the panel reads "out of sync" until you adopt again,
  which is right; reload the page and it reads "in production" again while the
  baked CSS is a version behind. Adopt when in doubt, it costs nothing to
  repeat.

## 0.47.1 — Straightened curves

### Fixed

- **`setCurveAnchor` could insert a handle that overran its neighbour.**
  A fresh anchor's tangent handles were sized from the gap alone, so an
  interior anchor placed past roughly the curve's midpoint could leave the
  new segment non-monotone in x — the one thing `sampleCurve`'s binary
  search cannot survive. Insertion now scales the neighbours' facing
  handles by the share of the gap each keeps, the same rule de Casteljau
  uses, and gives the new anchor only the room left over; `liftCurveAnchor`
  reverses it on removal.

- **The default theme's curves are regenerated to their endpoints.** The
  shipped `default.json` carried curves hand-dragged in the editor: two
  palette-lightness curves had handles overrunning an interior anchor
  (the bug above, already on disk), and a text-saturation curve overshot
  its own endpoint. All 80 curves are now straight interpolations between
  their designed endpoint values, with the one base-color placement per
  family per curve kept and pinned to its historical step. Full audit in
  `docs/plans/default-theme-curve-audit.md`.

## 0.47.0 — Colors and Tokens hand palettes to each other

### Added

- **Jump buttons link the two palette surfaces.** `PaletteJumpButton` sits in
  the Colors view's Palette header (`Edit`, into Tokens) and on every Tokens
  palette label (`Wheel`, into Colors). The new `paletteFocus` store carries the
  family across: `selectedPalette` is now the Colors view's selection, so the
  wheel is already showing the handed-over family when the switch lands, and the
  one-shot `pendingPaletteFocus` opens the matching Tokens editor and scrolls it
  into view. From the standalone Colors page the jump also navigates, since that
  page has no Tokens surface to flip to.

- **`On assign` picks which hue survives an axis assignment.** A segmented
  control above the axes list chooses between `Adopt swatch`, which moves the
  axis to the color's hue and leaves the harmony custom, and `Adopt axis`, which
  repaints the color onto the hue the axis already holds. Adopting the axis
  moves no axis geometry, so an applied harmony mode survives the assignment.
  `bindFamilyToAxis` takes the mode as a third argument and reconciles a traded
  occupant the same way.

- **The base color anchor unlocks from the curve.** Double-clicking the locked
  anchor in the lightness or saturation curve raises a confirm notice, and
  accepting clears `anchorToBase`. The anchor carries a `<title>` saying so.

### Changed

- **The Tokens base color panel stays open with the curve editors.** Opening a
  palette's controls pins `ColorEditPanel` in live-apply mode (no confirm or
  cancel session) and marks the header swatch active, so base edits and curve
  edits are visible at once.

- **`UIMenuButton` portals its menu to the enclosing `.editor-page`.** A dimmed
  ancestor's opacity faded the popup and showed the page through it, which fixed
  positioning alone cannot escape. The `--ui-*` tokens are scoped to
  `.editor-page`, so the menu reparents there rather than to `<body>`.

- **The axes list drops its per-row role column.** `Anchor` names the first row
  from a caption above the list, so no row reserves 4rem of dead space for a
  word only one of them carries.

## 0.46.1 — The Colors view collapses on its own width

### Fixed

- **Colors view collapses by pane width, not viewport width.** `.pane` is now a
  `container: pane / inline-size`, and the harmony columns (`44rem`) and wheel
  rail (`26rem`) collapse against it. The pane is one column of a two-pane grid,
  so a wide standalone window narrowed it just as the docked panel does while
  the old `@media (max-width: 720px)` query never fired.

- **Swatch rows and derived-scale strips rank instead of shrinking to slivers.**
  Below `28rem` of their own container both switch from flex to
  `repeat(auto-fill, minmax(...))` grids, keeping a readable chip width and
  wrapping into ranks. `auto-fill` holds the tracks steady, so a short last rank
  never stretches.

- **`UIMenuButton` anchors correctly inside a container-type ancestor.** A
  `container-type` (or transformed) ancestor re-parents a fixed element's
  containing block off the viewport origin, so the menu landed offset from its
  computed position. It now measures where it landed and re-anchors.

## 0.46.0 — Harmony axes are numbered, and you assign them with a picker

### Changed

- **The four harmony axes are numbered, not named.** `AXIS_ROLES`
  (`Anchor`/`Secondary`/`Tertiary`/`Quaternary`) is deleted; every call site
  routes through the new `axisLabel(index)`, and only axis 1 keeps a word.
  Rows read `1 Anchor`, `2`, `3`, `4`. History entries read `colors: axis 3
  hue`, `colors: anchor rotate`, `colors: assign Brand`, `colors: unassign
  Brand`. Aria and titles drop the doubled "axis": `Rotate axis 3 hue`,
  `Brand, on axis 2 of 4. ... Delete to unassign.` `bindFamilyToAxis` and
  `unbindFamily` keep their names, so the model verb is unchanged.

- **One source of truth for axis status.** `axisStatuses(mode, axes)` replaces
  the three per-surface derivations off `modeActiveAxes`, so the swatch row,
  the wheel and the axes list can no longer disagree about a family bound to an
  axis the current mode gives no position. That family now reads as
  bound-and-off-wheel everywhere: the list keeps its chip at full strength and
  states `Off the wheel · <Mode> uses N`, the free dot carries its axis numeral and
  says why it left the ring, and the swatch row's mark tracks the same status.
  Unused rows replace the bare "Empty" with their reason. New helpers
  `activeAxisCount` and `axisLabel` keep those strings out of per-call-site
  composition.

- **Assigning a family to an axis is a picker.** Each row opens an `Assign to
  ...` menu listing the eligible families, with meta reading `moves from
  anchor` / `moves from axis 2`. Dragging a chip onto an axis still works and
  is now the accelerator, not the only path. The axes description leads with
  the click path and mentions drag second.

- **The Colors view is laid out around the wheel.** Color Harmony and Harmony
  axes sit side by side, the family swatches tuck under the harmony presets,
  the axes list moves under the mode row, and the selected color's edit panel
  moves under the wheel with the lightness bar inside it and Absolute Chroma in
  its header. The three slider rows are grid-aligned on one column set.

- **`Special` moves ahead of `Canvas` in `PALETTE_SPECS`.** It reorders the
  family list in the editor and the block order in
  `src/live-tokens/data/tokens.generated.css`. No token name is added, renamed
  or removed, so no migration applies.

- **SectionDivider's eyebrow letter-spacing default is
  `--letter-spacing-normal`.** All three sizes previously defaulted to
  `--letter-spacing-wide`. Consumers on a saved component config keep their own
  value; consumers on `default` pick this up.

### Added

- **`UIMenuButton`**, the shared editor menu-button behind the axis picker.
  `aria-haspopup="menu"`, arrow navigation that wraps, Home/End, and dismissal
  on Escape, Tab or outside mousedown, each pinned by a test. Internal to the
  editor; it is not exported from `@motion-proto/live-tokens/ui`.

- **`AxisNumeral`**, the one numeral treatment shared by the swatch row, the
  wheel and the axes list.

### Removed

- **The tint-neutrals button.** Absolute Chroma sits beside the harmony presets
  and covers the case.

- **Chrome the surfaces did not need.** The Theme eyebrow and the panel's
  preview square in the Colors view, the Proportional preview eyebrow, and the
  inline axes description, which is now an info icon. Selected rows lose the
  third emphasis signal on `.role`: the settled treatment is inverted numeral
  plus one row border.

## 0.45.0 — The Color Story shows the tokens you actually have

### Fixed

- **The Color Story's text steps read the live tokens.** The primary, secondary
  and tertiary row rendered the values the *Even neutral steps* pill would have
  written, not the current ones, so the same step could report two different
  ratios in the same frame (the Canvas header said 17.9:1 while the row said
  14.7:1). Each step now resolves `--text-primary` / `--text-secondary` /
  `--text-tertiary` through the same path the functional chips and tone pills
  already used, renders in its own token, and reports its real contrast against
  the canvas.

### Removed

- **The Color Story's action pills.** *Raise all text to AA*, *Even neutral
  steps*, and the *Anchor at pure white/black* toggle, added in 0.44.0, are
  gone. The story is a proportional preview, and authoring text steps from it
  put a second palette editor next to the real one. Text steps are edited in
  the Tokens view.

- **The text-contrast solvers.** `solveTextContrast.ts` and `recommendText.ts`
  (plus `applySolvedTextCurves` and `applySuggestedNeutralText`) backed only
  those pills and are deleted. Both were internal to `src/editor/core/palettes/`
  and never reachable through the package exports, so no consumer import
  changes. `BW_GUARD_MIN_L` / `BW_GUARD_MAX_L` are unaffected: they live in
  `paletteDerivation.ts` and still guard derived inverted text.

### Changed

- **The story's prose lines and its unlabeled header ratio are gone.** The three
  sentences under Canvas ("The dominant surface. Body text sits here." and its
  two siblings) said nothing the labelled steps don't, and the ratio beside the
  Canvas heading was primary's, measured but never named. The stacked steps
  carry all three ratios now.

## 0.44.0 — Every text step derives to body contrast

### Added

- **A full-page Colors route.** `/live-tokens/colors` renders the Colors editor
  as its own page, alongside the existing editor and components routes, and is
  auto-appended to the dev nav rail. New `@motion-proto/live-tokens/colors`
  export for consumers mounting it themselves, and a new `colors` key on
  `editorRoutes` to relocate it or pass `false` to disable it. Entering the
  route flips the overlay off its Colors view so the two surfaces never stack.

### Changed

- **Selection reads across every Colors surface.** Picking a family used to
  highlight only its swatch. Its harmony-axis row and chip now light up, and on
  the wheel its rail thickens to full contrast while its axis numeral goes
  white and the others step back. Axis chips are clickable to select.

- **The Color Story is a readout, not a control panel.** Its "Use suggested"
  button and "Use black and white" checkbox moved out to three pills above the
  story: *Raise all text to AA* (every family, contrast-first), *Even neutral
  steps* (Neutral only, hierarchy-first), and an *Anchor at pure white/black*
  toggle. The old labels named neither the scope nor the effect, which are what
  separate the two actions; each pill now carries the full explanation on hover.
  The AA-reach line is gone.

- **Color swatches hold their position.** Both swatch rows were sorted by
  luminance, so editing a color's lightness reshuffled the row under the
  pointer and stuttered mid-drag. They render in declaration order now.

- **`--text-muted` now derives to 4.5:1, not 3:1.** The neutral text ramp
  guaranteed muted at the WCAG AA floor for *large* text, one step below
  `--text-tertiary`, on the assumption it would only ever be set at 24px (or
  18.66px bold). Nothing in the token's name or its position in a ramp of text
  colors carried that condition, so consumers reached for it as a quiet body
  color and shipped text below AA — in the first site audited, all eleven uses
  were 13–16px, every one of them failing. `--text-muted` joins primary,
  secondary and tertiary on the 4.5:1 body floor, which leaves `--text-disabled`
  as the ramp's only sub-AA step, and WCAG 1.4.3 exempts disabled controls.
  `AA_LARGE` is unchanged and still floors the graded chromatic steps.

  Derived palettes get a lighter (dark scheme) or darker (light scheme) muted
  step the next time text contrast is solved. **A theme already on disk keeps
  its stored curve** — its `--text-muted` does not move until the palette is
  re-solved, so a consuming site that has shipped muted on small text must
  either re-derive or restate those colors itself.

  Expect muted and tertiary to derive to nearly the same color: both target the
  default surface, so both settle just past the same floor (on the reference
  dark palette, tertiary `#94999c` 4.58:1 and muted `#96989a` 4.55:1). That is
  arithmetic, not a rough edge — a step quieter than tertiary cannot also clear
  tertiary's floor. Treat `--text-muted` as an alias of `--text-tertiary` for
  now; reach for `--text-disabled` when a genuinely quieter, non-AA step is
  wanted, and expect a decision on deprecating one of the two.

## 0.43.0 — The editor opens on Tokens

### Changed

- **The editor's view no longer carries across sessions.** Opening the editor in
  a fresh tab always lands on Tokens; previously it restored whichever of
  Tokens / Colors / Components you last used, so a session that ended on Colors
  reopened there indefinitely. `editorViewStore` moved the active view from
  `localStorage` to `sessionStorage`, which keeps the two things that did depend
  on the round-trip: the parent window and the overlay iframe stay in sync (same
  tab, same origin, so they share one storage area and its `storage` events),
  and an in-page deep link that calls `setEditorView()` before opening the
  overlay still lands on the view it asked for. The sidebar's condensed/expanded
  state is a durable preference and stays in `localStorage`. A stale
  `lt.editorView` left in `localStorage` by an earlier version is ignored, not
  migrated.

## 0.42.0 — Canvas, and every ramp places its base color

### Changed (breaking)

- **The "Background" palette family is renamed to "Canvas".** Its CSS namespace
  was always `canvas` (`--color-canvas-*`, `--surface-canvas-*`), and every other
  surface that names the family already said Canvas: the token selector,
  SectionDivider's variant families, the shadows backdrop picker. Only the
  palette label said Background, so the label joins the namespace. **No token
  names change**, so consumer CSS is unaffected. The label doubles as a storage
  key, so theme migration `2026-07-29-background-palette-to-canvas` renames the
  `editorConfigs` key and any `harmonyAxes` family binding. It applies
  automatically both when a theme file loads and when a persisted editor session
  hydrates, and it runs before the axes are sanitized, which would otherwise drop
  the now-ineligible family and silently unbind the axis. The shipped
  `default.json` is rewritten under the new key.

### Added

- **The Colors view's swatch rows read as ramps.** Both rows (core families and
  functional families) order their swatches by base-color luminance, light to
  dark, matching the palette ramps. The selected swatch dock-magnifies through
  the same `dockGrow` policy the palette grid and the derived-scale strip already
  share, and it animates to its new position as its lightness is dialed, so the
  selection is legible while it walks the row.

### Removed

- `Theme.harmonyOrder` and its migration path. The field only ever existed
  between v0.40.1 and v0.41.0, superseded by `harmonyAxes` inside the same
  release cycle, so nothing on disk carries it: a 0.41.0-saved theme wrote both
  fields and `harmonyAxes` was already authoritative on load. Themes with
  neither field still resolve to the default axes, with the unbound Quaternary
  offset from the anchor's own hue.

### Fixed

- **Palette ramps now show the enlarged slot for the step the base color sits
  at.** The dock magnification keys off `anchorPlacement`, which the July 24
  migration only wrote for configs carrying the legacy locked-500 curve anchor;
  a palette whose `anchorToBase` was on but never re-edited had no placement, so
  its ramp never magnified anything. Theme migration
  `2026-07-29-place-base-anchors` places those configs up front by pinning the
  base color at the step whose curve lightness is nearest the base L, the same
  thing a base-color edit has always done. It applies on theme load and on
  session hydrate, skips configs that are already placed or have `anchorToBase`
  off, and self-sunsets once every theme has been resaved with a placement.

### Migration

- Both migrations in this release are **theme-file migrations**: they run
  automatically when a theme loads and when a persisted editor session hydrates.
  No token names changed, so `tokens.css` is untouched and there is nothing for
  `npx live-tokens migrate` to do. Consumers upgrade by bumping the dependency.

## 0.41.0 — A Colors view, and semantic text styles

### Added

- **Colors: a third editor view, next to Tokens and Components.** It has two
  sections. **Wheel** is a saturation-radial harmony wheel where every color
  family that participates in harmony sits on a rail, with external rotation
  handles per family plus one global rotation handle, a lightness bar under the
  wheel, and an Absolute Chroma toggle that governs whether radius reads as
  absolute or relative chroma. Nine harmony modes (complementary,
  split-complementary, triadic, tetradic, compound, square, analogous,
  monochromatic, custom) are picked from a row of geometry icons that draw the
  mode's actual axis layout. Two one-shot actions sit alongside: "Tint neutrals
  from anchor" re-hues Neutral and Alternate to the anchor color while keeping
  their own chroma and lightness, and "Derive accessible text" solves each
  family's Text lightness curve so the derived text clears WCAG AA against the
  surfaces it sits on. Both are a single undo.
- **Color Story: a proportional preview of the theme, built from seeds.** It
  paints the seed base colors in their intended proportions rather than the
  derived `--surface-*` tokens, so it tracks the wheel one-to-one, and it renders
  the neutral text ladder (primary / secondary / tertiary) on each band with live
  contrast readouts.
- **Suggested neutral text hierarchy.** Color Story proposes a text ladder
  anchored on the current primary, deriving secondary and tertiary as two even
  OKLCH-lightness drops toward the background: hierarchy first, with AA (4.5) as
  a floor rather than the driver. The floor is solved against the adverse extreme
  of the neutral surface band, so a compliant suggestion holds AA on every band
  surface; when the seed's reachable lightness window cannot span the band, it
  falls back to the default surface and reports the reduced coverage. Coverage
  alerts are informational and never block. "Use suggested" writes the Neutral
  Text curve; "Use black and white" is available as the blunt alternative.
- **Harmony runs on four fixed axes.** Anchor, Secondary, Tertiary and
  Quaternary each own a hue whether or not a family is bound to them, and a new
  Harmony axes list binds and unbinds families per axis. Neutral and Alternate
  join Brand, Accent, Background and Special in the harmony-eligible pool.
  Harmony rotates hue only: each palette keeps its own chroma and lightness.
- **Semantic text styles: a role layer over the type primitives.** Eight named
  style bundles ship in `tokens.css` (`heading-xl/lg/md/sm`, `body-md/sm`,
  `code`, `eyebrow`), each a set of per-axis aliases (`--heading-xl-font-family`,
  `--heading-xl-font-size`, `-font-weight`, `-line-height`, `-letter-spacing`,
  plus `--eyebrow-text-transform`). Every value aliases an existing primitive
  scale, so editing a style re-points an alias rather than minting a raw value,
  and the responsive size shrink carries through for free. Additive migration
  `2026-07-20-semantic-text-styles` (`kind: 'additive'`) inserts the bundle block
  into a consumer's vendored `tokens.css`.
- **Text Styles table in the editor.** Tokens → Typography gains a row per style
  with pickers for family, size, weight, line-height and letter-spacing, plus a
  text-transform picker on `eyebrow`, the one style that carries that axis.
  `site.css` and the first-party surfaces consume the style layer instead of
  re-declaring the same per-element type rules.

### Changed (breaking)

- **The line-height scale is reshaped from size vocabulary to leading
  vocabulary.** `--line-height-xs/sm/md/lg/xl` become
  `--line-height-none/tightest/tighter/tight/normal/relaxed`
  (1, 1.1, 1.25, 1.35, 1.5, 1.75). Old values map by ratio: `xs`→`none`,
  `sm`→`tighter`, `md`→`normal`, `lg`→`relaxed`; `xl` (2) has no slot in the new
  scale and is dropped. Line-height now names by effect, matching the
  letter-spacing scale. Token names are public API, so this ships with the paired
  migration `2026-07-20-line-height-rename` (`kind: 'breaking'`); a consumer
  applies it via `npx live-tokens migrate`, which rewrites their vendored
  `tokens.css` declarations and every `var()` reference.
- **Palette state is numeric OKLCH, not hex.** `PaletteConfig.baseColor` and
  `overrides` change from hex strings to `{ l, c, h }`. The store holds the
  user's unclamped intent and gamut clamping becomes projection-only, applied at
  derivation output, canvas painting and CSS serialization. This removes the
  hex round-trip that made wheel and slider gestures wobble. Theme migration
  `2026-07-21-palette-oklch-basis` converts saved themes on load.
- **The base-color anchor can sit at any step.** The old "lock base color to
  position 500" flag becomes `anchorPlacement`, which records the step it pins
  and remembers the anchor it displaced, so moving or releasing the placement
  restores what was there. Theme migration `2026-07-24-base-anchor-placement`
  adopts the legacy locked-500 anchor.
- **The solid page background is the Background base color.** It used to be a
  separately selected palette step (`emptyStep`), which is removed. Theme
  migration `2026-07-25-background-spot-to-base` adopts the color the old spot
  actually rendered, curves and overrides included, so a saved theme's page
  renders identically. Gradient-mode configs are untouched.
- **`Theme.harmonyOrder` is superseded by `Theme.harmonyAxes`.** The old field is
  still read when `harmonyAxes` is absent, and still written on save so older
  builds keep loading the file.
- **Token names are otherwise unchanged.** The palette changes above are theme
  schema changes, not `tokens.css` migrations, and every theme migration applies
  automatically when a theme loads.

### Removed

- `TextTab` (`src/editor/ui/TextTab.svelte`) and its re-export. It was never
  mounted; the Text Styles table supersedes it.

### Fixed

- The `2026-07-20-semantic-text-styles` migration set `--body-sm-line-height` to
  `--line-height-normal` while the package default is `--line-height-tight`. A
  migrating consumer now lands on the same value as a fresh install.
- Vitest snapshots (`**/__snapshots__/**`) are excluded from the published
  tarball.

### Migration

- Run `npx live-tokens migrate` to apply the two `tokens.css` migrations. The
  line-height rename is `breaking` and never auto-applies, so it rides that
  explicit command. Both are idempotent.

## 0.40.1 — Floating token-tag labels follow the theme

### Fixed

- **The property label on each floating token tag no longer paints a hardcoded
  pink.** `.ftt-float-property` in `FloatingTokenTags.css` hardcoded
  `color: #ff8eeb`; it now references `var(--text-secondary)`, so the overlay
  label tracks the neutral text scale like the rest of the editor chrome instead
  of standing out in an off-theme accent.

## 0.40.0 — New IconButton component

### Added

- **`IconButton`, an icon-only sibling of `Button`.** It shares Button's six
  variants (primary, secondary, outline, success, danger, warning), three states
  (default, hover, disabled), and two sizes (default, small), but renders a
  single icon with no text. It is square (symmetric padding plus `aspect-ratio`),
  exposes the icon colour as a first-class per-variant, per-state token, and
  drops Button's text-typography properties. Its tokens live in their own
  `--iconbutton-*` namespace, so styling it never affects Button. Because the
  control has no visible text, `ariaLabel` is required. Editable in the editor
  under Components, with the same linked base block (padding, radius, border
  width, icon size) that links across variants.

### Notes

- Additive only. No token renames or `tokens.css` migration, so existing
  consumers are unaffected; the new component ships its defaults in its
  `:global(:root)` block like every other.

## 0.39.0 — One unified palette model (no gray "mode")

### Changed (breaking)

- **The chromatic/gray palette split collapses into a single OKLCH (Lightness /
  Chroma / Hue) model.** A neutral is no longer a special "mode"; it is an
  ordinary low-chroma palette with calm defaults (a low but non-zero base chroma,
  a wider neutral lightness ramp). One derivation path (`computePaletteColor`)
  now serves every palette, and the Neutral / Alternate editors show the same
  full L/C/H picker, lock-to-500 toggle, and derived-scale snapping as accents.
  `PaletteConfig` drops its gray vocabulary (`tintHue`, `tintChroma`,
  `grayLightnessCurve`, `graySaturationCurve`); `baseColor`, `lightnessCurve`,
  and `saturationCurve` are now universal, and the internal `mode` prop is
  removed from the palette editors.
- **Token names are unchanged** — this is a theme-config schema change, not a
  `tokens.css` migration, so no consumer CSS or token references are affected.
  The shipped `default.json` was regenerated; the neutral shift is sub-1-LSB per
  channel and every derived `--surface-*` / `--text-*` / `--color-*` token is
  byte-identical.

### Fixed

- **A component's surface control no longer vanishes when its fill is a flat
  colour.** `componentGradientSource` returned `undefined` for any non-gradient
  alias and `GradientEditor` renders only `{#if gradient}`, so the surface editor
  disappeared whenever a fill was a plain colour (e.g. SectionDivider's default
  transparent). The editor now synthesizes a none/solid single-stop snapshot from
  a flat (or absent) alias so the type picker always renders, and promotes the
  flat alias to a real gradient on first edit. SectionDivider's section heading is
  renamed "Background" → "Surface" to match Panel and disambiguate it from the
  preview backdrop control.
- **Palette colour overrides now apply live while you drag.** A new Text /
  Surfaces / Borders override previously reached neither the live page nor the
  preview swatch until commit — `handleColorChange` only wrote to the store when
  the key was already an override. Every drag tick now writes (the open session
  collapses to one undo entry; cancel/confirm clean up no-ops), and the per-step
  hex text tracks the live colour too.

### Migration

- **Consumer themes migrate automatically on load.** `unifyGrayPalettes` (run in
  `loadFromFile` after `renamePrimaryPaletteKey`) close-maps existing neutrals to
  the unified form: `baseColor` snaps to the effective step-500 colour (preserving
  the subtle tint and the neutral lightness ramp), the saturation curve becomes
  flat-100, and the palette is locked to base. Every palette drops the four
  vestigial gray fields, and the `gray-lightness` / `gray-saturation` curve-offset
  keys fold into `lightness` / `saturation`. Default and flat-saturation neutrals
  are visually identical; only a hand-shaped gray *saturation* curve migrates
  approximately and may want a quick manual retune.

## 0.38.0 — Overridable scroll reset for smooth-scroll hosts

### Added

- **`setScrollReset(fn)` lets a host route navigation's scroll reset through its
  own scroll system.** On a non-hash `navigate()` the router resets the viewport
  to the top. That default calls `window.scrollTo(0, 0)`, which is invisible to
  consumers driving scroll with a smooth-scroll library (Lenis, Locomotive):
  their scroll position is decoupled from the window, so the rendered page stays
  put — most visibly when `LiveTokensRouter` intercepts an in-page link (e.g. a
  card) and the new page opens mid-scroll instead of at the top. Register a reset
  that drives your provider (`setScrollReset(() => lenis.scrollTo(0, { immediate: true }))`)
  and both the overlay's nav and intercepted links reset correctly. Hash targets
  still skip the reset so in-page anchors are unaffected. Backward compatible —
  unset, the native `window.scrollTo` behavior is unchanged.

## 0.37.0 — ImageLightbox `capNatural` accepts a multiple

### Added

- **`ImageLightbox`'s `capNatural` now takes a number as well as a boolean.**
  `true` still caps the open fit at 1:1 (100%); a number caps at that multiple of
  the source's natural resolution (`capNatural={2}` = up to 200%). This allows a
  small source to open a little larger than native without being upscaled all the
  way to the viewport. Backward compatible — the boolean form is unchanged.

## 0.36.0 — ImageLightbox `capNatural`: stop upscaling small sources

### Added

- **`ImageLightbox` gains a `capNatural` prop.** By default the modal opens
  fitted to the viewport, which upscales a small source (e.g. a low-res GIF or
  screenshot) until it looks soft. Set `capNatural` and the open fit is clamped
  to the source's natural resolution (100%, 1 source px = 1 screen px), so small
  images stay crisp while larger ones fit the viewport exactly as before. It only
  bounds the initial open; pair it with `maxZoom={1}` to also stop the `extended`
  zoom controls from magnifying past 100%. Needs the natural pixel size (from
  `width`/`height` or the loaded image) — until that's known the image fits the
  viewport, then snaps to the cap once measured.

## 0.35.0 — Dev routes moved to a reserved `/live-tokens/*` namespace

### Changed (breaking)

- **The package's dev-only routes moved under a reserved `/live-tokens/*`
  namespace:** `/editor` → `/live-tokens/editor`, `/components` →
  `/live-tokens/components`, `/docs` → `/live-tokens/docs`. These routes are
  `import.meta.env.DEV`-only and never appear in production, so the longer paths
  cost nothing where users actually see URLs. Reserving a namespace means a
  consumer's own `/docs` or `/components` page no longer collides with a package
  route, and any owned route added in a future release stays inside the namespace
  (no surprise collisions on a version bump). Relocate or disable any of them via
  the `editorRoutes` prop exactly as before.

### Fixed

- **A consumer page at `/docs` or `/components` no longer crashes the app.** The
  package auto-injected nav entries at those paths; a consumer page at the same
  path produced a duplicate key in the overlay's keyed nav list and threw an
  uncaught error, and silently shadowed the consumer's page at dispatch. With the
  reserved namespace the collision cannot occur, so `editorRoutes.docs = false`
  is no longer needed to dodge it.
- **`editorRoutes.components` relocation now also moves the overlay's
  components-view pairing**, which previously compared a hardcoded `/components`.

### Migrating

- **`npx live-tokens migrate` now flags hardcoded route references.** If your
  source navigates to the old paths (e.g. `navigate('/editor')` from the old
  scaffold, or `<a href="/components">`), `migrate` reports each one with its
  file, line, and suggested `/live-tokens/*` replacement. Add `--write` to
  rewrite the unambiguous ones automatically. `/docs` is never auto-rewritten
  (you likely own that route), and any path you declare in `pages` or relocate
  via `editorRoutes` is left for manual review. The editor stays reachable via
  the dev overlay regardless, so this only affects hardcoded shortcut links.

## 0.34.0 — Token-as-API contract guardrail; opt-in autoMigrate

### Added

- **Token names are now a versioned API contract, with a guardrail.** Each
  `tokens.css` migration declares `kind: 'additive' | 'breaking'`. A new
  `check:token-contract` (wired into `prepublishOnly`, plus
  `tokensCssMigrations/contract.test.ts`) verifies behaviorally that an additive
  migration never removes or renames a token (catches a breaking change shipped
  as backward-compatible), and gates breaking migrations on a major bump from
  1.0.0 (pre-1.0 it warns). See TOKENS.md and RELEASING.md.
- **`themeFileApi({ autoMigrate: true })`.** Opt-in: the dev server applies
  pending **additive** token migrations to your `tokens.css` at startup and
  writes the file (shown in git), so it stays current with the package without a
  manual step. Breaking migrations are never auto-applied. Off by default, which
  preserves the invariant that the plugin never writes `tokensCssPath` unless you
  enable it.

### Docs

- **`TOKENS.md`** gained a plain-language section on how token changes are
  versioned (additive vs breaking, what an upgrade can and cannot change).

## 0.33.1 — Ship the changelog in the package

### Fixed

- **`CHANGELOG.md` now ships in the published package.** The `files` allowlist in
  `package.json` omitted it, and npm only auto-includes `package.json` / `README` /
  `LICENSE` on top of an allowlist, so every tarball through 0.33.0 shipped without a
  changelog. Added it to `files`. Consumer tooling that diffs changelogs across versions
  could not see one before this.

## 0.33.0 — ImageLightbox maxZoom cap

### Added

- **`ImageLightbox` `maxZoom` prop.** Caps how far the `extended` zoom controls can
  magnify, as a multiple of the image's natural resolution: `maxZoom={1}` = 100% of the
  source's real pixels (1 source px = 1 screen px), `maxZoom={2}` = 200%. The modal
  always opens fitted to the viewport; this only bounds zoom-in. An image whose fitted
  size already exceeds the cap can't be zoomed in (the control disables). Per image in a
  gallery. Reads the natural pixel size from `width`/`height` or the loaded image; until
  that's known the previous 5×-the-fit cap applies. The toolbar percent stays
  fit-relative (fit = 100%).

## 0.32.0 — Image grow-vs-mask zoom; canonical easing/color/type primitives

### Added

- **`Image` `overflowScaling` prop.** When hover zoom is active, `overflowScaling`
  decides what the scale grows. `true` (default) scales the content inside the fixed
  frame, masked by overflow (the existing behavior). `false` scales the whole framed
  image so it grows past its layout box. `undefined` inherits the editor's global
  default. Set on its own (without `zoom`) it forces zoom on in the chosen mode. Backed
  by a new `--image-grow-hover` token; at most one of `--image-zoom-hover` /
  `--image-grow-hover` is ever active. The Image editor gains an "Overflow scaling (mask
  zoom to frame)" checkbox alongside "Use zoom on hover".
- **Canonical Layer-1 primitives now ship in `tokens.css`** and are carried to vendored
  copies by a paired migration (`2026-06-04-easing-color-and-typescale-additions`): the
  full `--ease-*` easing scale (sine/quad/cubic/quart/quint/expo/circ/back plus
  `linear()` elastic and bounce curves), the `--color-white` / `--color-black`
  invariants, and `--font-size-7xl`. The migration is idempotent by presence (retuned
  steps are kept; only absent ones are inserted) — run `npx live-tokens migrate` to
  backfill a forked `tokens.css`. Fixes 0.31's Image zoom snapping with no ease when a
  vendored `tokens.css` lacked `--ease-out-cubic`.
- **`--scale-*` tokens surfaced in the editor's Variables tab** (new "Scale" group).

## 0.31.0 — Image Lightbox galleries; fixed overlays escape their ancestors

### Added

- **`ImageLightbox` gallery mode.** Pass `images={[{ src, alt, width?, height? }]}`
  (two or more) and the open modal gains left/right chevrons, an `i / n` counter
  (bottom-right, mono), and `←`/`→` keyboard navigation. A single-entry array (or a
  lone `src`) behaves exactly as before — no chevrons, no counter. Navigation runs a
  directional slide+scale+crossfade: the incoming image enters from the side of the
  pressed chevron (right/next → from the right), shifting 32px as it scales from 0.95 and
  fades in (250ms, ease-out, 125ms stagger); the outgoing image leaves the opposite way
  (250ms, ease-in). Differing aspect ratios resize the stage underneath the crossfade.
- **`ImageLightbox` self-measures.** `width`/`height` are now optional. The aspect ratio
  is read from the loaded `<img>` (`naturalWidth`/`naturalHeight`); explicit dimensions,
  when given, still win and avoid the pre-load reflow. Consumers without dimension
  metadata no longer need glue. The inline thumbnail measures the cover image
  independently of the open modal (aspect ratios are tracked per image), so paging a
  gallery never resizes the thumbnail. A dimensionless image still has a brief pre-load
  reflow; pass `width`/`height` to reserve its box.
- **`ImageLightbox` `fit` prop.** `fit="cover"` crops the closed thumbnail to fill its
  box (the expanded modal always uses `contain`, so the whole image stays visible).
  Backed by a new `--imagelightbox-tile-object-fit` token (default `contain`). `cover`
  only crops when the thumbnail has its own box (an aspect from `width`/`height`, or a
  CSS-constrained container).
- **Shared `portal` action** (`src/system/internal/portal.ts`) and a
  **`check:overlay-portal`** publish gate. Any component whose `<style>` declares
  `position: fixed` must portal that layer via `use:portal`, or the build fails. Anchored
  `position: absolute` popovers (`Tooltip`) are exempt.

### Fixed

- **Fixed-position overlays no longer get clipped or painted under other content.** A
  `position: fixed` modal is only window-relative while no ancestor establishes a
  containing block or stacking context for it; a transformed / `isolation: isolate` /
  `contain` / `will-change` ancestor (common on real pages, and present on the editor's
  own preview pane) silently traps it. `ImageLightbox`'s modal and `Dialog`'s backdrop
  now portal to `<body>` (`use:portal`), escaping such ancestors. `Dialog`'s `inline`
  preview variant stays in flow (`use:portal={!inline}`); `enabled` is read once at mount.
  Because the layer lives at `<body>`: DOM events from it no longer bubble to a consumer
  ancestor; a subtree-scoped CSS-variable theme no longer reaches it (this library themes
  via `:root`, so unaffected in practice); and an SSR `show=true` renders in flow on the
  server, then relocates on hydration.

### Changed

- **`ImageLightbox` internals restructured.** The inline thumbnail is now its own
  `<button>` that stays in flow; the overlay, morphing stage, and chrome render in a
  separate body-portaled layer. The zoom-from-thumbnail open/close morph, drag/zoom
  panning, and `extended` toolbar are unchanged. `prefers-reduced-motion` is now honored
  (all transitions collapse to an instant swap).
- **`ImageLightbox` modal is now an accessible dialog.** It exposes `role="dialog"` +
  `aria-modal` with a label (the image's `alt`, or `Image N of M` in a gallery), moves
  focus into the modal on open and restores it to the thumbnail on close, traps `Tab`
  within the modal, and announces the gallery position via a polite live region.

## 0.30.0 — Images lazy-load and stay responsive; card titles truncate

### Added

- **`Image` forwards the responsive-image attributes.** New optional props
  `srcset`, `sizes`, `loading`, and `decoding` pass straight through to the
  underlying `<img>`. `loading` defaults to `'lazy'` and `decoding` to
  `'async'`, so content images defer off-screen work with no consumer change.
  Pass `loading="eager"` for an above-the-fold hero.

### Changed

- **`Card` titles truncate instead of wrapping.** The title now clips to a
  single line with an ellipsis (`overflow: hidden; white-space: nowrap;
  text-overflow: ellipsis`, plus `min-width: 0` so it can shrink inside the
  flex header), keeping card headers to a fixed height regardless of title
  length.

## 0.29.0 — Image zoom-on-hover and a single slot-prose pin

### Added

- **Images can zoom their contents on hover.** `Image` gains an optional `zoom`
  prop and a global "Use zoom" editor intrinsic (the same gate-var + tri-state
  pattern as Card hover): `zoom={undefined}` inherits the editor default,
  `true`/`false` force one instance on or off. The frame stays fixed; only the
  `<img>` scales, via `transform: scale(var(--image-zoom-scale))` with a
  `--duration-300`/`--ease-out-cubic` transition. `CardEditor` and `ImageEditor`
  now export `intrinsics`, registered in the component registry.
- **`--scale-{sm..2xl}` transform-multiplier scale in `tokens.css`** (1.05 → 1.25,
  5% per step), consumed by the image zoom above and surfaced in the editor as
  the `SCALE` variant. Ships with a paired `tokens.css` migration
  (`2026-06-03-transform-scale-additions`): run `npx live-tokens migrate` to add
  the scale to a vendored `tokens.css`, or the picker shows a blank slot for
  `--image-zoom-scale`.
- **`check:slot-prose` publish gate.** Fails the build if a slot-rendering
  component hand-rolls the slot-typography pin (a `:global(p|ul|ol|li)` rule set
  to the literal `inherit`) instead of `@include slot-prose`. Added to
  `prepublishOnly`.

### Fixed

- **Consumer global element rules no longer repaint slotted content.** Components
  render the consumer's raw HTML in the same light-DOM tree, so a consumer's
  global `p` / `ul li` rules (for example in `site.css`) matched slotted elements
  and beat the container's body typography (the serif-card bug). The pin now
  lives in one place, `src/system/styles/_slot-prose.scss`, applied via
  `@include slot-prose` on `Card`, `CollapsibleSection`, and `Image`. Three
  diverging hand-copies had shipped before; `check:slot-prose` keeps them out.

### Changed

- **The slot-prose pin is per-axis, not `font: inherit`.** It pins only the axes
  a component owns (family, size, weight, line-height, colour, plus spacing
  rhythm) and leaves `font-style`, `letter-spacing`, and `text-transform` free,
  so a consumer's italics or tracking survive inside a card or section.
- **`Card` and `CollapsibleSection` gain a `prose` prop (default `true`).** Set
  `prose={false}` to drop the pin and fully own slotted-content styling.
- `fonts.css` (generated from the production theme) swaps Fraunces for Manrope.

## 0.28.1 — Docs load from the published package

### Fixed

- **Guide chapters no longer fail to load in tarball consumers.** The `/docs`
  page loaded chapter bodies with `import.meta.glob('./content/*.md', '?raw')`,
  a Vite compile-time transform that esbuild's `optimizeDeps` leaves unexpanded
  inside a pre-bundled `node_modules` dependency. Installed-package consumers
  got an empty module, so every chapter threw "Chapter not found" (the package's
  own demo app and `npm link`ed consumers were unaffected, which is why it
  surfaced only once a consumer ran the package-owned `/docs` from the tarball).
  Bodies now ship as a generated ES module (`content.generated.ts`) built from
  the same `src/editor/docs/content/*.md` sources via `npm run sync:docs`, with
  `check:docs-content` gating drift in CI. No consumer action required.

## 0.28.0 — Dynamic routes without a router

### Added

- **`<LiveTokensRouter>` gains a `resolve` prop for routes you can't enumerate.**
  Pass `resolve: (path) => RouteEntry | null` to match params (`/module/:id`),
  prefixes, or conditionally-gated paths in plain code, with no route syntax to
  learn. Resolution order is `pages[path]`, then `resolve(path)`, then the
  `pages['/']` fallback, so existing `pages`-only consumers are unaffected.
- **`RouteEntry` gains `props`.** A static or resolved entry can pass props to
  its page, so one component can serve many paths (for example the matched id
  or slug). The entry's `source` now drives "Page Source" on dynamic routes
  too, so it can't desync from the dispatched page.

## 0.27.0 — Docs ship with the package

### Added

- **The user guide now ships with the package and renders in the editor
  overlay.** `LiveTokensRouter` auto-owns a dev-only `/docs` route and adds a
  "Docs" tab to the overlay nav (alongside "Components"), so every consumer can
  reference the guide while building without vendoring a copy. A new
  `@motion-proto/live-tokens/docs` export lets manual-overlay consumers mount
  the same page. Disable or relocate via `editorRoutes={{ docs: false }}` (or a
  string path), matching the existing `editor` / `components` overrides.

### Changed

- The docs renderer and markdown content moved from the demo app into the
  package at `src/editor/docs/` (chapters under `src/editor/docs/content/`), so
  the guide is a single source of truth that ships in the tarball.
- `marked` and `highlight.js` are now runtime dependencies (the docs renderer
  needs them at the consumer).

## 0.26.0 — Default theme + manifest live from the package

### Changed

- **The default theme and default manifest now resolve live from the installed
  package** instead of a vendored local copy. The dev plugin's resource server
  gained a read-only package-directory fallback, so a consumer whose pointer is
  `default` picks up the library's updated defaults on `npm upgrade`, while a
  consumer on a custom theme or manifest is left untouched and keeps a current
  baseline to restore to. Component defaults are unchanged: they still derive
  from each component's shipped `.svelte` `:global(:root)` block.
- **`themes/default` is now read-only (PUT returns 403)**, symmetric with the
  existing manifest and component-config guards. The default is owned by the
  package, not the consumer.

### Added

- Ship `themes/default.json` and `manifests/default.json` in the package tarball
  (the live source for the fallback above).
- `check:production-is-default` publish gate: the shipped production baseline
  (theme, manifest, and every component) must resolve to `default`, so a
  production-only consumer never inherits a maintainer's custom palette.

### Removed

- The empty-seed writers that wrote a local `themes/default.json` and
  `manifests/default.json` on first dev-server start. Those would shadow the
  package default under the new model. Also removed the dead `presets/` to
  `manifests/` one-shot migration.

## 0.25.1 — Drop unused Mermaid dependency

### Removed

- **`mermaid` devDependency and `MermaidDiagram.svelte`.** The docs site stopped
  rendering Mermaid when the developer-reference chapters moved to
  `docs/archive/` (off the non-recursive `docs/*.md` glob in `chapters.ts`). The
  only remaining ` ```mermaid ` fences live in those archived chapters, which no
  longer load, so the lazy-loaded `mermaid` package (~700kB) was unreachable.
  Removed the dependency, the `MermaidDiagram` component, and the mermaid
  handling in `Docs.svelte`. No consumer impact: `mermaid` was a
  devDependency and never shipped in the tarball.

## 0.25.0 — Panel component; structural group-key derivation

### Added

- **New `Panel` component.** A bordered, centered stage for showcasing other
  components against a subtle gradient surface. Registered in the catalogue and
  editable in the editor (frame border/radius, stage surface/padding/gap). Props
  are `style`, an optional `minHeight` to fix the stage height so it never
  reflows, and a `children` snippet.
- **`SideNavigation` gains `lead` and `actions` snippets.** `lead` renders at
  the top of the rail above the title (e.g. a logo or company name); `actions`
  renders at the foot of the nav list. Both hide while the rail is collapsed and
  impose no spacing of their own — the consumer controls it.
- **New scaffolding exports** from `@motion-proto/live-tokens/component-editor`:
  `buildTypeGroupColorTokens`, `buildTypeGroupFontTokens`,
  `buildTypeGroupShareableContexts`, `structuralGroupKey`, and the
  `TypeGroupConfig` type. Custom-component authors can now reach the individual
  pieces of the type-group scaffolding instead of only the bundled
  `buildTypeGroupTokens`.

### Changed

- **Group-key derivation is now structural.** `buildTypeGroupTokens` no longer
  infers a token's group from its last dash-segment; it derives the key by
  stripping the component prefix and the variant/state segments declared in the
  new `{ component, variants }` config. All 11 type-group editors were migrated
  to pass this config, and the bespoke SideNavigation/Table workarounds were
  removed. Existing editors' sibling partitions are verified unchanged; this
  matters only for a custom editor that relied on the old last-dash fallback —
  a token with no derivable group now resolves to a solo color token instead of
  being silently grouped.
- `bin/check-component` now warns (non-fatal) when a component uses a bare font
  helper across multiple slots.

### Changed (breaking)

These shift the rendered defaults of shipped components. Consumers who edited
the affected tokens keep their values; unedited tokens fall through to the new
defaults on upgrade.

- **Button text and icon scale up.** Default text font-size `md → lg` and icon
  size `sm → md` across every variant (primary, secondary, outline, success,
  danger, warning).
- **Section Divider small variant restyled.** Title is now brand-colored and
  center-aligned, the hairline is off by default, title font-size `2xl → 3xl`
  at medium (was bold) weight, and the outer padding is removed. The large and
  medium variants are unchanged apart from dropping their `space-4` outer
  padding.

### Fixed

- **CodeSnippet no longer shows a spurious horizontal scrollbar.** Added a
  `box-sizing: border-box` reset so the snippet's own padding and border stay
  inside `max-width: 100%`. Its code text now uses `--text-brand` (was
  `--text-brand-secondary`).

### Docs

- Documentation reorganized: the numbered chapter set moved under
  `docs/archive/`, and the consumer-facing guides (`getting-started`,
  `creating-components`, `editing-tokens`, `themes-workflow`, `01-overview`)
  were rewritten. The demo landing page was restructured (new footer and
  get-started sections; the old "live" section removed).

## 0.24.2 — Demo cosmetic tweaks

### Changed

- Minor color tweaks to the demo landing page (hero tagline contrast and the
  floating token-tag text color). No catalogue component, token, or API change.

## 0.24.1 — Section Divider editor controls match rendered defaults

### Fixed

- **Section Divider editor controls no longer default to a state the component
  never renders.** The alignment dropdown defaulted to "Center" while an
  unedited divider rendered left-aligned, so choosing "Center" fired no change
  event and appeared to do nothing. The eyebrow / description visibility and
  hairline controls had the same per-variant disagreement. The editor's
  read-back now sources each per-variant default from the runtime
  `:global(:root)`, so the controls reflect what the page actually shows.

### Added

- **Intrinsics are now a tested surface.** Structural / display properties an
  editor drives outside the token grid (alignment, visibility, position) are
  declared as `intrinsics: IntrinsicSpec[]` and pinned to the runtime
  `:global(:root)` defaults by a universal contract test, so an editor default
  can't silently drift from what the component renders. `IntrinsicSpec` is
  exported from `@motion-proto/live-tokens/component-editor`.

## 0.24.0 — Grouped editor token lists; CodeSnippet horizontal scroll

### Added

- **CodeSnippet scrolls long lines horizontally.** Long code no longer truncates
  with an ellipsis; it scrolls on the x-axis behind a thin styled scrollbar, and
  the copy button stays pinned to the top-right. Two new tokens style the
  scrollbar, both editable in the CodeSnippet panel:
  `--codesnippet-scrollbar-thumb` (thumb color) and
  `--codesnippet-scrollbar-border-width` (scrollbar thickness).

### Changed

- **Editor token lists are now split into labeled element groups.** Ten
  component editors (Callout, CodeSnippet, InlineEditActions, Input, MenuSelect,
  ProgressBar, SegmentedControl, TabBar, Toggle, Tooltip) group their tokens
  into labeled sections (frame / text / icon and structural parts like track,
  thumb, divider, indicator, scrollbar) via the `element` field instead of one
  flat list per state. Editor-only change: rendered output for existing tokens,
  token names, and component APIs are unchanged, so existing themes and
  component-configs are unaffected.

## 0.23.0 — Extend the spacing scale at the top end

### Added

- **`--space-40` (2.5rem) and `--space-128` (8rem).** The spacing scale gained a
  step between 32 and 48, and a new large value above 96, for section- and
  page-level layout. `--space-64` and `--space-96` (already defined but not
  surfaced) now appear in the editor's Spacing panel too. Displayed scale is now
  `2 4 6 8 10 12 16 20 24 32 40 48 64 96 128`.

### Removed

- **`--space-80` (5rem).** Defined but unused and never surfaced in the editor;
  it broke the monotonic step growth at the top of the scale. Direct consumers
  of `--space-80` should remap to `--space-64`, `--space-96`, or `--space-128`.

## 0.22.1 — Add LICENSE files

### Added

- **`LICENSE` (MIT).** The package already declared `"license": "MIT"` in
  `package.json` but shipped without the license text. Both
  `@motion-proto/live-tokens` and `@motion-proto/create-live-tokens` now include
  an MIT `LICENSE` file in their published tarballs. No code changes.

## 0.22.0 — Component defaults synced to the reference demo

### Changed

- **Baked-in component defaults refreshed to match the reference demo.** The
  `:global(:root)` defaults in 8 shipped components (Badge, CollapsibleSection,
  CornerBadge, MenuSelect, Notification, ProgressBar, SectionDivider,
  SegmentedControl) had drifted from the project's tuned config; they now match,
  so a fresh install renders like the demo. Visual default change only — no
  token names, aliases, or APIs changed, so existing themes and
  component-configs keep overriding exactly as before.
  - **SegmentedControl**: selected pill uses brand surface/border (was success
    green); disabled surface is transparent; hover surface softened.
  - **SectionDivider**: backgrounds are transparent (the demo's gradients are
    `type: none`); titles, eyebrows, and hairlines retuned.

### Added

- **`sync:component-defaults` + `check:component-defaults`.** The sync script
  pushes editor-tuned config values back into the component `.svelte` source
  (the "adopt to source" step), and `check:component-defaults` — wired into
  `prepublishOnly` — fails the release if any component's baked default drifts
  from its config. The `.svelte` default and the editor config stay one source.

## 0.21.2 — Export the scaffolding engine

### Added

- **`@motion-proto/live-tokens/create` export** exposing `createApp`
  (plus `runCreate` / `formatCreateResult`), the engine behind the `create`
  subcommand. This lets the `@motion-proto/create-live-tokens` initializer
  reuse the exact template and version-matched token seeds without duplicating
  them — the groundwork for `npm create @motion-proto/live-tokens`. No change
  to the `create` subcommand itself.

## 0.21.1 — Recommended project layout

### Added

- **README "Recommended project layout" section.** Documents the integration
  surface `create` produces (vendored `tokens.css`, editor state under `src/`,
  `vitePreprocess`, clean peer resolution with no `legacy-peer-deps`) and the
  invariant that keeps upgrades non-destructive: all editable state is committed
  under `src/`, never inside `node_modules`. The `create` template's README
  links to it.

## 0.21.0 — Scaffold a new app with `create`

### Added

- **`npx @motion-proto/live-tokens create <dir>` scaffolds a working app.**
  It generates a thin Svelte + Vite project that *depends on* the package
  (`vite.config.ts` with `themeFileApi`, `main.ts` calling `bootLiveTokens`,
  an `App.svelte` using `<LiveTokensRouter>`, and a placeholder
  `src/pages/Home.svelte`), then seeds `tokens.css`, `tokens.generated.css`,
  and `site.css` from the installed package so they never drift from the
  version you scaffolded against. `init` is an alias. Replaces the old
  `npx degit motionproto/live-tokens` route, which cloned the entire package
  repo (source, tests, and all) instead of producing a consumer app.
- **`check:smoke-create` release gate.** Packs the tarball, runs the shipped
  `create`, installs the generated app against the tarball with no
  `--legacy-peer-deps`, and builds it. Wired into `prepublishOnly`, so a
  broken scaffold or a template missing from the tarball cannot ship.

## 0.20.1 — Color opacity is a property of a token

### Changed

- **Internal: translucent colors are modeled as a token plus an optional
  opacity, not a separate value kind.** The editor's `CssVarRef` now has three
  kinds (`token`, `literal`, `gradient`); a color below 100% is a `token`
  carrying an `opacity`, and one serialize/parse pair
  (`color-mix(in srgb, var(--token) NN%, transparent)`) backs every read and
  write of a color value. No change to the on-disk config format, the generated
  CSS, or any public API, so no migration is needed.

### Fixed

- **Linked-block grouping no longer collapses distinct gradients into one
  bucket.** Gradient refs were keyed by a stringified object, so every gradient
  hashed to the same key; refs are now bucketed by their rendered CSS value.

## 0.20.0 — Refreshed shipped component defaults

### Changed

- **Baked-in component defaults updated across the shipped set.** The
  `:global(:root)` defaults inside `src/system/components/*.svelte` (what a
  fresh consumer sees before they touch the editor) were refreshed. This is a
  visual default change: components installed at this version look different out
  of the box, but no token names, aliases, or APIs changed, so existing themes
  and component-configs keep overriding exactly as before.
  - **Button** (`Button.svelte`): primary/secondary/outline/success/danger/warning
    text steps up to `--font-size-md` / `--font-weight-semibold`, radius to
    `--radius-xl`, and success/danger/warning border width drops to
    `--border-width-1`. Small variant font size moves to `--font-size-sm`.
  - **Callout** (`Callout.svelte`): label and body switch from `--font-serif` to
    `--font-sans` at `--font-size-lg`; info border firms up to
    `--border-info-medium`.
  - **Card** (`Card.svelte`): translucent `color-mix` surfaces, per-side header
    and body padding, larger title (`--font-size-2xl` / `--font-weight-medium`)
    and body (`--font-size-xl`), icon at `--icon-size-2xl`.
  - **CodeSnippet** (`CodeSnippet.svelte`): translucent surface, neutral border,
    code text in `--text-brand-secondary` at `--font-size-md`.
  - **Image** (`Image.svelte`): radius to `--radius-2xl`.
  - **ImageLightbox** (`ImageLightbox.svelte`): overlay surface to a translucent
    `color-mix` of `--color-neutral-950`.
  - **Table** (`Table.svelte`): translucent neutral wrapper/header surfaces,
    heavier wrapper border, larger header (`--font-size-lg` / semibold) and cell
    (`--font-size-md` / medium) type, visible column dividers.
  - **Tooltip** (`Tooltip.svelte`): translucent surface, visible
    `--border-width-1` border.

### Fixed

- **Dev-server plugin now round-trips translucent surfaces.** When a component's
  `:global(:root)` declares a color at reduced opacity
  (`color-mix(in srgb, var(--token) NN%, transparent)`, the form the color
  picker emits below 100% opacity), the plugin's `default.json` regeneration
  preserves it. Previously only plain `var(--token)` aliases were captured, so
  regeneration silently dropped translucent properties from the seed config,
  leaving them blank in the editor and absent from adopt defaults.

### Migration

- Consumers who want the previous look can pin their theme or component-config
  values; nothing is removed, so no edits are required to keep an existing
  setup working. The change only affects components rendered with the shipped
  defaults.

## 0.19.1 — Fresh install no longer needs `--legacy-peer-deps`

### Fixed

- **`npm install @motion-proto/live-tokens` resolves cleanly on a fresh
  machine.** `vite@8` declares an optional `sugarss@^5` peer while
  `svelte-preprocess@6` declares `sugarss@^2 || ^3 || ^4`. The ranges don't
  overlap, so npm rejected the whole tree with `ERESOLVE` even though `sugarss`
  is never installed. We no longer depend on `svelte-preprocess`, so the
  conflict is gone — no `--legacy-peer-deps`, no `.npmrc` workaround.

### Changed

- **Preprocessing moved from `svelte-preprocess` to `vitePreprocess`** (bundled
  in `@sveltejs/vite-plugin-svelte`). `svelte-preprocess` is removed from
  `peerDependencies`; `@sveltejs/vite-plugin-svelte` (`^7.0`) is now a declared
  peer. `sass` stays a peer — it compiles the components' `<style lang="scss">`
  blocks under `vitePreprocess` exactly as before. The build-time PRUNE_FOR
  pass that relied on svelte-preprocess's `replace` option now runs through a
  local `replacePreprocess` helper (`vite-plugin/pruneMarkers/`).

### Migration

- **Consumer `vite.config.ts`:** preprocess with `vitePreprocess()` instead of
  a bare `svelte()`. The bare form never compiled the shipped components' scss
  blocks, so this also closes a latent gap. Keep `sass` installed.

  ```ts
  import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
  // ...
  plugins: [svelte({ preprocess: vitePreprocess() }), themeFileApi({ /* ... */ })]
  ```

  Consumers who explicitly configured `svelte-preprocess` themselves can keep
  it — nothing forces the switch — but it's no longer required or installed for
  you.

## 0.19.0 — Toggle, TabBar, SegmentedControl token model updates

### Changed (breaking)

- **`Toggle` track dimensions are derived, not authored.** The runtime
  now computes `track-width = thumb-size * 2 + track-padding * 2` and
  `track-height = thumb-size + track-padding * 2`, so the explicit
  `--toggle-track-width` and `--toggle-track-thickness` tokens are gone.
  A new `--toggle-track-padding` knob controls the gap between thumb and
  track edge. Auto-migrated: the `2026-05-29-toggle-derive-track-from-thumb`
  component-config migration drops the two old tokens and seeds
  `--toggle-track-padding` with `--space-2` when absent. Consumers who
  customised track width will see geometry derive from their
  `--toggle-thumb-size` after upgrade.
- **`TabBar` indicator stroke width is now per-state.** The bar-level
  `--tabbar-bar-indicator-thickness` is replaced by
  `--tabbar-{default,hover,active,disabled}-indicator-border-width`,
  mirroring how indicator color already rebinds per state. The
  `-border-width` suffix also lets the editor's picker classify the
  token correctly (the old `-thickness` suffix rendered as a colour
  picker). Auto-migrated by
  `2026-05-29-tabbar-indicator-thickness-to-per-state-width`: the old
  bar-level value seeds all four states, so the visual default is
  preserved. Unset falls back to `--border-width-2`.
- **`SegmentedControl` small-size divider tokens renamed.**
  `--segmentedcontrol-divider-small-thickness` →
  `--segmentedcontrol-small-divider-thickness`, and the matching
  `-inset` token. The picker recognises the value by suffix, so the
  rename puts `-thickness` / `-inset` at the tail where the editor
  classifies them as stroke width and inset instead of colour. Auto-
  migrated by `2026-05-29-segmentedcontrol-small-divider-rename`.

### Added

- **Three new component-config migrations** covering the renames above,
  with regression tests in `migrations.test.ts`.

## 0.18.2 — Publish workflow switches to `npm install`

### Fixed

- **Publish workflow uses `npm install --include=optional` instead of
  `npm ci`.** Releases are tagged from macOS, where `package-lock.json`
  cannot capture the linux-only optional binaries that rolldown
  (bundled with Vite 8) pulls in for the wasm32-wasi fallback path.
  `npm ci` strict-checked the lockfile and exited EUSAGE on missing
  `@emnapi/*` nodes; `npm install` resolves the tree per-platform from
  `package.json`. Tag-matches-package.json gate remains the source of
  truth for the publish identity. 0.18.0 and 0.18.1 both tagged but
  never reached the publish step because of this.

## 0.18.0 — Vite 8 / TypeScript 6 toolchain bump

### Changed

- **Peer dependency: `vite` is now `^8`** (was `^6 || ^7`). Consumers
  must upgrade to Vite 8 before installing this version. The
  `@sveltejs/vite-plugin-svelte` v7 peer enforces this — v7 requires
  Vite 8, and Vite 8's CSS pipeline (rolldown + lightningcss by default)
  may surface latent CSS issues that the v7 pipeline tolerated.
- **Dev toolchain bumped to current majors:** `vite ^8.0.14`,
  `@sveltejs/vite-plugin-svelte ^7.1.2`, `typescript ~6.0.3`,
  `@types/node ^25.9.1`. Smoke-install consumer in
  `scripts/smoke-install.sh` follows the same versions so the test
  exercises the declared peer.
- **`tsconfig.json` adds `"ignoreDeprecations": "6.0"`** to silence the
  TypeScript 6 deprecation warning emitted by `tsup`'s internal DTS
  build (which injects `baseUrl`). Cosmetic only; no behaviour change.

## 0.17.1 — SideNavigation re-toggles on current page

### Fixed

- **`SideNavigation` collapses when its label is clicked on the current
  page.** Previously, clicking a section label whose route was already
  current produced a no-op navigation, so users had to chase the chevron
  to collapse the section they had just opened. The label now intercepts
  that click and toggles the section instead. Modified-click
  (cmd/ctrl/shift/alt) and middle-click still fall through to the link,
  and the chevron's own click is untouched.

### Changed

- **Editor: removed hidden per-side padding entries** from
  `CornerBadgeEditor`, `InputEditor`, `MenuSelectEditor`, and
  `SegmentedControlEditor`. Each editor previously declared a `padding`
  token alongside four `padding-top` / `-right` / `-bottom` / `-left`
  entries flagged `hidden: true`. The hidden entries never reached the UI
  and their `--*-padding-{top,right,bottom,left}` variables are not
  referenced by the shipped components, so this is a cleanup of dead
  configuration with no consumer-visible effect.

## 0.17.0 — tokens.css migrations for Layer-1 drift

Layer-1 primitives live in the consumer's developer-authored
`tokens.css`, which the in-browser JSON migration system deliberately
never touches. When the package evolves its token vocabulary, a forked
`tokens.css` falls behind and components reference primitives that
resolve to nothing, surfacing as blank or `—` editor slots. This release
adds a Node-side, idempotent migration system that reconciles
`tokens.css` on demand, plus a boot guardrail that flags drift before it
shows up as empty slots.

### Added

- **`live-tokens migrate` CLI.** `npx live-tokens migrate` applies
  pending `tokens.css` migrations and writes the file in place as a
  reviewable git diff. `npx live-tokens migrate --check` reports without
  writing and exits 1 when changes are pending, so CI can gate on it.
  The file is located via `--tokens <path>`, then the `tokensCssPath`
  key in `live-tokens.config.json`, then a short default scan.
- **`tokensCssPath` config key.** Added to `live-tokens.config.json` so
  the CLI can locate `tokens.css` without plugin options.
- **Boot guardrail.** The dev-server plugin (`themeFileApi`) runs a
  read-only `validateTokensCss` check on boot. It scans every
  component's `:global(:root)` block for `var(--…)` references and warns
  about any primitive not defined in `tokens.css`, the generated
  sidecar, or another component, naming the tokens and pointing at `npx
  live-tokens migrate`. It never writes anything, so the "plugin never
  writes `tokens.css`" invariant is preserved.
- **First migrations.** Add `--line-height-{xs..xl}`,
  `--letter-spacing-*`, and `--ease-out-quart`. Remove legacy
  `--sectiondivider-*` tokens that are not on the `lg`/`md`/`sm` axis.
  Migrations are idempotent by presence (no `schemaVersion` to stamp on
  CSS), so re-running the whole set is always safe.

### Docs

- `docs/04-tokens-and-themes.md` gains a "tokens.css migrations
  (Layer-1)" section covering the engine, the CLI, the guardrail, and
  how to author a new migration.

## 0.16.2 — CollapsibleSection collapses linked headers

### Fixed

- **`CollapsibleSection` with `href` can now collapse.** When `href` was
  set, the header rendered as a single `<a>` with no toggle handler, so
  consumers like SideNavigation lost the ability to collapse sections
  that were also routes. Click only ever navigated, and the chevron's
  rotate was decorative. The `href` branch now renders the chevron as a
  standalone `<button>` that fires `ontoggle`, with the label as a
  sibling `<a>` link inside the same flex row. Hover, indicator, and
  expanded paint still land on the row. The no-`href` branch is
  unchanged.

## 0.16.1 — SideNavigation header restructure

The SideNavigation title bar is now a single flex card hosting the label
box and the persistent toggle button as siblings. Previously the toggle
was an absolutely-positioned child of the rail with calc'd left/top
coordinates derived from the panel-width tokens. The new structure
removes that coupling: the header's `justify-content` plus `flex:1` on
the label naturally positions the toggle to the right of the label when
open and centres it in the rail when collapsed.

### Changed (breaking)

- **SideNavigation title indicator and divider no longer render.** The
  `border-left` accent strip and `border-bottom` divider on the title
  bar were removed in favour of a card-shaped header driven by per-state
  `surface` + `border` + `radius` chrome. Consumers who set
  `--sidenavigation-title-<state>-accent` /
  `--sidenavigation-title-<state>-accent-width` will see no rendered
  effect; the tokens remain in shipped configs for backward compatibility
  but no longer drive any pixels. Move customizations onto
  `--sidenavigation-title-<state>-surface` /
  `-border` / `-border-width` instead. The editor's "Title" sections
  surface these (relabeled from "divider color / divider width /
  indicator color / indicator width" to "border color / border width";
  the two indicator rows are gone).

### Added

- **Stateless Title Layout tokens.**
  `--sidenavigation-title-gap` (space between label box and toggle box)
  and `--sidenavigation-title-radius` (outer card corner radius). Exposed
  in the editor under a new "Title Layout" section.
- **Stateless Title Label tokens.**
  `--sidenavigation-title-label-surface`,
  `--sidenavigation-title-label-radius`, and
  `--sidenavigation-title-label-padding` style the inner label box that
  sits beside the toggle in the open state. Exposed in the editor under
  a new "Title Label" section.

### Changed

- **Shipped `sidenavigation/default.json` tightened.** Drops the legacy
  split `padding-top/right/bottom/left` keys (superseded by the
  four-tuple `padding` tokens) and adjusts default text sizes (item and
  footer text → `--font-size-sm` + `--font-weight-light` for
  default/hover), icon sizes (footer → `--icon-size-xs`), and accent
  widths (`--border-width-3` instead of `4`). Consumers with their own
  `default.json` are unaffected; consumers relying on the shipped
  default see a denser nav rail.

### CI

- Bumped `actions/checkout` and `actions/setup-node` to `v6` in
  `publish.yml` and `verify.yml`.

## 0.15.0 — One-call boot + router wrapper

The library now provides two opt-in wrappers that collapse the boilerplate
every consumer used to copy out of the README: a single `bootLiveTokens`
call for `main.ts` and a `<LiveTokensRouter>` component for `App.svelte`.
Together they take a typical consumer's integration from ~80 lines of
hand-orchestrated init + overlay + route-dispatch to ~12 lines.

The library's own demo app (`src/app/main.ts`, `src/app/App.svelte`) has
been migrated to use the new wrappers as a dogfooded reference.

### Added

- **`bootLiveTokens(App, target, opts?)`** — one-call bootstrap. Runs the
  five idempotent `init*` hooks in the documented order, fetches the
  active theme in dev, registers any consumer-authored components passed
  via `opts.components` (dev-only), and mounts the app. Side-effect-
  imports FontAwesome so the overlay's icons are present without the
  consumer having to remember a separate import. Exported from the
  package root.
- **`<LiveTokensRouter pages={…}>`** — overlay + columns + route
  dispatch in one component. Drives `<LiveEditorOverlay>` and
  `<ColumnsOverlay>` automatically, dynamic-imports `/editor` and
  `/components` (so editor chrome stays out of non-editor route
  bundles), auto-injects `Components` into the dev nav rail and the
  page-source hide list, intercepts in-app `<a href="/…">` clicks for
  client-side routing. Page entries can be eager (`component:
  PageComponent`) or code-split (`lazy: () => import('./Page.svelte')`);
  use `lazy` for any page that side-effect-imports a stylesheet at the
  top of its module so those side effects stay out of the editor routes.
  Pages without a `label` are reachable by URL but absent from the nav
  rail (matches the existing playground pattern). `editorRoutes.editor`
  and `editorRoutes.components` accept a string to relocate the default
  route or `false` to disable it entirely (no dispatch and, for
  `components`, no auto-injected nav-rail entry). Exported from the
  package root along with `RouteEntry` and `EditorRouteOverrides` types.

### Changed

- **`themeFileApi` default `componentsSrcDir` now scans both
  `src/components` and `src/system/components`** when no explicit option
  is passed. The Vite/Svelte convention is `src/components`, so new
  consumers don't need an override; existing consumers with components in
  `src/system/components` keep working without changes.
- **The component scanner skips `.svelte` files without a
  `:global(:root) {}` block.** Previously any `.svelte` file in the scan
  dir was treated as a runtime component, which meant editor companion
  files (e.g. `Foo.editor.svelte` or `FooEditor.svelte`) co-located with
  their runtime sibling would get a spurious `component-configs/foo.editor/`
  entry and show up in the editor's components list. Theme-aware
  components declare their tokens in a `:global(:root)` block; the
  presence of that block is now the marker for "register as a component."
  No filename convention required.

### Lower-level APIs unchanged

`LiveEditorOverlay`, `ColumnsOverlay`, `initCssVarSync`, `initRouter`,
`initColumnsOverlay`, `initEditorStore`, `initializeTheme`,
`registerComponent`, and the editor page exports
(`@motion-proto/live-tokens/editor`,
`@motion-proto/live-tokens/component-editor-page`) all remain exported.
The new wrappers are pure composition over them — use them directly if
you need a custom shell or non-standard route dispatch.

### README

The Quick install section now leads with `bootLiveTokens` +
`<LiveTokensRouter>`. The manual-orchestration pattern is documented
under a "Lower-level API" heading for consumers who need it.

## 0.14.1 — Drop unused local font files

Cleanup of leftover state from the Google Fonts switch in 0.14.0.

### Changed

- **Local `.woff2` font files removed.** 0.14.0 already excluded them from the
  published package via the `files` list, so this is a repository cleanup
  rather than a consumer-facing change. The `!src/system/styles/fonts/**`
  exclusion is dropped (no longer needed). Published bundle size is unchanged
  versus 0.14.0.
- **"Add local font" instruction updated.** The editor's font-add help text
  used to direct users to drop `.woff2` files into
  `src/system/styles/fonts/<Family>/` and claim the folder shipped with the
  production build, which was the exact assumption that broke for consumers
  pre-0.14.0. New copy points at `public/fonts/<Family>/`, a portable Vite
  convention that works the same whether you're in a consumer or in this repo.

## 0.14.0 — Multi-dir component scan, Google Fonts for defaults

### Changed (breaking — automatic migration on theme load)

- **Default font sources moved to Google Fonts.** Manrope and Fraunces were
  shipped as local woff2 files with `@font-face` blocks pointing at them. The
  url() resolution for those refs was fragile when consumed via the published
  package (paths leaked through Vite's CSS pipeline unrewritten). Defaults now
  use Google Fonts CDN URL imports (`@import url('https://fonts.googleapis.com/...')`),
  which sidesteps the rewriting entirely. Local woff2 font files are no longer
  published with the package; consumers who depended on them via direct path
  references will need to vendor their own or switch to Google Fonts too.
- **`migrateThemeFonts` auto-converts legacy local-font sources.** Any
  `fontSources` entry with `kind: 'font-face'` whose cssText is a font-face
  block for `Manrope` or `Fraunces` is rewritten to a Google Fonts URL source
  on next theme load. Source ids and family ids are preserved so existing
  fontStacks keep working.
- **Plugin `componentsSrcDir` scan now auto-includes the package's first-party
  components dir.** Previously the scan only walked the consumer-provided dir,
  so the editor's "registered components vs disk scan" validator would warn on
  every first-party component (Badge, Button, …) when a consumer pointed
  `componentsSrcDir` at their own components folder. Both dirs are scanned
  now; consumer entries shadow first-party ones on name collision. The option
  remains a single string for consumer code.

## 0.13.3 — Diagnostic logging (temporary)

Adds `console.log` traces inside `LiveEditorOverlay` for the route↔editorView
pairing rule and for editorView subscriptions, prefixed `[lt-debug:parent]` /
`[lt-debug:iframe]`. Will be removed in 0.13.4. Use this only if you're
helping diagnose the components-view flicker reported on 0.13.1/0.13.2.

## 0.13.2 — Fix font 404s for consumers

The bundled `fonts.css` and the default `fontSources[].cssText` both used
absolute URLs like `/src/system/styles/fonts/Manrope/Manrope-latin.woff2`,
resolved via Vite `?url` imports against the live-tokens repo layout. Those
paths only existed in this repo's own dev server; for any consumer importing
`@motion-proto/live-tokens/app/fonts.css`, the browser asked for them at the
consumer's server root and got back the dev HTML fallback (visible as `OTS
parsing error: invalid sfntVersion` in the console).

### Fixed

- **Bundled `fonts.css` and default font sources now use package-relative
  paths** (`./fonts/Fraunces/...`, `./fonts/Manrope/...`). The css file and
  the `fonts/` directory ship colocated under `src/system/styles/` in the
  package, so the relative url() resolves correctly whether served from
  `node_modules` in a consumer, from this repo's dev server, or as a hashed
  asset in a production build.
- **`migrateThemeFonts` auto-rewrites legacy absolute font paths.** Themes
  saved before this change (with `fontSources[].cssText` containing
  `/src/system/styles/fonts/...` or `/src/live-tokens/system/styles/fonts/...`)
  are normalised to `./fonts/...` on next theme load and re-saved by the
  editor. No consumer action required.

## 0.13.1 — Fix /components route pairing flicker

The pairing rule introduced in 0.12.1 fired on every `editorView` change, not
just on route change. Combined with the cross-window `storage` sync between
parent and overlay iframe, a single click on the components toggle would
trigger a feedback cascade: store write → storage event → handler runs
subscribers → rule re-fires → another store write, etc. Each step pulled
heavy editor re-renders along with it (the storage handler regularly took
>1s in practice), producing a visible bounce as the view flickered between
tokens and components.

### Fixed

- **`LiveEditorOverlay` route pairing now fires once per route change.** The
  rule still sets the initial pairing when entering `/components` (overlay
  flips to tokens to avoid stacking with the full-page editor), but does not
  re-fire when the user toggles `editorView` while on that route. The user
  can interact with the overlay's view switcher freely, no flicker.

## 0.13.0 — Generated CSS lives with editor data

The plugin now writes `tokens.generated.css` to `<dataDir>/tokens.generated.css`
by default, alongside themes, manifests, and component-configs. Previously it
defaulted to `<tokensCssPath dir>/tokens.generated.css`, which silently landed
inside `node_modules/` for any consumer that pointed `tokensCssPath` at the
installed package — a path `npm ci` would happily wipe.

The generated file is editor-managed user content, conceptually the same as
themes and manifests, so it belongs in the data directory rather than coupled
to the read-only base tokens.css location.

### Changed (breaking — one-line config or file move)

- **`tokensGeneratedCssPath` default moved from `<tokensCssPath dir>` to
  `<dataDir>`.** No automatic migration; pick one:
  - **Move the file** (recommended): relocate your existing
    `tokens.generated.css` from wherever it lived (often
    `src/system/styles/tokens.generated.css`) to `<dataDir>/tokens.generated.css`
    and update your `main.ts` import to match.
  - **Pin the old path**: pass
    `tokensGeneratedCssPath: 'src/system/styles/tokens.generated.css'` (or your
    previous location) explicitly to `themeFileApi()` in `vite.config.ts`.
- **Bundled `tokens.generated.css` relocated inside the package.** The
  `@motion-proto/live-tokens/app/tokens.generated.css` export now resolves to
  `./src/live-tokens/data/tokens.generated.css` (was
  `./src/system/styles/tokens.generated.css`). Consumers importing via the
  package export are unaffected; only the on-disk path inside `node_modules`
  changed.

## 0.12.1 — Overlay owns the /components route pairing

The mutual-exclusion rule that flips the overlay to Tokens view whenever the
page route is `/components` now lives inside `LiveEditorOverlay` itself.
Consumer App shells no longer need to import `editorView` or wire up the
pairing block by hand.

### Changed

- **`LiveEditorOverlay` self-handles the /components route pairing.** Previously
  each consumer's `App.svelte` had to subscribe to `route` + `editorView` and
  force `editorView.set('tokens')` when the route hit `/components`, otherwise
  the full-page component editor and the overlay's components view would stack.
  The rule now fires from inside the overlay component, so any host that mounts
  `<LiveEditorOverlay />` gets the behaviour for free. The starter's
  `src/app/App.svelte` is updated to drop the duplicated block.

## 0.12.0 — Toggle, CodeSnippet, and a Claude skill suite

Two new shipped components (`Toggle`, `CodeSnippet`) and a `live-tokens` CLI
that installs the bundled Claude Code skills into a consumer project in one
command. The single `live-tokens-add-component` skill is replaced by three
focused skills covering page composition, component selection, and new-component
authoring.

### Added

- **`Toggle` component** (`src/system/components/Toggle.svelte` + editor).
  On/off switch with tokenised track, thumb, label, and disabled state.
- **`CodeSnippet` component** (`src/system/components/CodeSnippet.svelte` +
  editor). Syntax-highlighted code block with tokenised chrome and copy button.
- **`live-tokens` CLI** (`bin/cli.mjs`). Two subcommands:
  - `npx @motion-proto/live-tokens setup-claude` — copies all bundled skills
    into `./.claude/skills/` in the consumer project. `--force` overwrites
    existing skill directories.
  - `npx @motion-proto/live-tokens check-component <id>` — static validator
    that enforces file layout, `:global(:root)` block, token-suffix vocabulary,
    state-before-property rule, no-raw-colour-defaults rule, public-imports
    rule, and `registerComponent({ id })` call. Useful as a post-authoring
    check or pre-commit guard.

### Changed

- **Claude Code skill suite reshaped.** The single `live-tokens-add-component`
  skill is removed; three focused skills take its place:
  - `live-tokens-build-page` — composes pages from the shipped components.
  - `live-tokens-pick-component` — decides between confusable pairs (TabBar
    vs SegmentedControl, Card vs CollapsibleSection, Callout vs Notification,
    etc.) with decision tables per family.
  - `live-tokens-create-component` — authors a new editable component against
    the naming, state-model, and public-imports rules.
  Each auto-triggers from natural-language requests; no slash commands.
- **Docs.** `docs/adding-components.md` renamed to `docs/creating-components.md`
  to align with the new skill name; cross-references updated.
- **README.** Component count bumped from ~19 to ~24; new "Claude Code skills"
  section documents the suite and CLI install path.

## 0.11.0 — Overlay scale trim and release pipeline cleanup

The overlay scale drops from seven stops to three. CI is now the only thing
that publishes to npm; local `npm publish` is no longer part of the flow.

### Changed (breaking for direct consumers of the dropped overlay tokens; auto-migrated for saved configs)

- **`--overlay-lowest` / `--overlay-lower` / `--overlay-higher` / `--overlay-highest` removed.**
  The kept stops are `--overlay-low`, `--overlay`, and `--overlay-high`.
  Saved theme files and component aliases are rebound automatically by
  `2026-05-26-drop-overlay-extra-stops` (theme v2 to v3, component-config v16 to v17).
  Consumers who reference the dropped tokens in their own CSS need to point
  at the nearest kept stop (`-lowest` and `-lower` to `-low`, `-higher` and
  `-highest` to `-high`).

### Added

- **`--color-white` and `--color-black` invariants** in `tokens.css`. Hard
  constants outside any ramp; never themed.

### Changed (internal, no consumer-visible API impact)

- Overlays editor section rewritten; `OverlaysSection.svelte` net 550
  lines lighter.
- `UIPaletteSelector` and `UIRelinkConfirmPopover` refactored internally;
  the latter renamed to `UIRelinkConfirmDialog` (not part of any public export).
- Release pipeline migrated to OIDC Trusted Publishing. `RELEASING.md`
  rewritten so the local steps stop at `git push --tags`; CI handles
  `npm publish` with provenance attestation. See the new "Publishing (how it
  actually happens)" section for the full picture.

## 0.10.0 — Plugin acts like a dev tool, not a co-tenant

Live Tokens no longer squats on multiple top-level folders at a consumer's
repo root. By default, all data (`themes/`, `manifests/`, `component-configs/`)
lives under one folder: `src/live-tokens/data/`. A consumer's root looks like
a normal project root again. This release also adds three new system
components (`Input`, `SideNavigation`, `ImageLightbox`), a full set of named
easing tokens, and several component-config schema cleanups (auto-migrated).

### Added

- **`Input` component** (`src/system/components/Input.svelte` + editor).
  Supports `text` / `number` / `search` / `password` types, with `label`,
  `hint`, `error`, password reveal, search-clear, and a `forceFocus` preview
  hook for the editor.
- **`SideNavigation` component** (`src/system/components/SideNavigation.svelte`
  + editor). Tokenised side-nav with collapsible groups, item icons, and
  active/hover states.
- **`ImageLightbox` component** (`src/system/components/ImageLightbox.svelte`
  + editor). Click-to-zoom image with backdrop, escape-to-close, and
  tokenised overlay/chrome.
- **Named easing tokens.** 28 curves added to `tokens.css` covering
  easings.net (`--ease-in-sine` through `--ease-in-out-back`, plus
  `linear()`-based `--ease-{in,out,in-out}-{elastic,bounce}` and
  `--ease-linear`).
- **`UIEasingSelector`** editor control for picking from the named easing
  tokens.

### Changed (breaking for consumers passing no data-folder options)

- **`themesDir` is no longer required.** It joins `componentConfigsDir` and
  `manifestsDir` as optional. Zero-config consumers now get
  `src/live-tokens/data/{themes,manifests,component-configs}` instead of the
  previous root-level defaults.
- **New `dataDir` option** on `themeFileApi(opts)`. Sets the parent directory
  for all three subfolders. Default: `src/live-tokens/data`.
- **New `live-tokens.config.json`** (optional, at project root). Accepts the
  same four data-folder keys. Resolution order per folder: explicit
  `themeFileApi(opts)` argument > matching key in `live-tokens.config.json` >
  `<dataDir>/<sub>` where dataDir comes from opts > config file > package
  default. Read once at plugin construction; restart vite to pick up changes.
- **Build-time pruning shares the same resolution.** `loadProductionConfig`
  (used by `buildPruneReplace`) reads through the shared resolver, so
  `componentConfigsDir` stays consistent across the dev plugin and the
  preprocessor.
- **API routes namespaced.** The default `apiBase` moved from `/api` to
  `/api/live-tokens`, so the plugin's routes can't collide with the consumer's
  own `/api/themes` / `/api/manifests`. The client side picks up the
  resolved base via a `__LIVE_TOKENS_API_BASE__` Vite define so client and
  server can't drift. Consumers who explicitly passed `apiBase: '/api'` are
  unaffected.
- **Unknown-key warning** on `live-tokens.config.json`. The reader now logs
  one warning per unrecognised key so `themesDr` doesn't silently degrade to
  defaults. `$schema` is ignored.

### Changed (breaking for saved component configs; auto-migrated on load)

Five component schemas were tightened. Migrations ship in the same release
and run automatically when a stored config is first read, so consumers don't
need to edit JSON by hand. Any per-state customisations on the dropped axes
are discarded; the default-state value remains authoritative.

- **Button.** `StandardButtonsEditor` renamed to `ButtonEditor`. Per-state
  shape tokens (`padding`, `radius`, `border-width`) dropped for `hover` and
  `disabled` across all variants. They were always linked to the default
  state at runtime, so the per-state rows in the editor were dead UI.
  Migration: `2026-05-24-promote-state-shared-tokens`.
- **ProgressBar.** Collapsed from a per-variant token namespace
  (`primary` / `success` / `warning` / `danger` / `info`) to a single flat
  token set. Fill color is now a runtime `fill` prop on the consumer side,
  not a variant axis. The `primary` namespace's values become the canonical
  defaults; non-primary customisations are dropped.
  Migration: `2026-05-24-progressbar-collapse-variants`.
- **SegmentedControl.** `--segmentedcontrol-divider-height` retired in
  favour of `--segmentedcontrol-divider-inset` (margin-block on a stretched
  divider, so `Full` = 0 inset = bar-height). Value semantic flipped, so
  saved customisations are dropped rather than copied. Per-state icon-size
  tokens for `selected` / `option-hover` / `disabled` also dropped (always
  linked at runtime).
  Migrations: `2026-05-24-segmentedcontrol-divider-inset`,
  `2026-05-24-promote-state-shared-tokens`.
- **CollapsibleSection.** Dropped the `active` header state and the matching
  `&.active` CSS branch. No consumer was using it.
  Migration: `2026-05-24-collapsiblesection-drop-active-state`.
- **CornerBadge.** Per-variant token axis collapsed to a single flat set.
  Variants only ever carried shape/spacing/type aliases (never colours),
  and every variant's defaults were identical, so the strip was 10×
  duplication with no semantic gain.
  Migration: `2026-05-25-cornerbadge-flatten-variants`.

### Migration for existing consumers

Either keep your current root-level layout by passing explicit options, or
relocate your data folders and let defaults take over.

Keep root layout (one-line config file or explicit option):

```json
// live-tokens.config.json
{ "dataDir": "." }
```

Or move to the new default and drop any data-folder options from
`themeFileApi(opts)`:

```bash
mkdir -p src/live-tokens/data
git mv themes src/live-tokens/data/themes
git mv manifests src/live-tokens/data/manifests
git mv component-configs src/live-tokens/data/component-configs
```

Stop the vite dev server first — its HMR will pre-create the destination
dirs if it picks up the plugin reload mid-move. The source repo itself ships
with data at the new default location.

## 0.6.0 — Editor CSS isolation

The editor now self-contains its chrome. A second consumer can `npm install
@motion-proto/live-tokens`, import only their own `tokens.css`, mount
`<Editor />` or `<ComponentEditorPage />`, and have everything render — no
remembered side-imports, no theme-token bleed into editor controls.

### Changed (breaking)

- **`form-controls.css` → `ui-form-controls.css`** with classes renamed
  `.form-*` → `.ui-form-*` and every theme token re-tokened to the `--ui-*`
  namespace. Consumers using `.form-input` / `.form-select` directly need to
  rename. (The only known consumer is `runegoblin-site`, which uses these
  only via `live-tokens`' own editor components, so no migration needed
  there.)
- **Editor pages auto-load their own CSS.** `Editor.svelte` and
  `ComponentEditorPage.svelte` now script-import `ui-editor.css`,
  `ui-form-controls.css`, and `@fortawesome/fontawesome-free/css/all.min.css`.
  Consumers no longer need to import these in `main.ts`.
- **Editor font invariant.** Editor chrome resolves only `--ui-font-*`
  tokens (a pure system stack defined in `ui-editor.css`). Theme fonts
  (`--font-sans`, `--font-serif`, `--font-display`, `--font-mono`) can no
  longer leak into editor controls — `ui-form-controls.css` was the last
  surface that referenced them.

### Removed exports

| Removed | Replacement |
|---|---|
| `./styles/form-controls.css` | Auto-loaded; not exported |
| `./styles/fonts.css` | `./starter/fonts.css` |
| *(implicit)* | `./starter/tokens.css`, `./starter/site.css` |

`./styles/ui-editor.css` is kept as a read-only window onto the editor token
contract; it's no longer a required consumer import.

### Added

- `scripts/check-no-style-imports.mjs` — fails the build if any published
  `.svelte` `<style>` block contains an `@import`. (This regression killed
  v0.5.0 under the consumer's `css: 'injected'` workaround.)
- `scripts/check-editor-font-isolation.mjs` — fails the build if editor
  chrome references theme-side font tokens.
- `scripts/smoke-install.sh` — packs the library, installs into a temp
  consumer, and runs `vite build` with no special config. Required to pass
  in `prepublishOnly`.

## 0.5.0 — Svelte 5 migration

### Changed (breaking, but with deprecation bridges)

- Components are now authored in Svelte 5 runes (`$props`, `$state`, `$derived`,
  `$effect`, snippets). Existing consumer code on Svelte 4 idioms continues to
  work for one release thanks to the bridges below; both forms are valid in
  0.5.0, the legacy form is removed in 0.6.0.

- **Event dispatch → callback props.** Each public component grew an
  `oncamelcase` callback prop alongside its existing `createEventDispatcher`
  event:

  | Component            | Legacy `<Comp on:event={fn}>` | Preferred `<Comp onevent={fn}>` |
  | -------------------- | ----------------------------- | -------------------------------- |
  | `Button`             | `on:click`                    | `onclick(event: MouseEvent)`     |
  | `SegmentedControl`   | `on:change`                   | `onchange(value: string)`        |
  | `CollapsibleSection` | `on:toggle`                   | `ontoggle()`                     |
  | `TabBar`             | `on:tabChange`                | `ontabChange(id: string)`        |
  | `RadioButton`        | `on:click`                    | `onclick()`                      |
  | `Notification`       | `on:dismiss`                  | `ondismiss()`                    |
  | `Dialog`             | `on:close`                    | `onclose()`                      |

  Both are fired in 0.5.0 (dual-fire). The `createEventDispatcher` calls and
  the `on:event` legacy bridge are removed in 0.6.0.

- **Slots → snippets.** Most slots translate one-to-one (default slot →
  `children` snippet). The hyphenated slots that the `sv migrate` codemod
  refused to rename automatically were hand-renamed to camelCase identifiers
  (consumers must rename their `<svelte:fragment slot="x">` to
  `{#snippet x()}` and update the slot name):

  - `Badge` / `CornerBadge`: `slot="icon"` → `iconSlot` (the `icon` prop's
    name was kept; the slot was renamed to resolve the collision)
  - `Dialog`: `slot="footer-left"` → `footerLeft`
  - `UITokenSelector`: `trigger-preview` → `triggerPreview`,
    `trigger-text` → `triggerText`, `trigger-title` → `triggerTitle`,
    `trigger-meta` → `triggerMeta`
  - `VariantGroup` (component-editor): `state-actions` → `stateActions`,
    `composite-controls` → `compositeControls`

  Unlike the event bridge, the legacy `<slot>` form cannot coexist with
  snippets in a runes-mode component, so this part is a hard rename in
  0.5.0 — there's no compat window.

### Peer ranges

- `svelte`: `^4.2 || ^5` → `^5` (drops Svelte 4 entirely)
- `vite`: `^5 || ^6 || ^7` → `^6 || ^7` (the chosen `@sveltejs/vite-plugin-svelte@^6` peers Vite 6.3+)

### Internal

- Toolchain bumped to `svelte@5.55+`, `vite@7`, `@sveltejs/vite-plugin-svelte@6`,
  `svelte-check@4`. `compatibility.componentApi: 4` is enabled in
  `svelte.config.js` so `new Component({ target, props })` (used by tests and
  by consumers using the Svelte-4 imperative API) keeps working until 0.6.0.
- `publicSurface.test.ts` (the green bar from 0.4.0) is still 27/27.

## 0.4.0

### Changed

- **Peer ranges widened** so consumers can install on modern toolchains without `--legacy-peer-deps`:
  - `svelte`: `^4.2` → `^4.2 || ^5`
  - `vite`: `^5.0` → `^5 || ^6 || ^7`
- Components remain authored in Svelte 4 idioms (`export let`, `createEventDispatcher`, `<slot>`). On Svelte 5 they compile in **legacy mode** — the consumer-facing API (`on:event`, named slots, `bind:value`) is preserved. A full migration to runes is planned for a future major.

### Internal

- Added a public-surface test (`src/components/__tests__/publicSurface.test.ts`) that pins the event-dispatch, slot, bind, and mount contracts for every shipped component. This is the green bar the upcoming Svelte 5 rune migration must keep passing.

## 0.3.7

### Internal

- Stop shipping colocated `*.test.ts` / `*.spec.ts` files in the npm tarball (negation patterns in `package.json#files`). Drops 8 files / ~57 KB; consumers see no change.
- Added `.github/workflows/verify.yml` (lockfile drift, type-check, tests, plugin build, packaging dry-run) — runs on every push to main and on PRs, so release failures surface before tagging.
- `publish.yml` now refuses to republish an existing version, runs `npm pack --dry-run` before the irreversible publish, and uses the npm cache.

## 0.3.6

First release published via the GitHub Actions OIDC trusted publisher workflow. `0.3.3`–`0.3.5` were tagged but never reached npm — the lockfile carried stale resolutions from a non-clean local `npm install` and failed `npm ci` in CI. `0.3.6` regenerates the lockfile from a clean state and pins CI to Node 24.

### Fixed

- `GradientCard` (Section Divider gradient editor) now renders the ribbon and stop handles correctly when a stop's color is still at the component's CSS default. Previously the ribbon and unselected diamond handles fell back to gray (`#888`) because the card read `aliases[…]` directly, which only contains user overrides. Stop colors now reference the CSS var so the cascade fills in component defaults (and live edits) the same way `UIPaletteSelector`'s swatch already did.

### Internal

- Added `.github/workflows/publish.yml`: tag push (`v*`) triggers an OIDC-authenticated `npm publish --provenance --access public`. No `NPM_TOKEN` secret; npm trusts this workflow via Trusted Publisher.

## 0.3.2

### Docs

- Reframed README around the package as a library-first foundational design system for microsites. Real-time editing of tokens and components is now the headline; the `npx degit` starter is presented as a greenfield convenience rather than the primary consumption path. Added a "File ownership" section documenting which files the vite plugin writes (and when).

### Internal

- Flattened lingering multi-config state in `component-configs/`: removed the unused `callout/default_01.json`, `cornerbadge/default_01.json`, and `segmentedcontrol/green-segment-control.json` and repointed all `_active`/`_production` pointers to `default`. Every shipped component now has a single canonical config.

## 0.3.1

First published release in the 0.3.x line — 0.3.0 was bumped locally but never pushed to npm. No code changes from 0.3.0.

## 0.3.0

### Breaking

- Rename "token file" → "theme" throughout, since the saved JSON files are themes (groupings of tokens, fonts, palettes), not individual tokens.
  - Vite plugin: `tokenFileApi` → `themeFileApi`, options `tokensDir` → `themesDir`, `variablesCssPath` → `tokensCssPath`. Type `TokenFileApiOptions` → `ThemeFileApiOptions`.
  - Default directory: `tokens/` → `themes/`. Stylesheet: `src/styles/variables.css` → `src/styles/tokens.css`.
  - API routes: `/api/tokens/*` → `/api/themes/*`. Backup type discriminator `'tokens'` → `'themes'`.
  - Library exports: `TokenFile` → `Theme`, `TokenFileMeta` → `ThemeMeta`. Service functions renamed (`listTokenFiles` → `listThemes`, `loadTokenFile` → `loadTheme`, `saveTokenFile` → `saveTheme`, `deleteTokenFile` → `deleteTheme`, `getActiveTokens` → `getActiveTheme`, `migrateTokenFileFonts` → `migrateThemeFonts`, `initializeTokens` → `initializeTheme`).
  - Showcase: `TokenFileManager` component → `ThemeFileManager`.
  - "design token" terminology preserved for individual CSS variables (`tokenRegistry`, package name, `design-tokens` keyword).

## 0.2.0

Repositioning release: the repo is now officially both a starter template (via `degit`) and a library (via `npm install`). The starter's home route is now an empty stub authors replace, and the old `Landing.svelte` demo content moves to `/kit`.

### Breaking

- `src/pages/Landing.svelte` → renamed to `src/pages/KitDemo.svelte`. The `/` route is now `Home.svelte` (starter stub); the kit demo lives at `/kit`. Starter consumers upgrading a clone should rename their own landing file or rebase onto the new layout.
- `src/showcase/index.ts` — `defaultSections` is now a runtime export (re-added after an accidental removal in the 0.1.x line). It also moved out of `ComponentsTab.svelte` into a standalone `src/showcase/defaultSections.ts` so it can be imported without loading all demo components.
- `package.json` exports — dropped the unused `./showcase-page`, `./overlay`, and `./columns-overlay` subpaths. `LiveEditorOverlay` and `ColumnsOverlay` are still available from the root import. Consumers who hand-declared ambient `declare module` entries for these in their own `vite-env.d.ts` can delete them.
- `LiveEditorOverlay` — the `open` prop is now optional. When unbound, the component self-persists the open/closed state in localStorage. Consumers binding `open` get the same behavior as before.

### Added

- `./admin` export now ships with a `types` branch (`Admin.svelte.d.ts`). Consumers can delete their hand-written `declare module '@motion-proto/live-tokens/admin'` shims.
- `tokenFileApi` Vite plugin now auto-injects `__PROJECT_ROOT__` as a `define`. Consumers no longer need to add it to their own `vite.config.ts`.
- `LiveEditorOverlay` self-gates dev/iframe/editor-route visibility. Consumers can drop `<LiveEditorOverlay />` without wrapping it in `{#if import.meta.env.DEV && !isInIframe}` boilerplate.
- `ColumnsOverlay` self-gates on dev + iframe for the same reason.
- Admin "Back to site" button now navigates to the last non-admin route (via `sessionStorage`), falling back to `/kit`.
- New `src/pages/Home.svelte` starter stub and `src/pages/KitDemo.svelte` marketing/demo page.

### Internal

- Reworked README with separate "Use as a starter" and "Use as a library" sections.
- `src/styles/fonts/` font system, `fontLoader`, `fontMigration`, `fontParse`, `FontStackEditor`, `ProjectFontsSection` added in the 0.1.x line are now documented.

## 0.1.1

Initial scoped-package release extracted from RuneGoblin.
