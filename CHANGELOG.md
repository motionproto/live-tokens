# Changelog

## 0.3.3

### Fixed

- `GradientCard` (Section Divider gradient editor) now renders the ribbon and stop handles correctly when a stop's color is still at the component's CSS default. Previously the ribbon and unselected diamond handles fell back to gray (`#888`) because the card read `aliases[…]` directly, which only contains user overrides. Stop colors now reference the CSS var so the cascade fills in component defaults (and live edits) the same way `UIPaletteSelector`'s swatch already did.

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
