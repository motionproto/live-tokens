# Working-set ownership: the document model

Status: approved for execution. Supersedes the proposal version of this file (2026-08-15). Execute on a branch (`working-set`) after the in-flight gradients work is committed; the working tree must be clean at Wave 1.

## Problem

Applying a theme materialises its look into per-slug working files (`colors-and-type/<slug>.json` plus `component-configs/<comp>/<slug>.json`, ~24 files) and flips every `_active`/`_production` pointer at them. Nothing removes these files: switching themes strands the previous set, deleting a theme orphans its set (`themeFileApi.ts` `handleApplyTheme` L1423, theme DELETE L1379). A consumer who samples the shipped presets accumulates dozens to hundreds of JSON files. Worse, apply also flips production, so trying a theme silently changes the consumer's published `tokens.generated.css`.

Root cause: machine-derived copies share a flat namespace with user-authored named files, with no ownership marker, so no code can safely delete anything.

## The model

The standard document model, with themes as documents:

| Concept | Here |
|---|---|
| Document | Theme (`themes/<slug>.json`), carries the look by value |
| Open document | `themes/_active.json` names it |
| Published document | `themes/_production.json` names it (new; `themesResource` already has the unused slot) |
| Unsaved buffer | `_working.json` files, one reserved slot per layer |
| User presets | Named files, never machine-written |

**Absence means default.** `colors-and-type/_working.json` and `component-configs/<comp>/_working.json` exist only where the open look sits off the shipped default. A pristine consumer tree has no working files at all. `listNames()` already hides `_`-prefixed files (`versionedFileResourceServer.ts:152`), so `_working` is invisible to every listing by construction.

**Production is a saved theme, by value.** `regenerateTokensCss` bakes from the production theme's embedded content (colors from `theme.colorsAndType`, component aliases from `theme.componentConfigs` diffed against each `default.json`), never from the buffer or from named files. Promoting requires a saved theme; the existing 409 `ACTIVE_IS_PROTECTED` fork-to-`my-theme` flow already establishes that UX. The per-layer `_active.json`/`_production.json` pointer files (~50 in a full tree) are retired entirely.

Two deliberate behavior changes, both fixes:

1. **Apply no longer promotes.** Today `handleApplyTheme` sets production so the page picks the look up without Adopt. Under the model, apply opens the document (the dev page follows the active look via runtime CSS vars) and only Adopt publishes. Sampling themes must not rewrite the consumer's production CSS.
2. **Per-component Adopt funnels to whole-look Adopt.** Production is one named theme, not a mix of per-slice pointers; `ComponentFileManager`'s Adopt action triggers the whole-look promote (saving first via the existing dirty flow). `handleUpdateProduction`'s per-slice path goes away.

## What does not change

- Themes as source of truth, schemaVersion 3, delta encoding (component absent = default), import/export bundles, `normalizeTheme`.
- Named colors-and-type files as loadable presets: the 8 shipped package files stay shipped, colors-only apply stays, user-owned named files stay listable/loadable/deletable. Only their machine-written creation path disappears.
- `component-configs/<comp>/default.json` derivation from `:global(:root)` blocks, `sync-component-defaults`, `generate-preset-themes` outputs (it never touched pointers).
- The live-from-package fallback (`existingPath`, `isPackageFile`, `packageOwnedNames`), boot default-theme materialisation, `migrateLocalThemes`.
- tokens.css text migrations, `pruneMarkers` as a feature (its production *source* changes, below).
- `dataDir` config keys and default locations.

## Commit units

Each unit leaves typecheck + full suite green. UI coherence is fully restored by unit 3; between units 2 and 3 the client still calls retired doors, acceptable only as adjacent commits on the branch.

### 1. Reserve the slot (additive, no behavior change)

- `versionedFileResourceServer.ts`: add `workingPath()` and `readWorking()`/`writeWorking()`/`clearWorking()`; existing API untouched.
- `themeFileApi.ts`: every `:name` route (`COLORS_AND_TYPE_BY_NAME_REGEX`, `COMP_BY_NAME_REGEX`, `THEME_BY_NAME_REGEX`, import's allocator) rejects `_`-prefixed names with 400 `RESERVED_NAME`. `sanitizeFileName` (`versionedFileResourceClient.ts:137`) strips leading underscores.
- New routes, peers of `/active`: GET/PUT/DELETE `${API_BASE}/colors-and-type/working` and `${API_BASE}/component-configs/:comp/working`. GET 404s when absent.
- Tests: reservation on every door; working routes round-trip; `listNames` invisibility already pinned at `versionedFileResourceServer.test.ts:~139`.

### 2. Server model swap

- `handleApplyTheme` (L1423): write `_working` for the colors layer and each carried component, `clearWorking()` for uncarried ones and for the whole tree on `default`; set `themes/_active.json`; **no** named-file writes, **no** `_active`/`_production` pointer flips, **no** production change; keep the one `syncComponentsToCss()`-equivalent bake only if production is affected (it is not; drop the CSS regen from apply).
- `handleAdoptLook` (L1633): set `themesResource.setProductionName(activeThemeSlug)`, `regenerateTokensCss()`, `syncFontsToCss` from the theme's embedded fonts; 409 `ACTIVE_IS_PROTECTED` unchanged. `patchActiveTheme` re-embedding becomes unnecessary (the client saves before adopting); remove it with its callers or keep as save door, executor decides per unit-3 shape.
- `regenerateTokensCss` (L309): source = production theme resolved via `themesResource` (local `default.json` always exists via `ensureDefaultTheme`); section 2 diffs `theme.componentConfigs[comp]` vs `default.json`. `syncFontsToCss` reads the production theme's embedded `fontSources`.
- Retire per-layer pointer doors: `handleSetActiveColorsAndType`, `handleSetProductionColorsAndType`, `handleSetComponentActive`, `handleSetComponentProduction` and their routes; `ensureMeta` no longer writes layer/component pointers; `themesResource.ensureMeta` writes both theme pointers.
- Read doors: `handleGetActiveColorsAndType` serves `_working` when present, else the active theme's embedded copy, else package default; the payload must let the client distinguish buffer from pristine (shape is a reserved judgment). Component actives likewise. `handleListComponents` drops `activeFile`/`productionFile` or re-derives them as `'_working' | 'default'` presence flags.
- Theme DELETE: 403 when the slug is production (`PRODUCTION_THEME`); deleting the active theme keeps `_working` (buffer survives its document) and heals `themes/_active.json` to `default`.
- `handleColorsAndTypeByName` PUT/DELETE lose their production re-bake branches (production no longer names files).
- Boot: `configureServer` order unchanged; add a boot heal that warns (not deletes) when legacy per-layer pointer files exist, pointing at `npx live-tokens migrate`.
- Tests: rewrite `themeFileApi.themes.test.ts` apply/adopt/deletability describes and `themeFileApi.fallback.test.ts:364` materialisation cases to the new contract; add: apply A then apply B leaves exactly B's `_working` set; apply `default` leaves none; adopt bakes from the theme while later `_working` edits do not re-bake; production theme delete 403.

### 3. Client retarget

- `colorsAndTypeService.ts`: `persistColorsAndType`/`hydrateColorsAndType` target the `/working` route; `setActiveFile`/`setProductionFile`/`getProductionInfo` replaced by theme-level equivalents in `themeService.ts` (`getProductionTheme`, exposed via `productionPulse.colorsAndTypeProductionInfo` successor).
- `componentConfigService.ts`: `setActiveComponentFile`/`setComponentProductionFile` removed; save/load of named files stays for presets; working flows use the `/working` route.
- `themeService.ts` `captureLook`: unchanged cadence (flush then capture), reading the working doors.
- `ThemePanel.svelte`: `flushLayer` writes `_working` (drop `layerFlushTarget`'s fork-to-`my-colors`; `layerFlush.ts` shrinks or dies); `commitWholeLook`/`commitColorsOnly` prompt on the content-diff signals (`colorsAndTypeDirty`, `componentDirty` count), not history `$dirty`; `commitColorsOnly` copies the preset into `_working` — the shadow-collision confirm (L466) and the `saveColorsAndType(row.slug, …)` write disappear; Adopt calls the theme-level promote. `loadRows.ts`: layer rows keep existing (presets), the `look:`/`layer:` id namespacing stays but slug collision with looks no longer occurs.
- `ComponentFileManager.svelte`: `persist` targets `/working`; Save As still creates named preset files; `handleUpdateProduction` becomes the whole-look adopt path; `isApplied` derives from production-theme comparison.
- Stores: `activeFileName` semantics become "open theme's display identity plus buffer presence"; `themeInit.ts` reads the new active payload; `editorPersistence.ts:88` `slice.activeFile` hydrate and `lookSummary.lookProductionState`/`countComponentsOffLook` re-derive from presence/content, not file names.
- Public API (`src/editor/index.ts`): drop `setActiveFile`/`setProductionFile`/`getProductionInfo` layer exports, add the theme-level replacements. Pre-1.0 breaking change, CHANGELOG-labeled.
- Tests: `ThemePanel.test.ts`, `layerFlush.test.ts` (retire or shrink), `loadRows.test.ts`, `lookPreview.test.ts`.

### 4. CLIs, scripts, pruner

- `bin/generate-theme.mjs`: emit `themes/<slug>.json` (envelope: name, createdAt preserved, schemaVersion 3, engine-built `colorsAndType`, `componentConfigs` carried from the active theme) and, unless `--no-activate`, apply it (write `_working`, set `themes/_active.json`). No named colors-and-type write. `--dry-run`/`--carry-from` semantics preserved; report copy updated. Add the missing test suite modeled on `bin/adjust.test.ts`.
- `bin/adjust.mjs`: write each touched component's `_working.json`; drop the rolling `adjusted` slug and pointer flips; `--no-activate` becomes meaningless and is removed from the surface.
- `bin/migrate.mjs` + a new `dist-plugin` engine entry (`migrateData`, same barrel shape as `adjust/index.ts`): the tree heal, `--check` prints the plan:
  1. Derive the production theme: if legacy per-layer `_production` pointers all resolve to content deep-equal (ignoring `updatedAt`, `_fileName`) to a theme's embedded copy → that theme; all `default` → `default`; anything else → capture the pointed production state into `themes/recovered-production.json` and name it. Never silently change what is live.
  2. Derive `_working`: where legacy `_active` pointers name content differing from the active theme's embedded copy, write it to `_working`; else none.
  3. Delete named files deep-equal to any theme's embedded copy (the leak). Files equal to no theme are user files: keep and report.
  4. Delete the legacy per-layer `_active.json`/`_production.json` files.
  5. Print every deletion and every kept-as-user-file.
- `scripts/collapse-theme-to-default.mjs`: bake the active theme into defaults, then delete `_working` files and the theme; `pointedFiles`/`clearWorkingFiles` discovery collapses to the fixed slots.
- `scripts/check-production-is-default.mjs`: assert `themes/_production.json` = `default`, `themes/_active.json` = `default`, no `_working.json` anywhere, no component-alias block in `tokens.generated.css`.
- `vite-plugin/pruneMarkers/loadProductionConfig.ts:64`: read the production theme's embedded config for the component (absent = default) instead of pointer + named file.
- Run the migrate heal over this repo's own tree and commit the result (the ~50 pointer files and any per-slug leftovers disappear).

### 5. Docs, skills, gate

- `src/editor/docs/content/themes-workflow.md` (working-files paragraphs :30-32, save :38-39, name rules :46-48, load :51-60, adopt :64-70, commit guidance :84-87), `getting-started.md:44-56`, `editing-tokens.md:72-73`; then `npm run sync:docs` (the `check:docs-content` gate).
- `README.md`: :14-16 (also fix the stale "Nine example looks", 7 ship), :47-48, :54-76, :211, :274-286 (drop the `_backups/` claims, nothing writes backups), :354, :362-384. `TOKENS.md:54-60`: `migrate` now also heals data files. `template/README.md:29` survives; root `.gitignore` drops the vestigial `_backups/` entries.
- `.claude/skills/live-tokens-generate-theme/SKILL.md` (:8, :13, :17, :43) and `live-tokens-adjust-shape-space` copy; `bin/cli.mjs` USAGE text (:22-60) and `formatGenerateThemeResult` copy.
- CHANGELOG (unreleased): behavior changes 1 and 2, the public-API changes, the migrate requirement.
- Gate: `grep -rn "_active.json\|_production.json"` outside `themes/`, tests, migrations, and historical plan docs returns nothing; `grep -rn "productionFile"` returns only the theme-level pointer and migration code.

## Invariants

- After unit 2: the server never writes a layer or component file whose name is not `_working` or `default`. Named files are written only by explicit user/API save doors and `generate-preset-themes`.
- Apply A → apply B → delete A and B leaves the data tree with exactly B's-turned-active buffer state and no other residue; apply `default` after that leaves a pristine tree.
- Trying a theme never changes `tokens.generated.css`; only Adopt does.
- `_working` is never listed, never a legal save/import name, and absent on a pristine tree.
- The migrate heal never deletes a file whose content matches no theme, and never changes the effective production output without recording it as a named theme.
- No route or CLI writes outside the resolved data dirs, `tokensCssPath`, and `fonts.css` (add the test in unit 1).

## Reserved judgment calls

- The exact wire shape distinguishing buffer/pristine on the active read doors, and what `_fileName` carries now.
- Whether `patchActiveTheme` survives as an internal save door or is deleted in unit 2.
- `activeFileName` store rename (it no longer names a file) and how far the `layer` vocabulary shrinks.
- Naming of the theme-level production service functions and the `recovered-production` slug wording.
- Whether `adjust` prints a "save your theme to keep this" hint.

## Release gate

Consumers on the old model must run `npx live-tokens migrate` once; the dev plugin warns when legacy pointer files exist but never deletes. Release notes cover: the migrate step, apply-no-longer-promotes, per-component Adopt funneling, and the public-API export changes. Audit live-tokens-online and the create-template consumers before release. Pre-1.0: breaking-labeled minor.

## Out of scope

- Continuous/debounced auto-flush of the buffer to `_working` (crash-safe autosave); the explicit flush cadence stays.
- Relocating or package-resolving `component-configs/<comp>/default.json` derivation.
- Bring-your-own-router, docs route work, and anything in the gradients branch.
- Renaming the `generate-theme` CLI or skill directories.
