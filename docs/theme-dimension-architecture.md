# Theme dimension architecture

A brief for an audit and an implementation plan. Nothing here is a decision.

## The situation

A theme has grown one feature at a time. Colors came first, type was added
beside them, geometry arrived later as component configs, and sketch style
later still. Each addition was made where it was cheapest rather than where it
belonged, and the result is a data model and a CLI that disagree about how many
dimensions a theme has.

The skills layer forced the question. `live-tokens-create-theme` now states one
design direction and routes a color intent, a type intent, and a geometry intent
to three peer skills. That model is clean and the storage under it is not, so
the skill documentation has to spend paragraphs explaining an asymmetry that
exists only because of where code landed.

The question for the audit: is a theme three dimensions, and if so, should the
API and the data structure say so.

## What a theme is made of today

`src/live-tokens/data/` holds four artifact classes:

| Directory | Count | Holds |
|---|---|---|
| `themes/` | 9 | the whole theme by value, schemaVersion 5 |
| `colors-and-type/` | 9 | the inner layer, same slugs |
| `component-configs/` | 26 | one directory per component |
| `sketch-styles/` | 7 | sketch styles |

A theme document (`themes/autumn.json`) carries `name`, `createdAt`,
`updatedAt`, `schemaVersion`, `colorsAndType`, `componentConfigs`, and
`componentSchemaVersion`. `themeTypes.ts` also declares an optional
`sketchSettings`, which no theme on disk currently uses.

The `colorsAndType` layer decomposes like this:

| Key | Size | Dimension |
|---|---|---|
| `editorConfigs` | 10 palettes | color |
| `harmonyAxes` | 4 | color |
| `gradients` | 4 | color |
| `fontSources` | 4 | type |
| `fontStacks` | 5 | type |
| `cssVariables` | 55 | color, type, and geometry |

## Symptoms

**1. One build function decides two dimensions.** The engine exposes
`buildColorsAndType`, called at `bin/set-colors.mjs:180`. A skill that means to
change only the color has to call a function named for two dimensions and pass
the type content through as carry-forward arguments.

**2. A peer writes the theme.** `set-colors` builds the layer, composes a whole
theme, writes `themes/<slug>.json` (`bin/set-colors.mjs:184`), and activates it.
`set-type` and `set-geometry` write only unsaved buffers. One of three peers
owns an artifact the other two never touch.

**3. Activation deletes the other two skills' work.** `applyTheme`
(`bin/set-colors.mjs:203-213`) removes `colors-and-type/_working.json` and every
`component-configs/*/_working.json`, then repoints `_active.json`. `set-colors`
reads those buffers into the theme first (`:102-120`), so nothing is lost, but
the sequence is the reason run order matters, the reason `--carry-from` exists,
and the reason the create-theme skill has to document a safe order.

**4. The override bag spans all three dimensions.** `cssVariables` is not the
token system. It is a bag of overrides, and it already carries geometry: six
`-border-width` keys on badge, sectiondivider, and dialog, plus
`--columns-count`, `--columns-max-width`, `--columns-gutter`, and
`--columns-margin`. So the layer's name understates the problem. It is not a
colors-and-type layer that should be two things; it is the theme's override
layer, which is three things. `set-geometry` writes none of it, since it writes
component-configs buffers instead.

**5. The inner layer is stored twice.** `themes/autumn.json`'s `colorsAndType`
value is byte-identical to `colors-and-type/autumn.json`. Whether the standalone
directory is still load-bearing after themes became complete documents at
schemaVersion 4 is an open question.

**6. The directory name is wrong.** `colors-and-type/` holds geometry today.

## What the skills now assume

Four skills ship in the tarball and are being rewritten on branch
`three-contributing-skills`:

- `live-tokens-create-theme` states one design direction, derives three intents,
  routes them, and assembles three reports.
- `live-tokens-set-colors`, `live-tokens-set-type`, `live-tokens-set-geometry`
  each own one dimension and promise to change nothing else.

The design under discussion, not yet built:

- Every set skill writes only its own dimension's buffer. No theme writing, no
  activation, no clearing of a sibling's buffer.
- `create-theme` gains the CLI verb that composes the buffers into
  `themes/<slug>.json` and activates it. It becomes the only thing that names a
  theme.
- The theme name moves out of the base color file and into that verb.
- `--carry-from` becomes a flag on the compose verb, meaning compose from a
  named theme rather than from live state.

`bin/set-colors.mjs:102-120` already contains the composition logic this verb
needs, and its own comment says it mirrors `set-geometry.mjs`'s
`readLiveConfigs` and the dev server's `resolveLiveComponentConfig`.

## What is being asked

1. An audit of the theme data model and the CLI surface against the claim that a
   theme has three dimensions. Say where that claim holds, where it breaks, and
   what it would cost to make the structure state it.
2. A judgment on `sketchSettings`: fourth dimension, or a separate artifact
   class that a theme merely references.
3. An implementation plan in the repo's usual wave form, with the migration
   story and the semver call stated up front.

## Constraints that must survive

- **`_working.json` is the editor's live buffer, not a CLI scratch file.** The
  editor writes it when a slider moves, and the running page renders it. This is
  why `set-type` and `set-geometry` produce a visible change with no save.
  Any design that stages edits somewhere the page does not read loses live
  preview and breaks the standalone path, where a user invokes one set skill and
  saves in the editor.
- **The editor's Save is already a consolidator.** A second staging layer over
  the buffers would duplicate it.
- **Theme schema changes need a migration and a boot pass.** `schemaVersion` is
  the gate; see the version-5 note in `themeTypes.ts`.
- **Presets are seeded once and frozen.** A key rename rewrites all nine.
- **CLI verbs are public API.** Narrowing `set-colors` so it no longer produces
  a theme is a breaking change and needs the major-version treatment, not a
  quiet minor.
- **CI runs tests before the plugin is built.** A `.mjs` module a test imports
  must load the compiled engine lazily, inside the function that needs it.
  `bin/engineLoadsLazily.test.ts` enforces it.
- **The data tree is live app state.** Restore it after exercising the CLI; see
  the recipe in `CLAUDE.md`.
- **Editing a SKILL.md moves the Skill Atlas.** `npm run sync:skill-atlas` and
  `npm run sync:skill-sources` both have to run.

## Two candidate directions

Starting points for the audit to accept, reject, or replace.

**A. Split the document three ways.** `colors/`, `type/`, and `geometry/`
directories with theme keys to match. Every `cssVariables` key is classified by
suffix, which is the same suffix logic the component picker already uses. Cost
is a schemaVersion 6 migration across every preset and every saved user theme,
plus a data-directory rename.

**B. Split ownership and the build entry points, keep one document.** The engine
grows `buildColors` and `buildType` in place of `buildColorsAndType`. Each set
skill writes a disjoint key set: color owns `editorConfigs`, `harmonyAxes`, and
`gradients`; type owns `fontSources` and `fontStacks`; geometry keeps
component-configs. `cssVariables` stays an editor-owned override bag that the
compose verb carries forward.

B kills the fused build function and the theme-writing peer without a schema
migration, on the argument that the residual mixing in `cssVariables` is not
colors-versus-type entanglement. A should win only if the audit finds the
override bag causes real defects rather than untidiness.

## Open questions

1. Is `colors-and-type/` still load-bearing, given the theme document carries an
   identical copy?
2. Does `cssVariables` need to be split by dimension, or is editor ownership the
   right answer for a bag of overrides?
3. Is sketch style a fourth dimension of a theme, and if so does it need a set
   skill?
4. Where does batch theme generation live once `set-colors` stops writing
   themes? The compose verb per name, or a retained capability on `set-colors`?
5. What does the compose verb do when invoked with no buffers present?

---

# Audit

Written 2026-09-03 against branch `three-contributing-skills` at `7f84109`.
Line numbers cite that tree.

**Executed.** `docs/plans/theme-dimension-ownership.md` turned the verdict below
into six waves on this branch: 5e141ca (one live-state reader), db5e22f (the
dead keys), 89f0cd5 (engine names follow the verbs), 37d414c (`set-colors`
narrows, `save-theme` lands), 8812725 (skills and atlas), and the docs sweep
that carries this line. That plan's Status table records every commit.

## Verdict

A theme is three design decisions and one document. The three-dimension claim
holds at the verb layer and the engine, and it should be stated there. It does
not hold at the storage layer, and it should not be made to: the storage is
organised by scope, and dimension cuts across scope. Take direction B, amended
below. Reject direction A.

The one finding that moves the argument: 36 of the 55 keys in `cssVariables`
are dead. They are the color, type, and border-width siblings of the eleven
radius and padding keys that `2026-08-13-drop-legacy-shape-space-keys` removed
(`badge-trait-*`, `sectiondivider-title-*`, `sectiondivider-description-*`,
`dialog-{primary,secondary}-{default,hover}-*`). No component reads them; the
only readers outside `data/` are migration tests. The Section 1 bake in
`regenerateTokensCss` has no orphan filter, unlike the component bake at
`themeFileApi.ts:479`, so every Adopt ships all 36 into a consumer's
`tokens.generated.css`. Symptom 4 rests almost entirely on these keys. Once
they go, the bag holds 19 keys: 4 gradient projections, 5 shadows, 6 washes,
and the 4 `--columns-*` page-grid tokens. That is color plus one page-layout
override, and it is not a three-way entanglement.

## Dimension is not a storage axis

Both candidate directions assume geometry lives in `component-configs/` and
color and type live in `colors-and-type/`. Neither is true. A component config
carries every alias its component declares: `--button-primary-surface` is
color, `--dialog-title-font-family` is type, `--button-radius` is geometry.
`set-geometry` already knows this. It reads the whole config and moves only the
aliases `matchesKind` classifies as radius, padding, gap, or border-width. The
same suffix classification is what the picker uses.

So the data model has two layers by scope, theme-wide and per-component, and
each layer holds all three dimensions. A directory per dimension would have to
split every component config three ways, or hold color aliases under
`geometry/`. That is why A fails on its own terms, before its migration cost
is counted.

The right statement of the three pillars is therefore ownership, not
placement: each set verb has a disjoint write set defined by suffix within the
one document, and one compose verb turns live state into a named theme.

## Where the claim holds and where it breaks

| Layer | Holds | Breaks | Cost to fix |
|---|---|---|---|
| Skills | Four skills, three intents, disjoint promises | The create-theme skill documents run order and `--carry-from` because of the CLI below | Rewrite two sections once the CLI changes |
| Engine | `buildColorsAndType` computes palettes, harmony, gradients, and shadows only; every type field is passthrough (`generateColorsAndType.ts:427-486`) | The name. Nothing else | Rename to `buildColors`, narrow `CarryForward` to what it reads |
| CLI | `set-type` and `set-geometry` write buffers and nothing else | `set-colors` writes and activates a theme (symptoms 2 and 3) and owns the theme name | New verb plus a narrowed `set-colors`; see below |
| Document | One complete document, `sketchSettings` by value, every component by value | `cssVariables` carries 36 dead keys | One colors-and-type migration |
| Directories | `_working.json` is the buffer; `default.json` seeds `themes/default.json` (`themeFileApi.ts:959`) | Eight preset copies are inert at runtime; the Load list drops them as `isPackage` (`loadRows.ts:40`) | Optional; see open question 1 |

## Answers to the open questions

**1. Is `colors-and-type/` load-bearing?** In four places, and the running
page is none of them. `_working.json` is the live buffer. `default.json` is the
seed for `themes/default.json` and the floor in three resolvers. The eight
preset copies are the authoring input to `scripts/seed-preset-theme.mjs:150`.
`diskThemeResolvers.readColorsAndType` (`:831`) resolves v1 pointer-form
themes. Nothing in the editor writes a named file: `saveColorsAndType` is
exported from `src/editor/index.ts:30` and has no caller. Keep the directory
and its name; renaming it touches the routes, the public exports, the
legacy-layout heal, and every consumer's data tree, for a name that stops
being wrong once the dead keys are gone. The eight preset copies can be
deleted if `seed-preset-theme.mjs` reads `themes/<slug>.json`'s own
`colorsAndType` instead. That is a maintainer-script change and a
`package.json#files` edit, and it is separable from everything else here.

**2. Split `cssVariables` by dimension?** No. Drop the dead keys and it is a
bag of tokens.css overrides plus the color pass's own projections. The color
pass already owns the keys it emits: it strips them and rewrites them
(`generateColorsAndType.ts:465-472`). The editor owns the rest. Direction B's
sentence "the compose verb carries it forward" is right with one amendment:
the color pass replaces the gradient and shadow keys, and carries the rest.

**3. Is sketch a fourth dimension?** It is a fourth part of the document and
not a fourth dimension of the design direction. `docs/plans/sketch-in-the-theme.md`
already settled the storage: the theme carries the dials by value, presence is
the on state, localStorage is the live buffer, and there is no server door
(`themeService.ts:159-162`). Any theme can wear any sketchstyle, so it is an
overlay the direction does not fix, and `create-theme` should not route an
intent for it. A `set-sketch` skill has a structural problem to solve first:
its buffer is browser-local, so a CLI has nowhere to stage an edit the page
would render. Defer it. The compose verb must carry `sketchSettings` from its
source theme unchanged, because it cannot read the live value.

**4. Where does batch generation live?** With `set-colors` writing a buffer,
one theme is `set-colors` then `save-theme <name>`. A set is that pair
repeated with `--no-activate` on every `save-theme` but the last, so live
state stays the original theme plus buffers and each run carries the same
type and geometry. `--carry-from` then has no job and is dropped rather than
moved.

**5. Compose with no buffers?** Save As on an unedited theme, which the
editor already permits: a copy of the open theme under the new name. The
report says so.

## The recommended direction

Direction B with three amendments: the color pass owns its projections in
`cssVariables`; `--carry-from` is dropped, not moved; and the dead-key
migration is in scope because it is the evidence behind symptom 4.

1. **Migration.** `CURRENT_COLORS_AND_TYPE_SCHEMA_VERSION` steps once and a
   migration drops the 36 keys. Presets are frozen, so all nine files and
   their eight copies are rewritten in the same commit. Consider also giving
   the Section 1 bake the same orphan rule the component bake has, keyed on
   the names `tokens.css` declares plus the gradient projections, so the next
   rename cannot ship dead CSS.
2. **Engine.** `buildColorsAndType` becomes `buildColors`. `CarryForward`
   narrows to `cssVariables` and `gradients`; `fontSources` and `fontStacks`
   leave the signature. `applyFontPairing` already is `buildType`, and
   `adjustAliases` in `dist-plugin/adjust` already is the geometry engine.
   There is no `buildGeometry`, and this plan does not add one. Color and type
   build from an absolute specification; geometry applies relative moves to
   the live state, because the skill's vocabulary is moves ("rounder",
   "airier") and no absolute geometry document exists apart from the
   component configs themselves. The asymmetry is deliberate. It has no
   bearing on ownership, since `set-geometry` already writes only its
   buffers, and batch generation preserves a common starting point through
   `--no-activate`. The three engine bundles still carry retired verb names:
   `generateColorsAndType/`, `fontPairing/`, and `adjust/`. Rename the tsup
   entries and the `ENGINE` paths in `bin/` to `setColors/`, `setType/`, and
   `setGeometry/`, so skill, verb, module, and bundle share one word. None has
   an `exports` entry, so the rename is private. The function names stay:
   `set` names the outcome a person asked for, and the functions name the
   mechanism, which differs per dimension.
3. **`set-colors` narrows.** It reads the live colors and type the way
   `set-type` does (`set-type.mjs:66-74`), replaces `editorConfigs`,
   `harmonyAxes`, `gradients`, and the projected keys, keeps the buffer's
   name, and writes `colors-and-type/_working.json`, or clears it when the
   result matches the open theme. No theme file, no activation, no
   `--carry-from`, no `--no-activate`. The base color file loses `name`.
4. **`save-theme <name>` is the compose verb.** It is `captureThemeContent`
   and `saveAsTheme` reproduced offline: live colors and type, every
   component's live config, `sketchSettings` from the open theme, written to
   `themes/<slug>.json` and activated unless `--no-activate`. Activation is
   `applyTheme` as it stands. `set-colors.mjs:102-120` already holds the
   read; it moves.
5. **Skills.** `create-theme` gains step 7, run `save-theme`, and loses the
   run-order paragraph and the `--carry-from` paragraph. `set-colors` loses
   step 3's theme claim and the flags paragraph. Both atlas syncs run.

Before step 1 the mirrored `readLiveConfigs` in `set-geometry.mjs`, the
`readLiveColorsAndType` in `set-type.mjs`, and `resolveCarrySource` in
`set-colors.mjs` are three copies of one resolver. `save-theme` would be a
fourth. Put one in `bin/lib/` first, lazily loading nothing from the engine so
`engineLoadsLazily.test.ts` stays green.

## Semver

`generate-theme` shipped through 0.73.0. Its rename to `set-colors` is on this
branch and unreleased. Narrowing the verb now rides the same break: one
labeled BREAKING entry under Unreleased instead of a rename in 0.74.0 and a
semantics change in 0.75.0. Pre-1.0, that entry is the major-version
treatment the constraints section asks for. Doing it after the rename ships
costs a second break for no gain, which is the strongest reason to decide
this before the branch merges.

## What direction A would have cost, for the record

A schemaVersion 6 theme migration, a colors-and-type directory rename with a
legacy-layout heal, new resource routes, new public exports beside the old
ones, a three-way split of every component config or a `geometry/` directory
that holds color, and a rewrite of every consumer's data tree. It would buy a
directory listing that names the three dimensions. Every defect this audit
found is fixed by B.
