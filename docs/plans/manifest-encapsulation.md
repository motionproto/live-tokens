# Encapsulated manifests

Status: EXECUTED 2026-08-13 on branch `manifest-encapsulation`, all four commit units plus the three addendum units in. Decided the same day ("the design holds"); open questions resolved per their recommendations: theme embeds by value; Apply keeps setting production; the demo look manifests are throwaway, regenerated as v2.

## The discovered corruption

An integrity sweep of the shipped data set found three dangling references, two classes of problem:

1. **The shipped Default manifest references a removed component.** `manifests/default.json` still carries `"stat": "default"`; the `stat` component was removed in c826585. Apply tolerates it silently (`themeFileApi.ts:1244` skips unknown components), which masks the drift instead of surfacing it.
2. **Deleting a config corrupts every manifest that references it.** The config DELETE handler (`themeFileApi.ts:1077`) self-heals the component's own `_active`/`_production` pointers but never looks at manifests. `my-manifest` references `card/my-card` and `panel/my-panel`, both deleted in "clean defaults"; Apply now hard-fails 422 with no warning at delete time and no indication in the manifest list.

Reference-based manifests make integrity a permanent maintenance obligation: every delete path, every component removal, every rename must remember to sweep manifests. The 2026-05-18 robustness work chose pointer-only local manifests deliberately (`temp/manifest-robustness-plan.md` §11: "keep the local manifest lightweight... so the local file never drifts") and confined the self-contained form to a transport-only `ManifestBundle`. The corruption above is the evidence that the compromise doesn't hold.

## Direction (decided)

- **Everything is deletable.** Named component configs and themes are working files; deleting them never needs a guard and never breaks anything.
- **A manifest is encapsulated.** It carries its data by value, not references to separate files. A saved look survives any deletion because it owns its own copy.
- **One protected system manifest.** The Default manifest is a full written set that always sits on disk. Its source of truth is code (regenerable), so even deletion outside the file manager self-heals; the file manager itself never offers deleting it.
- `my-card` and `my-panel` should have lived inside `my-manifest`, not as separate referenced files. Under this model their deletion would have been harmless.

## Design

### Native format: the bundle becomes the manifest

The transport format already is the encapsulated manifest: `ManifestBundle` (`themeTypes.ts`) inlines the manifest meta, the full theme, and every non-default component config, keyed `comp/configName`. Proposal: this becomes the on-disk format of every manifest. Import/export collapse to file copy plus collision renaming; there is one format instead of two.

Delta encoding carries over: embedded `componentConfigs` hold only non-default configs, and `"default"` entries mean "the shipped default". The export path's existing policy ("defaults are NOT inlined; the receiver's local default is canonical") becomes the storage policy. A manifest is therefore *defaults plus owned overrides*.

### The Default system manifest

- Materialized at `manifests/default.json` as a full set: the package default theme plus every component's derived default config, embedded by value.
- Regenerated from code, not hand-maintained: the same boot machinery that seeds `component-configs/*/default.json` (`ensureComponentConfigsDir`, deriving from each component's `:global(:root)`) writes the Default manifest when it is missing or its component set drifts. A hand-authored TS data file would recreate the `stat` problem in a new home; derivation keeps the `.svelte` sources as the single source of truth.
- The `stat` entry disappears on first regeneration, and removals like it can never persist again.
- File manager: no delete affordance for Default (already 403 server-side); outside deletion self-heals on next boot.

### Lifecycle operations

- **Save / capture**: snapshot the current active theme and active component configs into the manifest, by value. What you see is what the manifest keeps.
- **Adopt auto-patch**: unchanged in spirit; adopting re-snapshots that slice into the active manifest's embedded copy.
- **Apply**: materialize the embedded data into working files under the manifest's slug (`themes/<slug>.json`, `component-configs/<comp>/<slug>.json`), then flip active + production and sync CSS as today. Embedded data for a component that no longer exists is skipped; that is now genuinely harmless because the data is self-contained rather than a broken promise.
- **Delete**: every guard except the Default manifest's goes away. The config DELETE handler keeps its pointer self-heal and loses nothing else.

### Migration

Existing pointer manifests migrate on load: resolve each reference and embed the config it points at. Dangling references (the `my-card` case) cannot be resolved from disk; the migration falls back to `"default"` for those entries and reports what it dropped. Note: `my-card.json` and `my-panel.json` are recoverable from git (last present at e7f1211), so `my-manifest` can be restored to its intended content as a one-time step if wanted.

Manifest `schemaVersion` bumps (bundle format is v1; encapsulated-native becomes v2), following the theme-migration pattern.

## Out of scope

- The reference-integrity guards proposed earlier (delete blocking, `check:manifest-integrity`): superseded by this model, which removes the failure class instead of policing it.
- Shape/space CLI manifest writing (`docs/plans/shape-space-skill.md` deferred it); this redesign is its prerequisite done right, since a CLI-written look becomes one self-contained file.
- Multi-manifest active state, per-component mixing across manifests.

## Decisions (2026-08-13)

1. Theme embeds by value; theme files become deletable without ceremony.
2. Apply keeps setting production (orthogonal to encapsulation; documented intent stands).
3. The demo look manifests (baseline / soft-pill / sharp-dense / chunky) are throwaway; regenerate as v2.
4. The Default manifest is regenerated from the same boot derivation that seeds default configs, not from a hand-authored TS data file (a second hand-maintained copy would recreate the `stat` drift).
5. `my-manifest` is restored to its intended content during data cleanup: `my-card` and `my-panel` are recovered from git (e7f1211) and embedded, then the standalone files stay deleted. This is the encapsulated model applied retroactively.

## Implementation plan

Commit units in order on branch `manifest-encapsulation` (stacked on shape-space-adjust; wave 4 needs the adjust CLI); each unit leaves the tree green. Key implementation surfaces were mapped ahead of execution; per-wave briefs carry the file:line detail.

1. **Server format flip.** `Manifest` v2 type (schemaVersion 2, embedded theme + by-value non-default componentConfigs, delta against defaults); `normalizeManifest` called from every manifest read door (the `normalizeTheme` pattern); eager v1→v2 resolve-and-embed migration in `ensureManifestsDir` (eager, so references are resolved before the new deletability regime can orphan them; dangling → default, logged); `handleApplyManifest` materializes embedded data under the manifest slug; `handleExportManifest` becomes envelope-only; `handleImportManifest` gains the v2 branch (validate + write one file, no materialization at import); `patchActiveManifest` embeds the adopted data instead of the pointer. Tests per `themeFileApi.fallback.test.ts` conventions plus a migration test.

## Addendum: preset example manifests (decided 2026-08-13, EXECUTED 2026-08-13)

Promote the nine shipped preset themes to full example looks: one shipped v2 manifest per preset, embedding the preset theme by value plus a modest shape personality built with the pure `adjustAliases` engine over the derived component defaults. Encapsulation makes this shippable where the pointer model could not (a pointer manifest would reference configs the package does not ship).

Shape personalities (ops against default configs; magnitudes deliberately modest):

| Preset | Ops |
|---|---|
| autumn | radius +1, padding +1 |
| christmas | radius +2, gap +1 |
| halloween | radius −2, border-width +1 |
| midnight-study | radius −1, padding −1 |
| ocean | radius +2, padding +1 |
| royal-velvet | button radius set full; radius +1, padding +1 |
| saint-patrick | radius +1 |
| spring-meadow | radius +1, padding +1, gap +1 |
| sunset | button radius set full; radius +2 |

Mechanics:

- **Unit 5 (server):** package-shipped manifests resolve through the existing `packageManifestsDir` fallback (list, GET, apply, export). Add the missing delete guard mirroring `PACKAGE_THEME`: deleting a local shadow restores the shipped version (pointer semantics already correct after 2031e38); deleting with no local copy 403s `PACKAGE_MANIFEST`. Fallback tests mirroring the preset-theme suite.
- **Unit 6 (generator + data + docs):** committed `scripts/generate-preset-manifests.mjs` builds all nine deterministically from the derived default configs + preset theme files using the compiled engine (no active-state churn, no working-file trail); idempotent (preserves createdAt, skips write when content unchanged modulo timestamps) so regeneration is safe when component defaults drift. Manifests committed under `src/live-tokens/data/manifests/`, added to `package.json` `files`, README + release-notes touch. Manifest display name = theme display name.

As executed: embedded configs are stamped `name: <preset slug>`, so a materialized `<slug>.json` reads coherently under the name Apply gives it. Between 21 and 24 of the 25 components carry a config per preset. The shape ops land where the defaults sit, which is one rung below the sketch in a couple of places: `--card-default-radius` is `--radius-lg` (Christmas takes it to `--radius-2xl`) and `--button-*-radius` is `--radius-xl` (Halloween takes it to `--radius-md`). Royal Velvet and Sunset buttons are `--radius-full`. `vite-plugin/manifests/presetManifests.test.ts` gates all nine for v2 pass-through, delta encoding, and their nine explicit `files` entries.

2. **Default regeneration + full deletability.** `ensureManifestsDir` materializes the full-set Default manifest (package default theme + derived default configs, drift-aware like `generateDefaultConfig`); theme DELETE loses the production guard and gains production self-heal (pointer → default + syncs, mirroring the config DELETE handler); active-manifest deletion allowed with `_active` self-heal to default. Package/default 403s stay. Tests.
3. **Client + tooling.** `manifestService` snapshot functions build by-value manifests; `ManifestFileManager` drops the active-manifest delete guard, help copy rewritten for encapsulation; `ThemeFileManager` `canDelete` loses the production-theme exclusion; `scripts/collapse-manifest-to-default.mjs` rewritten to read embedded data. svelte-check green.
4. **Data + docs.** Repo's `manifests/default.json` regenerated (stat entry gone); `my-manifest` restored per decision 5; demo look manifests regenerated as v2; README manifest model copy updated; cross-reference from `docs/plans/shape-space-skill.md`.

## Addendum 2: bold preset personalities + font pairings (decided 2026-08-13, EXECUTED 2026-08-13)

Feedback on the first personalities: the presets still read as color swaps. The modest global shifts are invisible next to the palette change, and every preset moves the same way. Revision goals, from Mark: real variation between presets so no two share a shape and corner-radius profile; deliberate intra-preset contrast is welcome ("sharp windows and round buttons"); visible spacing differences; and a Google Fonts pairing per preset — popular or recommended pairings, playful allowed, avoiding Inter, IBM Plex, and the common technical families. Nine presets stay. The Default look keeps its current fonts (Arvo display, Manrope sans) and default shapes.

Fonts are a theme slice, so pairings land in the preset THEME files (`fontSources` + `fontStacks`) and the manifests embed them: applying either the theme alone or the manifest changes the type. Each preset overrides `--font-display` (heading) and `--font-sans` (body) and leaves `--font-serif` / `--font-mono` at the defaults. Sources are `kind: "google"` entries with real fonts.googleapis.com URLs and sensible weight sets, following the shape of the default theme's Manrope entry.

Revised personalities (ops in listed order; global before targeted so targeted wins):

| Preset | Shape and space ops | Display / body fonts | Identity |
|---|---|---|---|
| autumn | radius +1; padding +2; gap +1 | Fraunces / Nunito Sans | cozy paper, generous |
| christmas | radius +3; button set full; gap +2 | Mountains of Christmas / Nunito | storybook, very round |
| halloween | radius set none (global — squares even the pills); border-width +2; padding −1 | Creepster / Karla | sharp poster, heavy lines |
| midnight-study | dialog set none; card set sm; button set full; padding −2; gap −1 | EB Garamond / Montserrat | sharp windows, round buttons, dense |
| ocean | radius +2 with full; button set full; padding +1; gap +1 | Quicksand / Mulish | everything soft |
| royal-velvet | button set full; radius +1; padding +2; border-width +1 | Cinzel / Lato | stately, defined edges |
| saint-patrick | button set full; radius +2; gap +1 | Baloo 2 / Cabin | friendly pub |
| spring-meadow | padding +2; gap +2; radius +1 | Comfortaa / Figtree | airy, delicate |
| sunset | radius +2; button set full; padding +1 | DM Serif Display / Jost | warm lounge |

Distinctness check the review must enforce: no two presets share both their card-radius landing rung and their button-padding landing rung; halloween and midnight-study are the only sharp profiles and differ from each other (fully square vs. mixed); every display font unique, every body font unique.

Mechanics (unit 7, one commit): a fonts table in `scripts/generate-preset-manifests.mjs` (or a sibling module it imports) stamps `fontSources` + `fontStacks` into each preset theme file idempotently, the ops table is replaced with the revised one, manifests regenerate, `presetManifests.test.ts` extends to gate the font stamping and the distinctness rules, README's example-looks bullet mentions type. Executor verifies each family exists on Google Fonts with the listed weights by checking the constructed URLs, and confirms `syncFontsToCss` / the font loader handles multiple google sources per theme.

### As executed (unit 7)

Pairings live in `scripts/lib/presetFonts.mjs`, which the generator calls before it embeds each theme, so `npm run generate:preset-manifests` still does the whole regeneration. Stamped sources are ided `src_preset_<family-slug>` and a run drops every `src_preset_*` source before restamping, so changing a pairing leaves no orphan behind. A second run writes nothing.

All 18 css2 URLs answered 200 with the requested family and weight coverage in the returned CSS; the API answers 400 for a weight a family lacks (`Creepster:wght@700`, `Quicksand:wght@100..900`), so a passing URL is a real check. No weight list needed adjusting. Most are `wght@` ranges; Mountains of Christmas takes `400;700`, Lato `300;400;700;900`, and the single-weight Creepster and DM Serif Display take a bare family name. Family `weights` are derived from the URL, and the test cross-checks them against the editor's own `parseGoogleFontsUrl`.

`syncFontsToCss` and `applyFontSources` both loop over the whole source list, so two more google sources per theme need nothing from either. Applying Christmas on a fresh consumer writes six `@import` lines and `--font-display: "Mountains of Christmas", serif`.

Landing rungs, card `--card-default-radius` / button `--button-primary-padding` / `--button-primary-radius`:

| Preset | Card radius | Button padding | Button radius | Components | Aliases |
|---|---|---|---|---|---|
| autumn | `--radius-2xl` | `--space-12` | `--radius-3xl` | 24 | 183 |
| christmas | `--radius-3xl` | `--space-8` | `--radius-full` | 23 | 76 |
| halloween | `--radius-none` | `--space-6` | `--radius-none` | 25 | 252 |
| midnight-study | `--radius-sm` | `--space-4` | `--radius-full` | 22 | 119 |
| ocean | `--radius-2xl` | `--space-10` | `--radius-full` | 24 | 183 |
| royal-velvet | `--radius-lg` | `--space-12` | `--radius-full` | 25 | 211 |
| saint-patrick | `--radius-2xl` | `--space-8` | `--radius-full` | 23 | 76 |
| spring-meadow | `--radius-xl` | `--space-12` | `--radius-2xl` | 24 | 183 |
| sunset | `--radius-xl` | `--space-10` | `--radius-full` | 23 | 166 |

Three ops differ from the table above, because the table as written breaks its own distinctness rule: autumn, royal-velvet and spring-meadow all land on (`--radius-xl`, `--space-12`), and ocean and sunset both on (`--radius-2xl`, `--space-10`). Two clusters need three moves, and these are the three: autumn takes radius +2 instead of +1 (cozy reads rounder), royal-velvet drops its radius +1 and keeps cards at the default `--radius-lg` (stately corners under +2 padding, +1 border-width and pill buttons, and the only preset on that rung), sunset takes radius +1 instead of +2 (leaving ocean the softest). Review can trade any of them for a different move; regeneration is one command.

Two notes for review, left as the addendum specified them:

- Ocean's `radius +2 with full` is inert today. No component default sits at `--radius-3xl` or above, so nothing can climb to `--radius-full`, and existing pills are preserved with or without the flag. Kept as declared intent.
- Preset themes keep the Arvo and Manrope sources inherited from the default theme, now referenced by no stack, so each preset's `fonts.css` carries two unused `@import`s. Pruning unreferenced sources would widen the stamper's remit past "add or replace the two".

### Post-review revision (2026-08-13)

Two presets renamed to step away from the religious names, per Mark: christmas → **yuletide** ("Yuletide") and saint-patrick → **leprechaun** ("Leprechaun"), keeping their fonts (Mountains of Christmas, Baloo 2) and personalities. Theme files, manifests, package `files` entries, tests, README, and CHANGELOG all follow; the generate-theme skill keeps "Christmas" and "St. Patrick's" as brief vocabulary since that is what users type. Nothing had shipped, so no migration.

Two unit-7 review findings fixed in the same pass: `stampPresetFonts` now drops sources no stack references (the displaced Arvo and Manrope entries were two render-blocking @imports per consumer page load; preset themes carry four sources, all used), and the generator counts aliases that differ from the default instead of per-op change records (overlapping ops double-counted).

## Addendum 3: preview-before-commit for manifest Load (decided 2026-08-13)

Feedback from Mark: selecting a look should not commit it. Keep the file window open, let the user select a manifest, update the page in the background as a preview, and only Save (commit) or Cancel (revert) ends the session. Today's Load applies server-side and hard-reloads the page per selection, which makes browsing the nine preset looks clunky.

Design, unit 8 (one commit):

- **Preview is pure client-side render state.** Selecting a manifest fetches it (GET; encapsulated, so the response carries the whole look) and paints it: theme vars and component-config alias vars written through the existing fan-out writer (both self and parent `:root`; the iframe constraint stands), fonts injected via the existing font-source loader. No server write, no pointer flip, no editor-store mutation, and the preview must not be capturable by manifest Save-As (it is not store state).
- **Selection is re-entrant.** Picking another manifest previews that one instead; picking the active manifest (or Cancel) restores the real state by re-deriving vars and fonts from the editor store, not by snapshotting DOM values.
- **Save commits via the existing Apply** (materialize under the slug, flip active + production, sync CSS, reload; skipped-components alert unchanged). The unsaved-edits confirm moves from selection time to Save time; Cancel always restores the user's live state including their unsaved edits' rendered values.
- **Scope: ManifestFileManager only.** The executor verifies how the theme manager's own Load behaves today; if it also hard-commits per selection, note it as a candidate for the same pattern, do not build it.
- Editor UI rules apply: greyscale, pill buttons, tokened values, no em-dashes in copy. The list rows gain a selected state; Save/Cancel appear only while a preview is live; closing the window equals Cancel.

Risks the executor must resolve by reading the code, not assuming: where boot/theme-switch derives the full var set (renderer entry point to reuse for both preview and revert), how gradient/structured alias values become CSS, and whether font `<link>` injection is idempotent enough to swap pairings repeatedly in one session.

### Addendum 3, as executed (2026-08-13)

Shipped in unit 8 plus a review-fix commit. The preview reuses `deriveCssVars` and the cssVarSync fan-out verbatim; fonts swap through `applyFontSources` diffing. Review verdict PASS; fixes taken: the close-during-fetch race (a paint landing after the window closed left a preview with no Save/Cancel on screen), the memoized rejected defaults fetch, and a permanent re-preview test (A to B diffs against the live look, not the previous preview).

Deliverable noted per the spec: the THEME file manager's own Load still hard-commits per selection (`ThemeFileManager.svelte` `handleLoad`: confirm on dirty, close, PUT `_active`, hydrate). Same clunky shape this addendum removed for manifests; candidate for the identical preview pattern, not built.

## Addendum 4: preview-before-commit for theme Load (decided 2026-08-13)

Field report from Mark confirmed the unit-8 note: the THEME file manager's Load still commits and closes on selection. Extend the preview pattern there: the list stays open, selecting a theme paints it in the background, switching is free, Save commits (the existing PUT-active + hydrate flow), Cancel or closing reverts.

Semantic difference from manifest preview, binding: a theme is colors and fonts, not a complete look. The preview swaps ONLY the theme-derived slices (cssVariables, palettes, gradients, shadows, overlays, columns, fonts) and keeps the user's current component-config state exactly as rendered now. No component resets, no defaults fetch. Reuse the unit-8 engine's paint/revert core; the look computation composes the candidate theme's derivation with the live store's component slice. Everything else mirrors addendum 3: GETs only, no store mutation, no dirty marking, revert re-derives from the store, re-selection diffs against the live look, deleting the previewed file cancels, unsaved-edits confirm moves to Save.
