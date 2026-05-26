# Changelog

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
