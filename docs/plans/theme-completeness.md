# Execution plan: themes are documents

Companion to `docs/theme-completeness-audit.md`. That doc asks whether a theme
file is a complete description of a look. This doc reviews the answer, corrects
five things, and lays out six waves.

Status: not started. Every decision below is settled with the user; the
Reserved judgment calls section records which were confirmed explicitly.

## Starting state

Branched from `main` at `a8987c4`. Before Wave 1: commit this plan doc, then
**branch**. No wave commits to `main` directly.

The tree at handoff carries two deletions under
`src/live-tokens/data/component-configs/` (`badge/_working.json`,
`button/_working.json`). Those are correct and should be included: a buffer is
an unsaved edit and is never shipped. `docs/theme-completeness-audit.md` is
also modified and is the companion doc, not a deliverable of this plan.

---

## Part 0 — Review of the audit

### Verdict

The central proposal is right. Themes should be component-complete, and the
delta encoding should go. Three measurements support it more strongly than the
audit itself argues:

| Claim | Measured |
|---|---|
| Delta saves almost nothing | 5 of 7 presets omit one component; worst case omits six. 1237 aliases total across 25 components |
| Completeness is cheap | midnight-study grows 54.3 KB → 68.4 KB of `componentConfigs` (minified). Two presets already complete |
| The baked CSS does not grow at all | `regenerateTokensCss` already diffs **per alias** against `default.json` (`themeFileApi.ts:386`). Files grow, `tokens.generated.css` does not |

That last row is the strongest argument for the change and the audit does not
make it. The per-alias diff already lives at the output boundary, which is the
only place a size optimization is safe, because it is regenerated on every
Adopt and can never go stale. The delta in the *file* buys nothing the bake is
not already buying, and costs the document property.

Two more facts favour it:

- **`themes/default.json` is already complete.** `ensureDefaultTheme`
  (`themeFileApi.ts:855`) materializes all 25 components by value on every
  boot, and its aliases are byte-identical to the 25 `default.json` files
  (verified). The `Theme.componentConfigs` doc comment claiming "defaults are
  never inlined" is already false for the most important theme in the tree.
- **Two pieces of code exist only to serve the delta.**
  `countComponentsOffLook` carries a `lookIsDefault` special case
  (`lookSummary.ts:64`) precisely because the Default theme breaks the delta
  rule, and `ComponentFileManager` derives `editorDoc` / `productionDoc` from
  whether the theme happens to carry an entry (`:99`, `:102`). Both collapse to
  one line under completeness.

### Correction 1 — there are five writers, not two

The audit names `captureLook` and `generate-preset-themes.mjs`. Three more
write theme `componentConfigs` with a delta skip:

| Writer | The skip |
|---|---|
| `src/editor/core/themes/themeService.ts:144` | `.filter((c) => c.source !== 'default')` |
| `scripts/generate-preset-themes.mjs:179` | `if (diff === 0) continue` |
| `bin/generate-theme.mjs:86` | `const cfg = theme.componentConfigs?.[comp]; if (cfg) ...` |
| `vite-plugin/migrateData/migrateData.ts:391` | `if (sameContent(pointed, defaultConfig(comp))) continue` |
| `vite-plugin/themes/normalizeTheme.ts:125` | `if (configName === 'default') continue; // delta encoding` |

Patching five writers is the wrong shape anyway, which is correction 2.

**`bin/generate-theme.mjs` has two holes, and one is a genuine bug rather than
a delta artifact.** The skill's CLI is the path a user actually makes a theme
by, so it matters most:

- `--carry-from` (`:86`) copies only the entries the source theme happens to
  hold, so an incomplete source produces an incomplete result. Delta in, delta
  out.
- The live path (`:105`) resolves `_working.json ?? activeTheme.componentConfigs[comp]`
  and stops. **There is no fall-through to `default.json` at all.** Compare
  `bin/adjust.mjs:84`, which has all three layers, and the dev server's
  `resolveLiveComponentConfig`, which has all three. So `generate-theme` is out
  of step with both, and a theme generated while an incomplete theme is open
  silently inherits its gaps.

**The shipped presets' gaps are not the skill's doing.** They come from
`generate-preset-themes.mjs:179`'s `diff === 0` skip, and the mechanism is
exact: `radiobutton` declares only three shape-relevant aliases, all
`-dot-border-width` (27 aliases total, no radius, padding, or gap). Halloween
and royal-velvet are the only two presets whose ops include `border-width`, and
they are the only two carrying `radiobutton`. The other five move nothing in it,
so it is skipped. Midnight Study's six omissions arrived the same way once the
`--space-4` floor stopped its padding shift from moving those components.

So both writers need the fix, for different reasons: the preset generator
because it deliberately skips no-ops, and `generate-theme` because it is
missing a resolution layer its siblings have.

### Correction 2 — completeness belongs at the normalize boundary

`normalizeTheme` already runs on **every** path that reads or writes a theme:
disk read (`readTheme`, `:760`), boot migration (`:832`), theme PUT (`:1505`),
and bundle import (`:1734`). Filling there makes completeness
correct-by-construction for all five writers and for any future one, and the
function's existing `migrated` flag already drives boot write-back. That *is*
the migration the audit asks for. No new dated migration file is needed, just a
`THEME_SCHEMA_VERSION` bump.

### Correction 3 — fill per alias, not per component

The audit fills only omitted components, and explicitly accepts the remaining
hole: a component that gains a token leaves every existing theme silent on it,
resolving through `:global(:root)`. If a theme is a document, that hole is the
same bug at finer grain.

Fill missing alias keys too. It costs nothing extra (the default config is
already in hand), it subsumes the added-token case permanently, and because the
fill is written back on the next save the theme tracks the new default **once**
and then freezes. That is strictly better than today and strictly better than
the audit's proposal.

### Correction 4 — "migrations own drift" is half-true, and completeness makes the other half matter

This is the load-bearing correction. Verified:

1. **No stored component config carries a `schemaVersion`.** Checked all 25
   `default.json` files and all 8 themes: none has the field.
   `componentConfigFromState` stamps it (`componentConfigService.ts:83`) but
   `captureLook` reads the *server's* resolved config, which for a
   default-sourced component is the unstamped `default.json`. So
   `toComponentSlice(..., schemaVersion = 0)` replays every component migration
   on every client load. Idempotence carries it, but the TTL documented in
   `migrations/index.ts:8` never fires and no migration can ever be retired.

2. **The server never migrates embedded configs.** `normalizeTheme` copies
   `componentConfigs` verbatim. `regenerateTokensCss` reads
   `productionTheme.componentConfigs[comp].aliases` raw, and
   `aliasValuesEqual(undefined, staleValue)` is `false`
   (`themeFileApi.ts:1086`), so a pre-rename key in an old theme is emitted
   verbatim into `tokens.generated.css`. `pruneMarkers/loadProductionConfig.ts`
   resolves build-time intrinsics off the same raw aliases.

Today that exposure is bounded by the delta: a theme freezes 19 to 25 of 25
components, and anything it omits is rescued by the current default. After
completeness it is 25 of 25 for every theme, and there is no rescue, because
the theme is the sole authority. So the audit's premise ("migrations own that
problem") has to be *made* true before the freeze widens, not assumed.

The fix is small: `migrateComponentAliases` (`editorStore.ts:238`) is already
pure and disk-shape in, disk-shape out. Extract it to a shared module and call
it from `normalizeTheme`. This is Wave 1 and it is worth doing on its own
merits.

### Correction 5 — the reported bug is already fixed; the class is not, and authoring 700 numbers is the wrong cure

Commits `9f61b6d` and `80e21a5` floored `-padding` shifts at `--space-4` and
resewept the presets. Padding at `--space-2` went from 54 aliases to 5, and
open question 4 confirms those 5 are the Motion Proto baseline showing through,
which is correct. Midnight Study's badge is fixed.

What remains is the class: presets re-derive from a moving baseline on every
`npm run generate:preset-themes`. The audit's cure is to author absolute
padding per preset, roughly 100 values × 7 presets by hand. That is a large
table to hand-maintain and it will rot, and it does not fix radius, gap, or
border width, which the audit leaves relative.

Once themes are complete, the presets **are** documents, so the cure is to stop
re-deriving rather than to change what is derived. Turn the generator into a
one-shot **seeder** for a single new preset, and replace the sweep with a
`check` that asserts *invariants* on the committed files (complete, current
schema, distinct, no stale keys, fonts stamped) rather than re-running the
arithmetic. A check that re-derives from the baseline is coupled to the
baseline by construction and cannot be a guardrail against it.

This answers open question 3 directly: keep the machinery, because the `adjust`
skill uses the same engine against a live theme, but stop pointing it at
shipped files.

### Open question 1, executed narrowly

The answer was YES: make `default.json` a theme so the baseline is one more
document. It is already 90% true. `themes/default.json` is complete and
identical to the per-component defaults.

The remaining 10% should **not** be executed as literally stated. Deleting
`component-configs/<id>/default.json` would strand three consumers:
`ensureDefaultTheme` loses its input, `regenerateTokensCss` loses the base for
its per-alias diff (forcing all 1237 aliases into every consumer's shipped CSS,
about +45 KB), and `sync-component-defaults` / `collapse-theme-to-default` lose
their round-trip target.

Execute it as: **remove layer 3 from live resolution only** (Wave 4). Live
reads become working → theme, with the Default theme as the terminal document,
which is the two-layer model the answer asks for. `default.json` stays as what
it actually is, the derivation product of each component's `:global(:root)`,
feeding the boot materializer and the bake diff. Safe only once every theme is
complete, hence its position after Wave 2.

### Open question 2, read precisely

"Load any existing components. Presumably tokens would always be there. If not,
alert the user and prompt them to use the theme builder skill."

Two different behaviours, not one:

- **Missing components or aliases** fill from the local defaults, silently at
  the resolution layer, with a count reported back so the UI *can* mention it.
  No block, no alarm. This is what already happens; the change is that the fill
  is now durable.
- **Missing or unreadable `colorsAndType`** already 422s on apply
  (`themeFileApi.ts:1604`) and throws on bake. What is missing is the friendly
  surface. Wave 6 adds it.

---

## Reserved judgment calls (already decided, do not re-litigate)

1. **Completeness is enforced at `normalizeTheme`, not in the writers.** Every
   writer inherits it. A writer may still choose to emit a complete map itself
   (Wave 3 makes them do so, for honest diffs), but no code path may rely on
   being the only place completeness happens.

2. **Fill is per alias, not per component.** A theme carries every known
   component, and every component carries every alias key its `default.json`
   declares. "Complete" means both.

3. **Fill never deletes, and the bake never emits an orphan.** (User-confirmed.)
   A config for a component this install does not have is kept verbatim and
   reported through the existing `skippedComponents` channel. An *orphaned
   alias key* — one the component's current `default.json` does not declare,
   left by a token removal no migration covered — is kept in the file too, so
   reinstalling or restoring the component brings its values back.

   But it never reaches CSS. `regenerateTokensCss` skips any var the
   component's default does not declare, so `tokens.generated.css` carries only
   values the running components actually read. Zero dead CSS on a consumer's
   site, and the file stays a complete record.

   Orphan counts are reported, never acted on silently. If they ever become a
   real annoyance the answer is an explicit prune action, not a silent delete.

   `ensureDefaultTheme` is the one exception to "never deletes" and stays as it
   is: it is derived from source, so it regenerates wholesale.

   Today this is latent, not live: all eight shipped themes carry zero orphans
   and zero gaps (verified).

4. **`component-configs/<id>/default.json` stays on disk.** It is the
   derivation product of `:global(:root)`, not a competing baseline. It stops
   being a *resolution* layer (Wave 4) and remains the seed for
   `ensureDefaultTheme`, the base for the `regenerateTokensCss` per-alias diff,
   and the target for `sync-component-defaults`.

5. **`tokens.generated.css` keeps its per-alias diff.** Emitting all 1237
   aliases would ship about 45 KB of redundant CSS to every consumer. The
   generated file is rebuilt on every Adopt, so it cannot go stale, which is
   what makes optimization safe there and unsafe in the theme file.

6. **Component-config migrations run server-side before the fill.** Order
   inside `normalizeTheme` is: migrate embedded configs, then fill gaps, then
   stamp. Filling first would write a file carrying both a stale key and its
   fresh replacement.

7. **Seeding only. No generator that re-derives a shipped file.**
   (User-confirmed.) The ops table survives as *seeding* input, and padding is
   not converted to a hand-authored absolute table. Seeding a preset produces
   complete component descriptions, which is where a preset says that a
   component property points at a different theme token than the baseline does.
   Once seeded, the file owns those values and nothing re-derives them. The
   sweep-all path is deleted outright, not gated behind a flag (Wave 5).
   Correction 5.

8. **The five surviving `--space-2` paddings live in the baseline, not the
   presets.** Verified: `component-configs/*/default.json` holds all five at
   `--space-2`, and each preset shifts them normally (autumn `--space-6`, ocean
   `--space-4`, halloween back to `--space-2` because its `-1` shift floors).
   Open question 4 says the Motion Proto values are correct, so the pin belongs
   on the baseline. A preset-level pin would be wrong and would fight the ops
   table.

9. **The component-schema stamp is one field per theme, not one per config.**
   (User-confirmed.) `Theme` gains `componentSchemaVersion: number`, meaning
   "every embedded config in this file is at this version". Standalone
   documents — `component-configs/<id>/default.json` and `_working.json` — keep
   their own optional per-file stamp, because they *are* separate documents.

   The apparent cost, that one component's migration now bumps every theme, is
   not real. `CURRENT_COMPONENT_SCHEMA_VERSION` is already a single global
   counter over every component migration (`migrations/index.ts:109`), and
   `runMigrations` filters only by version, handing each migration the
   component id so it can decide for itself. So a per-config stamp buys no
   isolation: adding any component migration puts every config in the tree
   behind, whichever component it targets. The theme is also written wholesale
   already, so per-config stamps would not shrink a single rewrite. One field
   is strictly less churn, and it makes a half-migrated theme unrepresentable,
   which matches what `normalizeTheme` actually does (all 25 together).

10. **The fill is persisted, not just resolved.** (User-confirmed.) A theme
    read at a lower schema is filled and **written back to disk**, so the file
    itself carries the whole look. The alternative, filling in memory on every
    read and leaving the file sparse, would mean an exported theme silently
    picks up the recipient's defaults for anything it omits, which is the exact
    failure this plan exists to end.

    The churn is one rewrite per local theme at the v3 → v4 bump, not an
    ongoing cost: saving a theme already rewrites the file wholesale, and the
    old "collection of files churning" problem was the per-component configs
    and per-layer pointers, which encapsulation already retired. In this repo
    the bump touches almost nothing, since Wave 3 regenerates the seven presets
    anyway and `themes/default.json` is already complete.

11. **The fill reads `component-configs/<id>/default.json`, never the Default
    theme.** They hold identical values (verified), but `ensureDefaultTheme`
    materializes the Default theme *from* those files, and `normalizeTheme`
    runs during boot before that is guaranteed to have happened. Filling a
    theme by reading another theme is circular and would make boot order
    load-bearing. `ThemeResolvers.readComponentConfig(comp, 'default')` is
    already the right door.

12. **No new theme tokens, no new UI accent colors.** Wave 6's notice is
    greyscale editor chrome, `UIPillButton` for any action, no em-dashes in the
    copy.

---

## Global invariants (reviewer checklist)

1. **Round-trip identity.** Reading a theme, filling it, and writing it back
   produces a file that resolves to byte-identical CSS vars for every component
   and every alias. Waves 1, 2 and 4 each pin this.
2. **No look changes.** At no point in waves 1 through 4 does any shipped
   preset or the Default theme render differently. `tokens.generated.css` stays
   byte-identical through Wave 4 (verified by `check:production-is-default`,
   whose rule 5 asserts no component-alias override block).
3. **Nothing is dropped.** RJC 3. A theme carrying a config for an unknown
   component, or an alias key no current default declares, survives every read
   and write unchanged.
4. **`normalizeTheme` stays pure.** Every disk lookup arrives through
   `ThemeResolvers`. The new `listComponentNames` resolver is no exception.
5. **Migration order.** Component migrations run before the fill, always
   (RJC 6).
6. **Data-tree hygiene.** Waves that exercise the editor or the generator
   restore `_active.json`, `_production.json`, `tokens.generated.css`,
   `fonts.css` and delete stray `_working.json` before committing, per project
   `CLAUDE.md`. Wave 3 and Wave 5 are the exceptions: there the data change is
   the deliverable, and `node scripts/check-production-is-default.mjs` must
   still pass.

---

## Commit-unit protocol

One wave = one commit. Run the wave's verification green before committing;
never commit red. Commit message `Themes W<n>: <summary>` plus the standard
co-author trailer. Do not push, tag, or release. Stop after each wave for
review. If reality contradicts this plan, stop and report rather than
improvise.

---

## Wave 1 — component migrations reach the server

**Goal:** an embedded component config is migrated and stamped wherever it is
read. Nothing about completeness changes yet.

**Stands alone.** Worth landing even if the rest of the plan is dropped: it
closes a live bug. `regenerateTokensCss` reads embedded aliases raw, and
`aliasValuesEqual(undefined, staleValue)` is false, so any consumer theme
written before a token rename bakes its pre-rename keys into
`tokens.generated.css` today.

**Executor:** Sonnet (`wave-executor`). **Reviewer:** Opus (`wave-reviewer`).

Files: `src/editor/core/store/editorStore.ts`,
`src/editor/core/themes/migrateComponentConfig.ts` (new),
`vite-plugin/themes/normalizeTheme.ts`, `vite-plugin/themeFileApi.ts`,
`src/editor/core/themes/themeTypes.ts`, plus tests.

1. **Extract, do not rewrite.** Move `migrateComponentAliases` (`:238`),
   `synthesizeSectionDividerGradients` (`:358`) and
   `renameSectionDividerObjectSlots` (`:296`) verbatim from `editorStore.ts`
   into `src/editor/core/themes/migrateComponentConfig.ts`, exported as
   `migrateComponentConfig(component, aliases, config, fileVersion)`.
   `editorStore.ts` imports it. No behaviour change, no signature change.
   Confirm the new module imports nothing browser-only: the vite plugin already
   imports from `src/editor/core/themes/*` (`themeFileApi.ts:4-11`), so this is
   an established boundary.

2. **`normalizeTheme` migrates every embedded config as one batch.** Read the
   theme's `componentSchemaVersion ?? 0` once, run `migrateComponentConfig`
   over each entry at that version, then stamp the theme with
   `componentSchemaVersion: CURRENT_COMPONENT_SCHEMA_VERSION`. Keys no
   migration touches pass through (RJC 3).

   A per-entry `schemaVersion` on an embedded config is *ignored* if present,
   and stripped on write. The theme-level field is the only authority inside a
   theme (RJC 9).

3. **Stamp the standalone documents on the way in.** `generateDefaultConfig`
   writes `schemaVersion: CURRENT_COMPONENT_SCHEMA_VERSION` into
   `component-configs/<id>/default.json`, which is correct by definition: it
   derives from `:global(:root)`, which is always at the current schema.
   `componentConfigFromState` already stamps `_working.json`
   (`componentConfigService.ts:83`). Together with step 2 this is the change
   that finally lets the migration TTL fire — today nothing on disk carries a
   stamp at all, so every load replays every migration from 0.

4. **Types.** `Theme` gains required `componentSchemaVersion: number`.
   `ComponentConfig.schemaVersion` stays optional, since a hand-edited
   standalone file must still load at 0.

**Tests**

- `normalizeTheme.test.ts`: a v3 theme whose `button` config carries a
  pre-rename key comes back with the post-rename key, the stale key gone, and
  `schemaVersion` current. A theme already at the current version passes
  through byte-identical.
- `migrateComponentConfig.test.ts`: the moved functions keep their existing
  coverage. Assert the sectiondivider gradient synthesis still fires.
- `themeFileApi` bake test: a production theme carrying a pre-rename key bakes
  the post-rename key into `tokens.generated.css`. This test fails on `main`,
  which is the point.
- **Orphan filter (RJC 3).** `regenerateTokensCss` skips any alias the
  component's `default.json` does not declare. Test: a production theme
  carrying `--card-removed-thing` bakes nothing for it, while its real
  overrides still emit. This is the "no dead CSS on the consumer's site" rule,
  and it belongs here rather than later because Wave 1 is what makes an orphan
  distinguishable from an un-migrated key.
- `presetThemes.test.ts` stays green: shipped presets carry no stale keys
  (verified) so nothing moves.

**Verification:** `npm test`, `npm run check`,
`node scripts/check-production-is-default.mjs`, and `git diff --stat
src/live-tokens/data` empty except one added `schemaVersion` line in each of
the 25 `default.json` files and one added `componentSchemaVersion` line in
`themes/default.json`. `tokens.generated.css` unchanged.

---

## Wave 2 — completeness at the normalize boundary

**Goal:** every theme that passes through `normalizeTheme` comes out carrying
every known component and every alias key. Boot rewrites local themes once.

**Executor:** Sonnet (`wave-executor`). **Reviewer:** Opus (`wave-reviewer`).
This wave contains the one genuinely dangerous edit in the plan; see step 2.

Files: `vite-plugin/themes/normalizeTheme.ts`, `vite-plugin/themeFileApi.ts`,
`src/editor/core/themes/themeTypes.ts`,
`src/editor/core/themes/themeService.ts`, tests.

1. **`ThemeResolvers` gains `listComponentNames(): string[]`.** Wire
   `diskThemeResolvers` (`themeFileApi.ts:741`) and `bundleResolvers` (`:1734`
   region) to the existing `listComponentNames` (`:540`).

2. **Guard `migrateEmbeddedKey` before bumping the version. This is a
   landmine.** Today:

   ```ts
   const migrated = input.schemaVersion !== THEME_SCHEMA_VERSION;
   const src = migrated ? migrateEmbeddedKey(input) : input;
   ```

   and

   ```ts
   function migrateEmbeddedKey(src: Json): Json {
     const { theme, ...rest } = src;
     return { ...rest, colorsAndType: theme };   // ← overwrites with undefined
   }
   ```

   Bumping `THEME_SCHEMA_VERSION` to 4 makes every v3 file "migrated", so
   `migrateEmbeddedKey` runs on a file that already has `colorsAndType` and
   **overwrites it with `undefined`**. `normalizeTheme` then reads
   `asString(undefined, 'default')` and resolves the *default palette* in its
   place. Every consumer theme would silently lose its colors on the next boot,
   and most existing tests would still pass.

   Fix before the bump:

   ```ts
   const src = (input.schemaVersion as number ?? 0) < 3 ? migrateEmbeddedKey(input) : input;
   ```

   and add a regression test named for what it prevents.

3. **Fill, after the Wave 1 migration step (RJC 6).**

   ```
   for comp of resolvers.listComponentNames():
     base = resolvers.readComponentConfig(comp, 'default')
     if !base: continue                      // component with no derived default
     entry = componentConfigs[comp]
     if !entry: componentConfigs[comp] = clone(base); filled.components.push(comp)
     else: for each alias key in base missing from entry.aliases:
             entry.aliases[key] = clone(base.aliases[key]); filled.aliases++
   ```

   Deep-clone: structured aliases (`{kind:'gradient'}`) must not alias the
   default object. Entries for unknown components are untouched (RJC 3).

4. **`NormalizedTheme` gains `filled: { components: string[]; aliases: number;
   orphans: number }`.** Reported, not thrown. `orphans` counts keys kept in
   the file that the bake will skip (RJC 3). Wave 6 surfaces all three.

5. **Bump `THEME_SCHEMA_VERSION` 3 → 4, at all seven sites.** The version is
   currently written out by hand in four files, including two independent
   literal copies in `.mjs` that can drift from `normalizeTheme.ts` in silence:

   | Site | Now |
   |---|---|
   | `vite-plugin/themes/normalizeTheme.ts:13` | `export const THEME_SCHEMA_VERSION = 3` |
   | `vite-plugin/themes/normalizeTheme.ts:32` | `schemaVersion: typeof THEME_SCHEMA_VERSION` |
   | `src/editor/core/themes/themeTypes.ts:221` | `Theme.schemaVersion: 3` |
   | `src/editor/core/themes/themeTypes.ts:247` | `ThemeBundle.schemaVersion: 3` |
   | `src/editor/core/themes/themeService.ts:169` | `schemaVersion: 3` |
   | `src/editor/core/themes/themeService.ts:191` | `schemaVersion: 3` |
   | `scripts/generate-preset-themes.mjs:35` | `const THEME_SCHEMA_VERSION = 3` |
   | `bin/generate-theme.mjs:24` | `const THEME_SCHEMA_VERSION = 3` |

   Import the constant at the four TS value sites rather than writing `4`. The
   two `.mjs` copies cannot import from TS, so leave them as literals but add a
   one-line comment naming `normalizeTheme.ts` as the source of truth; the
   Wave 5 check asserts the presets carry the current version, which catches a
   drifted copy.

   The doc comment on `Theme.componentConfigs` goes in the same edit: its drift
   rationale is now wrong. Bundle import keeps accepting 1 and 3.
   `componentSchemaVersion` (Wave 1) is a separate sequence and does not move
   here.

6. **Boot write-back is free.** `migrateLocalThemes` (`:832`) already writes
   when `migrated` is true, so every local v3 theme is rewritten complete at v4
   with no new dated migration file. Package themes are read-only and get
   filled in memory on each read, which is correct.

**Tests**

- Fill: a theme omitting `radiobutton` comes back carrying it, with every alias
  key, and the values equal to `default.json`.
- Per-alias fill: a theme whose `card` config is missing one key comes back
  with it.
- Idempotence: normalizing a complete theme twice is byte-identical and reports
  `filled.components: []`, `filled.aliases: 0`.
- RJC 3: a config for `notacomponent` and an alias key `--card-gone` both
  survive.
- Deep clone: mutating the returned gradient object does not mutate
  `default.json`'s.
- The v3 landmine test from step 2.
- Round-trip identity (invariant 1): for each of the 7 presets plus `default`,
  the CSS vars derived before and after normalization are equal.

**Verification:** `npm test`, `npm run check`, `npm run test:e2e`,
`check-production-is-default`, and confirm `tokens.generated.css` is unchanged
in git.

---

## Wave 3 — writers stop deltifying, presets regenerate

**Goal:** every writer emits what it means, so a diff of a theme file reads
honestly. The shipped presets become complete on disk.

**Executor:** Sonnet (`recipe-sweeper` for the five edits, `wave-executor` for
the regeneration). **Reviewer:** Sonnet (`wave-reviewer`), Opus reads the
preset diff.

**Data-tree note:** this wave's data change IS the deliverable (invariant 6).
Commit the regenerated presets. Still run `check-production-is-default`.

1. `themeService.ts:144`: drop `.filter((c) => c.source !== 'default')`. Update
   the `captureLook` doc comment, which states the delta rule.
2. `generate-preset-themes.mjs:179`: drop `if (diff === 0) continue`. Keep the
   `diff` count for the log line, which still usefully reports how many aliases
   the ops moved.
3. `bin/generate-theme.mjs`, both holes (Correction 1). **This step stands
   alone** and is worth landing even if the rest of the plan is dropped: the
   live path is missing a resolution layer that both siblings have, which is a
   bug independent of completeness.

   - `:86`, the `--carry-from` path: fall back to `default.json` rather than
     copying only what the source theme holds.
   - `:105`, the live path: add the missing third layer, so it reads
     `_working.json ?? activeTheme.componentConfigs[comp] ?? default.json`.
     This brings it in line with `bin/adjust.mjs:84` and
     `resolveLiveComponentConfig`.

   Both paths then emit all 25 components. The skill's output becomes a
   complete, valid theme by construction, which is the property the whole plan
   is for.
4. `migrateData.ts:391`: drop the `sameContent(pointed, defaultConfig(comp))`
   skip in the recovered theme.
5. `normalizeTheme.ts:125`: on the v1 pointer path, `configName === 'default'`
   resolves the default config instead of `continue`. The comment naming delta
   encoding goes.
6. Run `npm run build:plugin && npm run generate:preset-themes`. Expect: 7
   themes rewritten, `midnight-study` gaining 6 components, four others gaining
   `radiobutton`, `sunset` gaining `progressbar` and `radiobutton`, halloween
   and royal-velvet unchanged in content.
7. `presetThemes.test.ts:76`: invert. Assert every theme carries all 25
   components with the full alias key set. Delete
   `expect(config.aliases).not.toEqual(base.aliases)`. Retitle the test.
   `aliasesOf` (`:41`) loses its `?? defaultConfigOf(comp)` fallback.

**Tests**

- `bin/generate-theme.test.ts`: a theme generated while an **incomplete** theme
  is open carries all 25 components, and the ones the open theme omitted equal
  `default.json`. Same for `--carry-from` pointed at an incomplete theme. These
  are the regression tests for Correction 1's two holes.
- `presetThemes.test.ts` as rewritten in step 7.

**Verification:** `npm test`, `npm run check`, and a spot check that every
regenerated preset's added components have aliases byte-equal to their
`default.json` (a component the ops did not move must be inlined at exactly the
default). Assert `tokens.generated.css` unchanged.

---

## Wave 4 — layer 3 leaves live resolution

**Goal:** live reads are working → theme. The Default theme becomes the
terminal document. Safe only now that every theme is complete.

**Executor:** Sonnet (`wave-executor`). **Reviewer:** Opus (`wave-reviewer`).

Files: `vite-plugin/themeFileApi.ts`, `bin/adjust.mjs`,
`src/editor/core/themes/lookSummary.ts`,
`src/editor/component-editor/scaffolding/ComponentFileManager.svelte`,
`src/editor/core/themes/themeTypes.ts`, tests.

1. `resolveLiveComponentConfig` (`:956`) drops its third branch. If the theme
   carries no entry, that is now a real error (an install whose theme predates
   a newly added component and has not been re-read), so log once and fall back
   to `readComponentConfig(comp,'default')` **without** claiming a
   `'default'` source. Prefer: assert it cannot happen, because
   `readTheme` fills. Decide during the wave and record which.
2. `LiveSource` (`themeFileApi.ts:943`, `themeTypes.ts:152`, `:192`) narrows to
   `'working' | 'theme'`. `resolveSavedComponentConfig` (`:977`) loses its
   fallback the same way.
3. `bin/adjust.mjs:84` mirrors: `working ?? embedded`, and `sources[comp]`
   loses `'default'`.
4. `countComponentsOffLook` (`lookSummary.ts:64`) collapses to
   `components.filter((c) => c.source === 'working').length`. The
   `lookIsDefault` parameter goes, along with its sole call site's third
   argument (`ThemePanel.svelte:159`). Its doc comment,
   which is three paragraphs explaining the delta, shrinks to one line.
5. `ComponentFileManager.svelte`: `editorDoc` becomes `openTheme.fileName`,
   `productionDoc` becomes `$productionTheme?._fileName ?? null`, `editorName`
   becomes `openTheme.name`. Check the rendered copy still reads correctly with
   the Default theme open (it should now say "Motion Proto" where it said
   "Default", which is more honest; confirm with the user if it reads worse).
6. `pruneMarkers/loadProductionConfig.ts`: keep its default fallback. It runs
   at build time against a consumer's tree, which may hold a hand-authored
   theme. Update the comment that describes delta encoding as the model.

**Tests:** `themeFileApi.working.test.ts` and `writeScope.test.ts` move.
`lookSummary` tests lose the `lookIsDefault` cases. `ComponentFileManager.test.ts`
updates. Add: with a complete theme open and no buffers,
`GET /component-configs/:comp/active` reports `_source: 'theme'` for all 25.

**Verification:** `npm test`, `npm run check`, `npm run test:e2e` (the stateful
specs exercise apply/save/adopt), `check-production-is-default`,
`tokens.generated.css` unchanged.

---

## Wave 5 — presets stop re-deriving

**Goal:** the shipped presets are documents that a regeneration cannot move.
The generator becomes a seeder; a check guards the invariants.

**Executor:** Sonnet (`wave-executor`). **Reviewer:** Sonnet.

1. `scripts/generate-preset-themes.mjs` becomes
   `scripts/seed-preset-theme.mjs`, taking one slug:
   `node scripts/seed-preset-theme.mjs <slug> [--force]`. It refuses when
   `themes/<slug>.json` exists unless `--force`. The `PRESETS` ops table stays
   as seeding input (RJC 7), and the seeded output is a complete theme: all 25
   components, full alias sets, with the ops' reassignments applied on top of
   the baseline. Ops that move nothing still produce a config, because the
   theme is now the record of the whole look, not of the diff.

   The sweep-all path is deleted outright, not gated (RJC 7), and with it the
   idempotence machinery (`signature`) that only existed to make sweeping safe.
   `package.json`: `generate:preset-themes` → `seed:preset-theme`.
2. New `scripts/check-preset-themes.mjs`, asserting on the **committed files**,
   never re-deriving:
   - each of the 7 exists, is `schemaVersion` 4 with a current
     `componentSchemaVersion`, carries all 25 components with the full alias
     key set, and carries no orphaned key (RJC 3) — the shipped presets are
     the one place the plan holds to zero, since they are regenerated from the
     baseline in Wave 3 and never re-derived after;
   - the fonts pairing is stamped and matches `PRESET_FONTS`;
   - no two presets share `--card-default-radius` + `--button-primary-padding`.

   Separately, and on the **baseline** rather than the presets (RJC 8), pin the
   five deliberate `--space-2` paddings in
   `component-configs/*/default.json`: `--sectiondivider-{lg,md,sm}-title-padding`,
   `--segmentedcontrol-bar-small-padding`, `--toggle-track-padding`. These are
   Motion Proto's own judgment calls and a component-default resync must not
   move them silently. Home is a plain test beside the component-default
   suite: `sync-component-defaults.mjs --check` gates `.svelte` ↔ `default.json`
   *agreement*, which is a different question from whether a particular value
   is the right one.

   Wire into `package.json` as `check:preset-themes`, add to `prepublishOnly`,
   and add a `Data checks` step to `.github/workflows/verify.yml` running it
   alongside `check:production-is-default` and `check:component-defaults`.
   Note: `verify.yml` currently runs none of the `check:*` scripts; this is a
   deliberate addition, not a restoration.
3. `presetThemes.test.ts`: the distinctness block moves into
   `check-preset-themes.mjs`, so the rule has one home that both CI and
   `prepublishOnly` run. Delete it from the test rather than duplicating.
   Delete the comment at
   `generate-preset-themes.mjs:38` about three ops being altered to satisfy the
   distinctness rule, since distinctness is now a property of the committed
   files rather than of the arithmetic.
4. Update `docs/theme-completeness-audit.md`'s open question 3 with what was
   built.

**Verification:** `npm test`, `npm run check:preset-themes`, and confirm
`npm run seed:preset-theme autumn` refuses without `--force`.

---

## Wave 6 — the incomplete-theme surface, and the docs

**Goal:** a theme that arrived incomplete says so, and a theme with no colors
and type points at the fix. Small wave.

**Executor:** Sonnet (`wave-executor` + `svelte-file-editor` for the panel).
**Reviewer:** Sonnet.

1. `PUT /themes/:name/active` (`:1594`) and the bundle import response carry
   `filled` from Wave 2 (components, aliases, orphans) alongside the existing
   `skippedComponents` and `dropped`.
2. `ThemePanel.svelte`: after an apply or import that reports
   `filled.components.length > 0`, show a one-line notice naming the count and
   saying the gaps were filled from the current defaults. Greyscale chrome,
   `UIPillButton` if it needs an action, no em-dashes (RJC 12).
3. The `422 This theme carries no colors and type` path gets copy naming the
   theme generator skill as the way to build one. Same for
   `respondUnreadableTheme`'s `'colors-and-type'` reason.
4. Rewrite the `Theme.componentConfigs` doc comment
   (`themeTypes.ts:224`). The drift rationale goes; state that a theme carries
   every component and every alias by value, that `normalizeTheme` fills and
   migrates on every read, and that `component-configs/<id>/default.json` is the
   derivation product of `:global(:root)`, not a resolution layer.
5. `docs/theme-completeness-audit.md` gets a closing status line pointing here.
   Check `src/editor/docs/content/*.md` for any user-facing text describing the
   delta and update it; run `npm run check:docs-content`.

**Verification:** `npm test`, `npm run check`, `npm run check:docs-content`,
manual pass loading a deliberately gutted theme.

---

## Out of scope

- Authoring absolute padding tables per preset (Correction 5 replaces it).
- Deleting `component-configs/<id>/default.json` (RJC 4).
- Emitting all aliases into `tokens.generated.css` (RJC 5).
- Retiring any existing migration. Wave 1 makes the TTL *able* to fire; nothing
  is deleted on the strength of it until every consumer tree has been re-read,
  which is a later release's judgment call.
- Any change to `colorsAndType` encoding. It is already complete by value.

## Verification (end state)

1. Every file under `src/live-tokens/data/themes/` carries 25 components and
   1237 aliases, at `schemaVersion` 4 with a current `componentSchemaVersion`,
   and zero orphaned keys.
2. `npm test`, `npm run check`, `npm run test:e2e` green.
3. `check:production-is-default`, `check:component-defaults`,
   `check:preset-themes`, `check:docs-content`, `check:token-contract` green.
4. `git diff` on `src/live-tokens/data/tokens.generated.css` is empty across the
   whole plan.
5. Grepping `componentConfigs` turns up no remaining comment or code path
   describing delta encoding.
6. No orphaned alias key anywhere in `tokens.generated.css`: every var it emits
   is declared by the component whose block it sits in (RJC 3).

## Orchestration

Write-then-execute, per the project's usual split: this plan is the artifact,
and execution starts from a fresh session pointed at this file. Read the whole
doc first, Part 0 and the twelve reserved judgment calls included, before
dispatching anything.

Opus orchestrates and does not implement. Per wave, in order:

1. Dispatch one `wave-executor` (Sonnet) with that wave's section plus the
   global invariants and the commit-unit protocol.
2. Run the wave's stated verification. Never commit red.
3. Dispatch one `wave-reviewer` against the wave diff plus this doc.
4. Commit, per the commit-unit protocol.
5. Report a short summary and stop for the user's go-ahead before the next
   wave.

Never run two waves concurrently: every wave after the first depends on the
previous one's data-tree state.

Opus reads the diff directly, without delegating, for:

- **Wave 2 step 2, the `migrateEmbeddedKey` guard.** The one genuinely
  dangerous edit in the plan. Bumping the schema without it silently replaces
  every consumer theme's palette with the default, and most tests still pass.
- **Wave 3's regenerated preset diff** (7 files, ~1 MB). Check that added
  components are byte-equal to their defaults rather than reading the whole
  diff.
- **Wave 4 step 1**, whether the missing-entry case is an error or a fallback.
  Decide it, and record the decision in this doc.

Run the dev server down during waves 3 and 5. It re-derives config from these
files and races the rewrites.

### If the plan is abandoned partway

Two pieces stand on their own and are worth landing even if the rest is
dropped. Both are marked at their wave.

- **Wave 1** closes a live bug: the bake emits un-migrated alias keys into
  `tokens.generated.css` for any consumer theme predating a token rename.
- **Wave 3 step 3** fixes `bin/generate-theme.mjs`, which is missing a
  resolution layer that `bin/adjust.mjs` and the dev server both have.
