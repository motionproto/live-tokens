# Theme dimension ownership

Companion to `docs/theme-dimension-architecture.md`, whose Audit section holds
the findings and the verdict. This doc turns that verdict into six waves on
branch `three-contributing-skills`, each a single commit unit executable by a
sub-agent with only this doc and the repo. Waves are strictly sequential; each
ends green except where the doc says otherwise.

**The change in one paragraph.** A theme is three decisions and one document.
Each set verb writes only its own dimension into the live buffers the page
already renders, and one new verb, `save-theme <name>`, composes the live
state into `themes/<slug>.json` and opens it. `set-colors` stops writing and
activating themes, loses `--carry-from` and `--no-activate`, and its base color
file loses `name`. The engine bundles take the verbs' names. A migration drops
36 dead keys from the override bag, the nine presets are rewritten once, and a
gate keeps the bag inside the names `tokens.css` declares. No directory moves
and no theme schema bump.

**Execution model.** A fresh session orchestrates from this doc and writes no
wave code itself. Each wave runs in the sub-agent the Models table names. The
review gate after each wave runs `wave-reviewer` at the tier the table names.
`test-verifier` runs every suite the Verify blocks call for; the executor never
pastes raw test output into the orchestrator's context. The manual halves of
each wave's verification belong to the user; the executor runs only the
automated commands and reports the manual checklist as pending.

**Precondition.** The tree carries uncommitted work the orchestrator does not
own: edits to `.claude/skills/live-tokens-create-theme/SKILL.md`,
`src/editor/overlay/LiveEditorOverlay.svelte` (547 lines), the two atlas files,
and an untracked draft at `live-tokens-create-theme/skill-alt.md`. Commit
`docs/theme-dimension-architecture.md` and this doc as their own commit. Then
stop and ask the user to commit or set aside the rest before Wave 1. Never
stash, reset, or check out over it. No dev server may be running during a
wave; a running server re-derives configs and rewrites the data tree under the
executor (`feedback_cli_buffer_vs_running_editor`).

Line numbers date from `7f84109`. Locate by the cited symbol or string, and
stop only if the symbol itself is gone.

## Status

| Wave | Summary | Executor | Reviewer | Status | Commit |
|---|---|---|---|---|---|
| 0 | Precondition: docs committed, user's work settled | orchestrator | none | Done | 5b80fc5 |
| 1 | One live-state reader under `bin/lib/` | wave-executor, Opus | Opus | Done | 5e141ca |
| 2 | Dead keys: migration, preset sweep, gate | wave-executor, Opus | Fable | Done | db5e22f |
| 3 | Engine names follow the verbs | recipe-sweeper, Sonnet | Opus | Done | 89f0cd5, 99e5183, 8d1461d |
| 4 | `set-colors` narrows, `save-theme` lands | wave-executor, Opus | Fable | Done | 37d414c |
| 5 | Skills and atlas | wave-executor, Opus | Opus | Not started | |
| 6 | Docs, evals, changelog | wave-executor, Sonnet | Opus | Not started | |

The orchestrator updates this table after each review gate: `Not started` to
`In progress` to `Done` (or `Blocked`, with a one-line reason under the table).
Record the short commit SHA.

Waves 1, 2, and 3 are each a recoverable stopping point. Wave 4 alone is a
breaking CLI change with no skill that speaks it, so the tree is coherent again
only at the end of Wave 5. Wave 6 is a stopping point.

## Models

The orchestrator runs on Opus. Fable is reserved for the two review gates where
a mistake is destructive or public: Wave 2 rewrites nine frozen presets and
Wave 4 changes the public CLI. Everything else is Opus or below.

| Agent | Model | Used for |
|---|---|---|
| orchestrator | Opus | reads this doc, dispatches, updates Status, writes no wave code |
| wave-executor | Opus | Waves 1, 2, 4, 5: work that needs judgment about semantics or prose |
| wave-executor | Sonnet | Wave 6: an enumerated docs sweep with the changelog text drafted here |
| recipe-sweeper | Sonnet | Wave 3: renames with a greppable definition of done |
| test-verifier | Sonnet | every Verify block: runs suites and gates, reports a triaged summary |
| census | Haiku | Wave 2 step 1 and every grep-based verification count |
| wave-reviewer | Fable | gates after Waves 2 and 4 |
| wave-reviewer | Opus | gates after Waves 1, 3, 5, 6 |

`wave-reviewer`'s definition names Fable; pass a model override of `opus` for
the four gates that do not need it.

## Invariants

1. `_working.json` stays the editor's live buffer and the only thing a set
   verb writes. No verb stages an edit anywhere the page does not render.
2. Each set verb's write set is disjoint from its siblings'. Color owns
   `editorConfigs`, `harmonyAxes`, `gradients`, and the `cssVariables` keys
   the color pass emits (gradient projections and shadows). Type owns
   `fontSources` and `fontStacks`. Geometry owns the radius, padding, gap,
   and border-width aliases in component buffers. Everything else in
   `cssVariables` carries forward untouched.
3. Only `save-theme` and the editor write `themes/<slug>.json` or move
   `_active.json`. A set verb never activates.
4. `THEME_SCHEMA_VERSION` stays at 5. The theme document's shape does not
   change; `sketchSettings` stays where it is.
5. No CLI alias and no legacy dispatch survives any wave. `--carry-from` is
   gone, not moved.
6. A `.mjs` module a test reaches loads the compiled engine inside the
   function that needs it, never at module top (`bin/engineLoadsLazily.test.ts`).
7. The data tree under `src/live-tokens/data/` is unchanged at every wave
   boundary except Wave 2, where the rewrite is the deliverable. Any run that
   exercises a CLI restores the tree per `CLAUDE.md`.
8. The two atlas syncs run after any edit to a `SKILL.md` or a `references/*.md`.
9. Each skill stays under the 250-line ceiling.

## Reserved judgment calls (already decided, do not re-litigate)

1. **Direction B, not A.** Dimension is a suffix classification that cuts
   across both scope layers, not a storage axis. No directory per dimension,
   no `colors-and-type/` rename, no theme schema bump. See the Audit.
2. **The bag is not split.** After Wave 2, `cssVariables` holds the overrides
   of names `tokens.css` declares plus the color pass's projections. The
   editor owns it; the color pass owns only what it emits.
3. **The dead keys leave by migration and sweep, and a gate stops the next
   batch.** The migration runs client-side on load, like every colors-and-type
   migration, and reaches a user theme on its next Save. It never reaches a
   frozen preset, so the presets are rewritten once by hand. The gate lives
   in `check:preset-themes`, at the repo boundary where the drift began. No
   runtime filter in the bake: a filter keyed on the consumer's `tokens.css`
   would silently drop a custom variable a consumer put there on purpose.
4. **`set` names the outcome; the engine functions name the mechanism.** The
   bundles rename to `setColors/`, `setType/`, `setGeometry/`. The functions
   stay `buildColors`, `applyFontPairing`, `adjustAliases`. There is no
   `buildGeometry`: geometry is relative moves, and that asymmetry is
   deliberate.
5. **`save-theme` composes live state, and only live state.** Buffer first,
   then the open theme, then the shipped default, per layer, the same order
   the dev server resolves. It takes no `--from` and no `--carry-from`. A set
   of themes is the three verbs then `save-theme --no-activate`, repeated,
   with the last save activating.
6. **`save-theme` with no buffers is Save As.** It writes a copy of the open
   theme under the new name and says so. The editor permits the same.
7. **`sketchSettings` rides through `save-theme` from the open theme.** The
   live sketch buffer is browser-local and a CLI cannot read it. No
   `set-sketch` verb in this plan.
8. **The base color file's `name` is ignored with a one-line notice**, the
   way `set-geometry` reports an ignored `name` (`bin/set-geometry.mjs:170`).
   Every scratch file written so far carries one.
9. **`set-colors` regenerates gradients and shadows as it does today.** Stock
   gradients rebuild from the new families; tuned ones carry. Shadow opacity
   follows the canvas. That is color, and it is the color pass's to replace.
10. **Semver: one BREAKING entry under Unreleased**, extending the entry the
    verb rename already earned. `generate-theme` shipped through 0.73.0; the
    rename and the narrowing land in the same release.
11. **create-theme now runs one verb.** `docs/terminology.md`'s rule that a
    skill name matches its verb where one exists still holds for the three set
    skills; create-theme runs `save-theme` and names its own job. Color still
    runs first and never skips for a new theme, because a theme request names
    a color identity. The order of type and geometry after it is free.

## The end state

| Verb | Reads | Writes | Activates |
|---|---|---|---|
| `set-colors <base-colors.json> [--dry-run]` | live colors and type | `colors-and-type/_working.json`, or clears it when the result matches the open theme | never |
| `set-type <pairing.json> [--dry-run] [--no-verify]` | unchanged | unchanged | never |
| `set-geometry <ops.json> [--dry-run]` | unchanged | unchanged | never |
| `save-theme <name> [--no-activate] [--dry-run]` | every live layer, plus the open theme's `sketchSettings` | `themes/<slug>.json` | yes unless `--no-activate`: clears every `_working.json`, repoints `_active.json` |

The engine after Wave 3:

| Bundle | Entry | Exports |
|---|---|---|
| `dist-plugin/setColors` | `vite-plugin/setColors/index.ts` | `buildColors`, `sanitizeFileName`, `readLiveTokensConfig`, `resolveDataDirs`, `CURRENT_COMPONENT_SCHEMA_VERSION` |
| `dist-plugin/setType` | `vite-plugin/setType/index.ts` | unchanged exports of today's `fontPairing` |
| `dist-plugin/setGeometry` | `vite-plugin/setGeometry/index.ts` | unchanged exports of today's `adjust` |

## Wave 1: one live-state reader

Three CLI modules carry one resolver each, and `save-theme` would be a fourth.
Consolidate before anything else moves.

- `bin/set-colors.mjs:47-120`: `readData`, `componentNames`, `stripMarkers`,
  `defaultComponentConfig`, `resolveCarrySource`.
- `bin/set-type.mjs:53-74`: `readActiveTheme`, `readLiveColorsAndType`, and
  the saved-layer read at `:177-181`.
- `bin/set-geometry.mjs:58-93`: `readActiveTheme`, `readLiveConfigs`.

New module `bin/lib/liveState.mjs`, pure file reads, no engine import. It
takes the resolved dirs as arguments; it never calls `resolveDataDirs`, so it
loads nothing from `dist-plugin` and Invariant 6 holds by construction.

Exports, each with the package-data fallback every door uses today (local
tree first, then `src/live-tokens/data/<subdir>` inside the installed
package):

| Export | Answers |
|---|---|
| `readActiveTheme(themesDir)` | `{ slug, theme }` or `null`; slug from `_active.json`, default `default` |
| `readLiveColorsAndType(colorsAndTypeDir, active)` | `{ colorsAndType, source }` with source `working`, `theme`, or `default`; markers stripped |
| `readSavedColorsAndType(colorsAndTypeDir, active)` | the layer under the buffer, for the discard-when-equal rule |
| `readLiveComponentConfigs(componentConfigsDir, active)` | `{ configs, sources }` per component, source `working` or `theme`; markers stripped; absent theme entries fall through to `default.json` with the reason `set-geometry.mjs:71-76` states |
| `componentNames(componentConfigsDir)` | sorted directory names |
| `stripMarkers(value)` | drops `_fileName` and `_source` |

Replace the three copies with imports. `set-geometry` keeps its `component`
stamping and its source labels; `set-type` keeps its `default` source label.
`set-colors`'s `resolveCarrySource` becomes a thin call for the no-flag case
and keeps its `--carry-from` branch until Wave 4 removes it. No behaviour
changes in this wave.

Add `bin/lib/liveState.test.ts` covering each resolver's three-layer order
against a temp tree, using the harness pattern in `bin/set-colors.test.ts`.

**Verify (test-verifier):** `npm test` green, `bin/` suite in particular;
`bin/engineLoadsLazily.test.ts` green with the new module reachable;
`npm run check` clean. `grep -n "function readActiveTheme\|function readLiveConfigs\|function readLiveColorsAndType\|function resolveCarrySource" bin/*.mjs`
returns only `resolveCarrySource` in `set-colors.mjs`.

## Wave 2: the dead keys

### Step 1: confirm the list (census, Haiku)

The Audit names 36 keys. Confirm each has no reader outside
`src/live-tokens/data/`, migrations, and tests:

```
--badge-trait-{surface,text,text-font-family,text-font-size,text-font-weight,text-line-height,border,border-width,shadow}
--sectiondivider-title-{,font-family,font-size,font-weight,line-height,border-width,stroke-color}
--sectiondivider-description-{,font-family,font-size,font-weight,line-height}
--dialog-primary-default-{surface,text,border,border-width}
--dialog-primary-hover-{surface,text,border,border-width}
--dialog-secondary-default-{text,border,border-width}
--dialog-secondary-hover-{surface,text,border,border-width}
```

`--sectiondivider-title` and `--sectiondivider-description` are the bare
keys.

**Census result (Wave 2 step 1, run 2026-09-03).** All 36 are dead: none is
declared anywhere in `tokens.css`, and nothing outside the data tree,
migrations, and tests reads one. Every one of the nine presets carries all 36,
in both `themes/<slug>.json` and `colors-and-type/<slug>.json`. Counts:
`cssVariables` goes 55 to 19 for eight presets and 59 to 23 for
`midnight-study`. Seven presets sit at colors-and-type version 3 and two
(`midnight-study`, `sketchy`) at 5, as this doc says.

**`--gradient-{1,2,3,4}-stops` do not join `DROPPED`.** They differ from the 36
in the way that decides it: `tokens.css:543-549` declares them. Nothing reads
them today, but a preset overriding a declared token is a legitimate override,
inside the contract step 4's gate enforces. Retiring them is a token removal
and would need its own `vite-plugin/tokensCssMigrations` entry, which this plan
does not take. The migration's comment does not name them.

After the drop, every surviving key in all nine presets is declared in
`tokens.css`, so step 4's gate passes with no exemption list.

### Step 2: the migration (wave-executor)

New `src/editor/core/themes/migrations/2026-09-03-drop-legacy-component-keys.ts`
in the shape of `2026-08-13-drop-legacy-shape-space-keys.ts`: `appliesTo:
'colors-and-type'`, `fromVersion: 7`, `toVersion: 8`, a `DROPPED` set, and a
comment saying these are the color, type, and border-width siblings of the
keys that migration removed, left behind when Badge's `trait` variant,
SectionDivider's title and description slots, and Dialog's variant-by-state
axes were renamed. Register it in `migrations/index.ts` after
`colorsAndTypeMigration_2026_09_01_tintRename`; `countFor('colors-and-type')`
moves the current counter from 7 to 8 on its own. Add the case to
`migrations.test.ts` beside the 2026-08-13 case.

### Step 3: the sweep (wave-executor)

Colors-and-type migrations run in the client on load
(`editorStore.ts:391-395`) and never touch a shipped file, and the presets are
frozen. Write a scratch script under `scratch/` (never committed) that, for
each of the nine `themes/<slug>.json` and the nine
`colors-and-type/<slug>.json`:

- removes every key in `DROPPED` from `cssVariables`,
- stamps `colorsAndType.schemaVersion` (or the file's own `schemaVersion`
  for the standalone copies) to 8,
- leaves `name`, `createdAt`, `updatedAt`, and every other byte alone,
- writes with two-space indent, and keeps each file's own final byte:
  sixteen of the eighteen end without a newline and two (`midnight-study`)
  end with one.

Seven presets sit at colors-and-type version 3 and two at 5; every migration
between is a no-op on them, which is why they still load. Stamping to 8 is
correct and stops the client re-running seven no-ops per load.

The v3-to-v4 case in `migrations.test.ts` witnesses three keys that are now in
`DROPPED`, and it runs the whole chain, so those three fixtures come out and
the modern-named survivors carry the case.

Then the baked CSS. `tokens.generated.css` is regenerated from the production
theme when the dev plugin boots. Start the dev server once, stop it, and
confirm `git diff src/live-tokens/data/tokens.generated.css` removes exactly
the dead lines and adds nothing. `themes/default.json` is also regenerated at
boot from `colors-and-type/default.json` (`ensureDefaultTheme`,
`themeFileApi.ts:946`); the sweep already wrote both, so boot changes nothing
there. Delete `scratch/` output before finishing.

### Step 4: the gate (wave-executor)

`scripts/check-preset-themes.mjs` gains one check: every key under
`colorsAndType.cssVariables` in every preset is declared in
`src/system/styles/tokens.css` as `--name:` at any indentation. Failure names
the preset and the key. `presetThemes.test.ts` gains the same assertion so it
runs without `dist-plugin`. The check covers `default` as well as the eight in
`PRESETS`: `default` is the layer every other theme falls through to and the
file the bake reads, so leaving it out would unguard the source of the baked
lines this wave removed.

**Verify (test-verifier):** `npm test`, `npm run check`,
`npm run build:plugin && npm run check:preset-themes`,
`node scripts/check-production-is-default.mjs`. `git status --short
src/live-tokens/data` shows exactly the eighteen JSON files and
`tokens.generated.css`, no `_working.json`, and `_active.json` and
`_production.json` unchanged. No manual half: the catch-all bag has no editor
surface, so the diff and the gate are the whole check.

**Review gate (Fable):** diff the nine theme files. Every hunk removes a
`DROPPED` key or changes one `schemaVersion` line. Anything else is a defect.

## Wave 3: engine names follow the verbs

A rename sweep with a greppable definition of done. `recipe-sweeper` executes;
`test-verifier` confirms.

| From | To |
|---|---|
| `vite-plugin/generateColorsAndType/` | `vite-plugin/setColors/` |
| `vite-plugin/fontPairing/` | `vite-plugin/setType/` |
| `vite-plugin/adjust/` | `vite-plugin/setGeometry/` |
| `src/editor/core/themes/generateColorsAndType.ts` | `src/editor/core/themes/buildColors.ts` |
| `src/editor/core/themes/generateColorsAndType.test.ts` | `src/editor/core/themes/buildColors.test.ts` |
| function `buildColorsAndType` | `buildColors` |
| type `GenerateColorsAndTypeReport` | `BuildColorsReport` |
| type `GenerateColorsAndTypeResult` | `BuildColorsResult` |
| type `ColorsAndTypeInput` | `ColorsInput` |

Use `git mv` for the directories and files. Names that stay: `CarryForward`
(its shape changes in Wave 4), `applyFontPairing`, `adjustAliases`,
`ContrastCheck`, and every export the three bundles re-export from elsewhere.

Call sites, all to be found by grep rather than trusted from this list:

- `tsup.config.ts:7-9`: the three entries.
- `bin/set-colors.mjs:22`, `bin/set-type.mjs:17`, `bin/set-geometry.mjs:15`:
  the `ENGINE` paths.
- `scripts/seed-preset-theme.mjs` and `scripts/check-preset-themes.mjs:24`:
  `dist-plugin/adjust`.
- `scripts/lib/presetFonts.mjs`: any bundle path.
- `vite-plugin/writeScope.test.ts:14, 322` and `bin/set-colors.test.ts:5`:
  the import and the `engine: { buildColorsAndType }` seam.
- The `README.md` sentence, if any, that names a bundle directory. The
  three-contributing-skills plan says `generateColorsAndType` "stays" as an
  internal name; this wave supersedes that.

Definition of done, over `bin scripts src vite-plugin tsup.config.ts
README.md package.json`, returning nothing:

`grep -rn "vite-plugin/adjust\|vite-plugin/fontPairing\|vite-plugin/generateColorsAndType\|dist-plugin/adjust\|dist-plugin/fontPairing\|dist-plugin/generateColorsAndType\|generateColorsAndType\|buildColorsAndType\|GenerateColorsAndType\|ColorsAndTypeInput"`

The first sweep used a narrower pattern carrying `dist-plugin/adjust` but not
`vite-plugin/adjust`, and so passed while
`scripts/seed-preset-theme.mjs`'s `ENGINE_SOURCES` still named a deleted path.
`ENGINE` and `ENGINE_SOURCES` sit two lines apart and point into different
directories; a pattern that covers one prefix and not the other reads as clean
and proves nothing. That script is in no test and not in `package.json#files`,
so neither the suite nor `npm pack` could see the break. The five
missing-bundle error strings name their bundle too.

**Verify (test-verifier):** `npm run build:plugin` produces
`dist-plugin/setColors`, `setType`, `setGeometry` and no old directory;
`npm test`, `npm run check`, `npm run check:preset-themes` green.

## Wave 4: `set-colors` narrows, `save-theme` lands

The public API change. Land it as one commit so no intermediate state has a
verb that writes a theme and no verb that composes one.

### `buildColors`

`CarryForward` narrows to `cssVariables` and `gradients`. `ColorsInput` loses
`name`. `validateInput` (`buildColors.ts:131`) drops the name and slug checks
and returns `baseColors` only; the `default` guard moves to `save-theme`. The
result loses `slug`, and `colorsAndType` in the result carries neither `name`
nor timestamps: it is a color state, and the caller merges it. Return type:

```ts
{ colors: { editorConfigs, harmonyAxes, gradients, cssVariables }, report }
```

where `cssVariables` is the carried bag with the projections and shadows
replaced, exactly what lines 465-472 compute today.

### `bin/set-colors.mjs`

Read the live colors and type through `readLiveColorsAndType`. Call
`buildColors(input, { cssVariables: live.cssVariables, gradients:
live.gradients }, now)`. Compose:

```js
const next = {
  ...live.colorsAndType,       // name, createdAt, fontSources, fontStacks
  ...colors,                   // editorConfigs, harmonyAxes, gradients, cssVariables
  updatedAt: now,
  schemaVersion: live.colorsAndType.schemaVersion,
};
```

Then the discard-when-equal rule `set-type.mjs:185-197` uses: if `next`
equals `readSavedColorsAndType(...)`, remove `_working.json` and report
`cleared`; otherwise write it and report `buffer`. Delete `applyTheme`,
`resolveCarrySource`, `THEME_SCHEMA_VERSION`, the `activate`, `carryFrom`, and
`themesDir`-for-writing paths. `runSetColors` keeps `dryRun` and the engine
seam. If the input carries `name`, the result reports `ignoredName` and the
formatter says the base color file no longer names a theme, the way
`set-geometry` reports its ignored `name`.

`formatSetColorsResult` says what changed: the source it read from (the
`SOURCE_LABELS` pattern), the contrast report as today, gradients and shadows
as today, then the same closing line `set-type` prints: reload to see it, save
the open theme to keep it, or run `save-theme`.

### `bin/save-theme.mjs`

```
runSaveTheme({ name, activate = true, dryRun = false, root, colorsAndTypeDir, componentConfigsDir, themesDir, engine })
```

1. Load the engine lazily for `sanitizeFileName`,
   `CURRENT_COMPONENT_SCHEMA_VERSION`, and `resolveDataDirs`.
2. `slug = sanitizeFileName(name)`; refuse `default` with the message
   `validateInput` uses today.
3. `active = readActiveTheme(themesDir)`; `colorsAndType =
   readLiveColorsAndType(...)`; `components = readLiveComponentConfigs(...)`.
4. Compose the document:

```js
{
  name,
  createdAt: existing?.createdAt ?? now,
  updatedAt: now,
  schemaVersion: THEME_SCHEMA_VERSION,           // hand copy, pinned by schemaVersionCopies.test
  colorsAndType: { ...colorsAndType, name },
  componentConfigs,
  componentSchemaVersion: CURRENT_COMPONENT_SCHEMA_VERSION,
  ...(active?.theme?.sketchSettings ? { sketchSettings: active.theme.sketchSettings } : {}),
}
```

5. Unless `dryRun`, write `themes/<slug>.json`; unless `--no-activate`, run
   `applyTheme` (moved here verbatim from `set-colors.mjs:203-213`).
6. Report: created or updated, which layers came from a buffer and which from
   the open theme (so a no-buffer run says "no unsaved edits; saved a copy of
   \"<open>\""), whether it opened, the previous active slug.

`formatSaveThemeResult` closes with the Adopt sentence `set-colors` prints
today (`set-colors.mjs:240-244`).

### `bin/cli.mjs`

- Header comment and `USAGE`: `set-colors <base-colors.json> [--dry-run]`,
  described as `set-type` is; new `save-theme <name> [--no-activate]
  [--dry-run]` block after `set-geometry`.
- The `set-colors` branch drops `--carry-from` and `--no-activate` parsing and
  the usage string. New `save-theme` branch; `--no-activate` and `--dry-run`
  only. Exit 0 always for `save-theme`; `set-colors` keeps exit 1 on unmet
  floors.
- `SAMPLE_PROMPTS` unchanged.

### From the Wave 1 review gate

- `bin/lib/liveState.mjs` throws a named error on malformed JSON, the one new
  behaviour Wave 1 introduced, and no test covers it. Fold a case into the
  `set-colors.test.ts` rewrite: a corrupt `_working.json` throws
  `/is not valid JSON/`.
- `readLiveComponentConfigs`'s `sources[comp]` labels a config that came from
  `default.json` as `theme`, even with no theme open. Wave 1 carried that
  forward from `set-geometry` faithfully. `save-theme`'s report must not read
  `sources` naively when it says which layers came from a buffer and which from
  the open theme.
- `bin/cli.mjs:272` and `:285` still say `adjust` in user-facing copy, left
  over from the verb rename in `9f6a37e`. Fix both while editing `cli.mjs`.

### Tests

- `bin/set-colors.test.ts`: rewrite. Writes the buffer; clears it when the
  result matches the open theme; never writes a theme or moves `_active`;
  keeps fonts from the buffer over the theme over the default; replaces stock
  gradients and keeps tuned ones; replaces shadow opacity; reports an ignored
  `name`; dry run writes nothing; rejects a missing or malformed file.
- `bin/save-theme.test.ts`: new. Composes every layer in buffer-first order;
  fills an absent component from `default.json`; carries `sketchSettings`;
  refuses `default`; keeps `createdAt` on an existing slug; activates and
  clears every buffer; `--no-activate` leaves buffers and `_active` alone; a
  no-buffer run copies the open theme; dry run writes nothing; strips read
  markers.
- `vite-plugin/writeScope.test.ts`: the `set-colors` case adapts; add a
  `save-theme` case.
- `bin/schemaVersionCopies.test.ts`: `bin/set-colors.mjs` leaves `COPIES`,
  `bin/save-theme.mjs` joins.
- `bin/engineLoadsLazily.test.ts` covers the new module by walking.

`check:skills` stays GREEN at the end of this wave, and that is the finding.
The gate is one-directional (`scripts/check-skills.mjs:107-118`): for each
verb a skill names it errors when the CLI does not dispatch that verb, and
when USAGE offers a flag the skill omits. It never asks whether a flag the
skill names still exists, and never asks whether a dispatched verb reaches any
skill. So the set-colors skill documenting `--no-activate` and `--carry-from`,
and `save-theme` reaching nothing, are both invisible to it. Wave 5 hardens
it.

**Verify (test-verifier):** `npm test`, `npm run check` green; `node
bin/cli.mjs --help` shows the four verbs and no `--carry-from`. Manual, with
the dev server stopped: `set-colors` on a scratch base color file, `set-type`,
`set-geometry`, `save-theme "Audit Check"`, then start the dev server and
confirm the Theme panel names Audit Check with the type and geometry in it.
Restore the tree per `CLAUDE.md` and delete `themes/audit-check.json`.

**Review gate (Fable):** Invariants 2, 3, 5, and 6 line by line against the
diff. Confirm `set-colors` cannot reach `themes/` for writing on any path.

## Wave 5: skills and atlas

### create-theme (`.claude/skills/live-tokens-create-theme/SKILL.md`)

- Lines 15-19: the skill now runs one verb, `save-theme`, after its three
  contributing skills. Replace "one writes the theme, the other two write
  unsaved buffers" with: each contributing skill writes its dimension into
  the unsaved buffers the app already renders, and `save-theme` turns the
  three into the theme.
- Step 4 (line 26): drop the theme-writing clause; keep "never skips".
- New step 7: choose the theme name from the design direction and run
  `npx live-tokens save-theme "<name>"`. It writes `themes/<slug>.json` and
  opens it. Old step 7 becomes step 8; the "type and geometry sit in unsaved
  buffers" sentence goes, since nothing is unsaved after step 7.
- Lines 31-37: delete both paragraphs. Replace with one: a set of themes runs
  steps 4 to 7 per theme with `--no-activate` on every save but the last, so
  each theme starts from the same live look.
- "Files each step writes" (line 70): color, type, and geometry write unsaved
  buffers; `save-theme` writes and opens the theme; Adopt ships it.
- Verify (lines 79-82): `save-theme` exits 0 and names the theme; the Theme
  panel shows it with no unsaved marker; to return, load the previous theme.

### set-colors (`.claude/skills/live-tokens-set-colors/SKILL.md`)

- Line 9: "writes `themes/<slug>.json`, opens it" becomes "writes the unsaved
  colors buffer the app already renders".
- Step 3 (line 21): the same sentence.
- Lines 25-28: the flags paragraph keeps `--dry-run` only.
- "The base color file": remove `name` from the schema and the prose. The
  slug in `scratch/<slug>-base-colors.json` is the theme name create-theme
  intends, or any label when invoked alone.
- "Refining" (line 128): "re-run under the same name" becomes "re-run"; the
  sentence about replacing the theme's whole color state now says it replaces
  the buffer's color state, and a Save or `save-theme` keeps it.
- "Scope" and "Verify": the closing sentences match `set-type`'s.

`set-type` and `set-geometry` mention neither the theme write nor the flags;
confirm with grep and leave them.

`scripts/check-skills.mjs`: nothing to change. `OMITTED_FLAGS` is empty and
the verb set derives from `bin/cli.mjs`. `save-theme` is reached by
create-theme's step 7, which satisfies the flag rule for `--no-activate` and
`--dry-run` as long as the step names both.

### Atlas (`src/editor/skill-atlas/skillTrees.ts`)

- create-theme tree: the node at lines 77-83 ("Hand the color intent to
  set-colors") loses "writes the theme file" from its `desc`; new node after
  the geometry hand-off, "Save the theme", with `command: npx live-tokens
  save-theme "<name>"`, anchored on step 7's text; the `anchorEnd` at line
  168 re-points to the new Verify text.
- set-colors tree: the CLI node at lines 440-441 keeps its command; any node
  citing the flags paragraph or the theme write re-points. Re-read every
  `anchor` and `anchorEnd` in both trees; Wave 5 rewrote the text they quote.
- Then `npm run sync:skill-atlas` and `npm run sync:skill-sources`.

**Verify (test-verifier):** `npm run check:skills`, `check:skill-atlas`,
`check:skill-sources`, `npm test`, `npm run check` green; both skills under
250 lines. Manual: open `/live-tokens/skill-atlas`, walk create-theme and
set-colors, and confirm every card's title agrees with its chips and its cited
lines.

## Wave 6: docs, evals, changelog

An enumerated sweep. The executor changes the listed lines and nothing else.

- `README.md:331`: the `set-colors` row loses two flags and its description
  matches `USAGE`; new `save-theme` row after `set-geometry`. The
  `live-tokens-create-theme` section (370) gains the save step; the
  `live-tokens-set-colors` section (376-384) drops the theme write.
- `RELEASING.md:124`: add `save-theme` to the verb list.
- `CLAUDE.md:7`: add `live-tokens save-theme` to the writers, and say it also
  sets `themes/_active.json`.
- `docs/terminology.md:58`: the `look` row's `--carry-from` example goes;
  `:78-80`: the naming rule gains "create-theme runs `save-theme` and names
  its own job"; the pipeline table's layer 3 row adds the theme name.
- `docs/skills-walkthrough.md:344-350`: mark P1 superseded in one line; the
  flag no longer exists.
- `docs/skills-audit.md:74, 282`: historical; add "(retired in Unreleased)"
  after the first mention only.
- `.claude/evals/outcome-theme-from-request/graders/criteria.md:10`: the
  set-colors line drops the theme write; add a criterion that create-theme
  runs `save-theme` once with the name it stated.
- `docs/theme-dimension-architecture.md`: one status line under the Audit
  heading naming this plan and the commits.
- `CHANGELOG.md`, under Unreleased, extending the existing BREAKING entry for
  the verb rename. Draft:

> **`set-colors` writes the color buffer, and `save-theme` writes the theme.**
> A theme is three decisions and one document. Each set verb now writes only
> its own dimension into the unsaved buffers the app already renders:
> `set-colors` joins `set-type` and `set-geometry` there, and no longer writes
> or opens a theme. The new `save-theme <name>` composes the live state into
> `themes/<slug>.json` and opens it; `--no-activate` saves without opening,
> which is how a set of themes is generated from one starting look.
> `--carry-from` is gone: it existed because `set-colors` activated, and
> nothing activates now until you save. The base color file no longer carries
> `name`; a name in it is ignored with a notice. `live-tokens-create-theme`
> runs `save-theme` as its last step.
>
> **36 dead keys left the override bag.** Themes carried the color, type, and
> border-width siblings of keys an earlier migration dropped (Badge's `trait`
> variant, SectionDivider's title and description slots, Dialog's variant and
> state axes). Nothing read them, and every Adopt baked them into
> `tokens.generated.css`. A colors-and-type migration drops them from your
> themes on the next Save, the shipped presets are rewritten, and
> `check:preset-themes` now refuses a preset whose override bag names a
> variable `tokens.css` does not declare.
>
> Internal: the engine bundles are `dist-plugin/setColors`, `setType`, and
> `setGeometry`, named for the verbs that load them. They have no `exports`
> entry and no consumer imports them.

**Verify (test-verifier):** `npm run check:docs-content`, `check:skills`,
`check:skill-atlas`, `check:skill-sources`, `npm test`, `npm run check` green.
Manual: `npm run check:smoke-create` and `check:smoke-install`, then the
end-to-end run below.

## The end-to-end manual check

After Wave 6, with the dev server running, ask for a theme in plain language
("make it feel like a cozy autumn reading room"). Confirm create-theme states
one design direction, names an anchor, states three intents, invokes the three
contributing skills, runs `save-theme` once, and assembles one summary. Reload:
the Theme panel names the theme with no unsaved marker. Then ask for a second
theme "in the same type and geometry, but a winter palette" and confirm it
arrives with the first theme's fonts and geometry. Restore the data tree per
`CLAUDE.md` before finishing, and delete both theme files.

## Reserved for the executor

- Wave 1: the exact export names under `bin/lib/liveState.mjs`, within the
  table above.
- Wave 2: whether `--gradient-N-stops` join `DROPPED`, on the census result.
- Wave 4: the shape of `runSaveTheme`'s result object and the wording of both
  formatters, within the sentences this doc fixes.
- Wave 5: node-level shape of the new atlas node and which set-colors nodes
  re-point.

## Follow-ups this plan does not take

- Deleting the eight preset copies under `colors-and-type/` and pointing
  `scripts/seed-preset-theme.mjs:150` at the theme's own `colorsAndType`.
  Separable; a maintainer-script change plus `package.json#files`.
- A `set-sketch` verb, blocked on the sketch buffer being browser-local.
- Running the colors-and-type migrations in the server's boot pass so a
  consumer theme sheds dead keys without a Save. The theme-completeness plan
  chose not to, and this plan does not reopen it.
