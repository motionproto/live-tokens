# Changelog

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
