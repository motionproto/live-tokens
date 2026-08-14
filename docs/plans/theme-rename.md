# Theme rename: retire "manifest"

Status: PLANNED 2026-08-14. Executes as further commit units on `manifest-encapsulation`, before merge. Decided with Mark: the word "manifest" retires everywhere; the whole-look file becomes the **Theme**; the inner colors-and-typography layer becomes **ColorsAndType**.

## Why this is safe now

The entire manifest system lives on this unmerged branch. No release ships the v2 manifest format, the `/api/live-tokens/manifests` routes, or the manifest public exports. A rename today costs a mechanical sweep; after merge and release it would cost a public-API break plus consumer migrations.

The UI already made the switch. `ThemePanel.svelte` labels everything "Theme" and its parts "Colors & Type" and "Components"; a code comment states the word manifest does not appear in the UI. The audit confirmed a manifest holds nothing but look content: an embedded theme (colors + typography) plus per-component alias deltas. There is no non-visual payload that would block calling it a theme.

## Vocabulary

| Concept | Old name | New name |
|---|---|---|
| Whole look, one durable file | Manifest | **Theme** |
| Colors + typography layer (palettes, cssVariables, fonts, harmonyAxes) | Theme | **ColorsAndType** |
| Per-component alias deltas inside the file | componentConfigs | componentConfigs (unchanged) |
| Working-file kind in the Load list | `layer` | executor's call per the rule below |

Concrete surfaces:

| Surface | Old | New |
|---|---|---|
| Types (`themeTypes.ts:97-120`, `:175-190`) | `Theme`, `ThemeMeta` / `Manifest`, `ManifestMeta`, `ManifestBundle`, … | `ColorsAndType`, `ColorsAndTypeMeta` / `Theme`, `ThemeMeta`, `ThemeBundle`, … |
| Data dirs | `data/themes/` / `data/manifests/` | `data/colors-and-type/` / `data/themes/` |
| Routes (`themeFileApi.ts:925-935`) | `/api/live-tokens/themes/*` / `…/manifests/*` | `/api/live-tokens/colors-and-type/*` / `…/themes/*` |
| Config keys (`vite-plugin/files/dataPaths.ts`) | `themesDir` / `manifestsDir` | `colorsAndTypeDir` / `themesDir` |
| Client services | `themeService.ts` (inner) / `manifestService.ts` | `colorsAndTypeService.ts` / `themeService.ts` |
| Server modules | `vite-plugin/manifests/` (`normalizeManifest`, `presetManifests.test`) | `vite-plugin/themes/` (`normalizeTheme`, `presetThemes.test`) |
| Editor core | `src/editor/core/manifests/` | dissolves into `src/editor/core/themes/` |
| Scripts | `generate-preset-manifests.mjs`, `collapse-manifest-to-default.mjs`, npm scripts `generate:preset-manifests`, `collapse:manifest` | `generate-preset-themes.mjs`, `collapse-theme-to-default.mjs`, `generate:preset-themes`, `collapse:theme` |
| Store (`productionPulse.ts:49`) | `activeManifest` | `activeTheme` |
| Embedded key in the whole-look JSON | `theme:` | `colorsAndType:` (schemaVersion 2 → 3, see unit 4) |
| Public exports (`src/editor/index.ts:51-67`) | `listManifests`, `applyManifest`, … (11 functions + types) | `listThemes`, `applyTheme`, … |

## Classification rule for `theme` identifiers

The repo has roughly a thousand `theme`-family identifiers. For each one the executor asks: **does it denote the colors-and-typography file/type/resource, or the whole look?**

- Inner layer → rename to the ColorsAndType family. Examples: `Theme` type, `normalizeTheme`, `themesResource`, `themeDirty`, `readTheme`/`persistTheme`/`listThemes` (the resource functions), `themePath`, `embeddedTheme`, `hydrateTheme`, `themeWithPalettes`, `migrateThemeFonts`, `themeProductionInfo`.
- Whole look → keeps or receives the Theme name. Examples: `ThemePanel` (already correct), everything currently named `manifest*`.
- Neutral infrastructure serving both → keep. Examples: `themeFileApi.ts` (the file API for the whole theme system), `themed` CSS classes.
- The `look` family (`captureLook`, `adoptLook`, `lookPreview`, `lookSummary`) stays. "Look" reads as an informal synonym for the whole theme; renaming it buys nothing.

## What does not change

- No JSON restructure. The whole-look file keeps its shape (`{ name, timestamps, colorsAndType, componentConfigs }`); the inner file format is untouched apart from its directory. Mark's colors/shape/type mental model maps to the existing two parts: ColorsAndType is global, componentConfigs carries per-component shape, space, and color assignments. A strict colors-versus-shape split would cut across the alias map, so we keep the seam where it is.
- No behavior change. Apply, capture, adopt, delete, boot regeneration of Default: all identical.
- No compatibility fallbacks. Nothing shipped, so `normalizeTheme` (né `normalizeManifest`) does not learn to accept both key spellings; the existing eager boot migration is extended instead (unit 4).
- ColorsAndType file contents keep `schemaVersion: 3` and their existing migration chain.
- CLI command `live-tokens generate-theme` and the bundled skill names keep their user-facing names. A mood brief still gives you your theme's colors; only engine internals follow the classification rule.

## Commit units

Stacked on `manifest-encapsulation`; each unit leaves the tree green (typecheck + full test suite). Inner layer moves first so the word "theme" is free before the manifest side claims it.

1. **Free the word (code).** Rename the inner-layer type and identifier family: `Theme`→`ColorsAndType`, `ThemeMeta`→`ColorsAndTypeMeta`, `themeService.ts`→`colorsAndTypeService.ts`, `normalizeTheme`→`normalizeColorsAndType`, `themeDirty`→`colorsAndTypeDirty`, `themesResource`→`colorsAndTypeResource`, and the rest per the rule. Code-internal only: routes, dirs, and disk files untouched. Generation-engine internals (`generateTheme`, `ThemeBrief`, `buildThemeFromSeeds`, `GenerateThemeReport`) follow the rule; the CLI surface does not.
2. **Free the word (surfaces).** Routes `/api/live-tokens/themes/*` → `/api/live-tokens/colors-and-type/*` plus client fetch paths and tests; `git mv data/themes data/colors-and-type` (including `_active.json`/`_production.json`); `dataPaths.ts` key `themesDir`→`colorsAndTypeDir`; script write paths.
3. **Manifest → Theme (code).** Types, the ~14 functions, public exports in `index.ts`; `manifestService.ts` moves to `src/editor/core/themes/themeService.ts` and `lookSummary` moves with it; `core/manifests/` deleted; `vite-plugin/manifests/`→`vite-plugin/themes/` with `normalizeManifest`→`normalizeTheme`; `activeManifest` store→`activeTheme`; user-visible error strings ("Active manifest is protected", "Not a manifest bundle", the `[live-tokens] Manifest "x"` console warning); the stale `ThemePanel.svelte:2-5` comment.
4. **Manifest → Theme (surfaces and data).** Routes `/manifests/*`→`/themes/*`; `git mv data/manifests data/themes`; config key `manifestsDir`→`themesDir`; embedded key `theme:`→`colorsAndType:` with whole-look `schemaVersion` 2→3, folded into the existing eager boot migration (v1 pointer → v3 in one pass; the v2→v3 step is a key rename); bundle `kind` discriminator renamed to a theme-worded value; `package.json` `files` entries and npm scripts; script file renames; regenerate the nine presets and Default via the generators; rewrite `my-manifest.json` in place as `my-theme` whole-look (note: `data/colors-and-type/my-theme.json` from unit 2 is a working file and keeps its name; the boot heal already handles the dangling `my-manifest_01` active pointer).
5. **Docs, copy, and the gate.** README.md, TOKENS.md, `src/editor/docs/content/*.md` (rewrite the "on disk a theme is a manifest" paragraph in `themes-workflow.md:21-22`; fix path mentions in `getting-started.md`, `editing-tokens.md`), CHANGELOG unreleased section only, bundled skills under `skills/`. Gate: `grep -ri manifest` over the repo (excluding node_modules/dist) returns only the allowlist: `index.html:9` (web app manifest, unrelated), `docs/plans/*.md` (historical records, untouched), CHANGELOG entries for already-released versions.

## Invariants

- Pure rename: every unit's diff is names, paths, and strings. Any behavioral diff is a defect.
- After unit 5, "theme" always means the whole look and "ColorsAndType" always means the inner layer, in code, routes, disk, and docs alike.
- Each unit compiles and passes the full suite before commit; no cross-unit breakage windows beyond the documented route/identifier staging (unit 1 renames identifiers whose route strings move in unit 2; that mismatch lives only between adjacent commits on the branch).
- No new fallback or dual-format acceptance anywhere.

## Reserved judgment calls

- Tail-end `theme` identifiers not listed here: classify per the rule; when genuinely ambiguous, prefer the whole-look reading (the common word should mean the common thing).
- `LoadRowKind = 'look' | 'layer'` and the `layer*` helpers (`layerFlush`, `layerFileName`): rename `layer` to the ColorsAndType family or keep as informal internal vocabulary; executor decides for consistency with what unit 1 produced.
- Exact wording of rewritten docs paragraphs and error strings.
- Test file names mirror their subjects (`themeFileApi.manifests.test.ts` → `themeFileApi.themes.test.ts`, etc.).

## Release-gate note (for the eventual release, not this branch)

Released consumers may set `themesDir` in `live-tokens.config.json`, where it means the colors-and-type directory. After this rename the same key means the whole-look directory. Before releasing the encapsulation feature, audit the known consumers' configs (live-tokens-online, the create-template consumers) and cover the key's meaning change in the release notes and upgrade steps. No compatibility shim in code.

## Out of scope

- Restructuring the whole-look JSON into explicit colors/shape/type parts.
- Renaming the `generate-theme` CLI command or bundled skill directories.
- Touching `docs/plans/manifest-encapsulation.md` or other historical plan docs.
- The unreleased `shape-space-adjust` CLI's deferred whole-look writing; its plan doc keeps its own vocabulary until that work resumes.
