# Changelog

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
