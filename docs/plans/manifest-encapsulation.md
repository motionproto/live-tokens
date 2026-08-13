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

### Addendum 4, as executed (2026-08-13)

Shipped in unit 9. The composition the addendum specifies is already what `themeToState` produces: its `components` domain loader (`slices/components.ts` `loadComponentsFromVars`) clones the live store's component slice onto the projected state and strips component-owned vars out of the theme's own bag, so `themeLook(theme)` is `deriveCssVars(themeToState(theme))` plus the candidate's resolved font stacks. Nothing had to be composed by hand, and `themeToState` was not touched. The strip covers exactly the var names the live component slice aliases: for those, the live alias wins over any value the theme file carries (pinned by test); a theme-file var for a component name the live slice does not alias paints as an ordinary theme var, identical to a committed Load.

Save transition: the commit path reverts the preview first, then runs the existing load (PUT `_active`, then hydrate through `onload`). The renderer diffs against its own last-applied set, which never sees a preview's direct `setCssVar` writes, so committing from a painted preview could strand one of its vars. Reverting first makes Save land exactly as a Load with no preview in play, at the cost of showing the outgoing look for two round trips (the `_active` PUT, then the hydrate GET). No page reload here, unlike manifest Apply.

`previewTheme` and `previewManifest` share one `applyPreview` core, so either kind of preview replaces the other and one revert restores the live state. Browser check not run: the headless smoke ran the real `loadTheme('yuletide')` client GET and `themeLook` against a store fixture holding a customized card.

## Addendum 5: the look hierarchy (decided 2026-08-13)

Mark's verdict on the two peer file managers: confusing; "theme should have all things and be stored in a manifest... we treat it as a hierarchy, like a component." The layered storage stays (color/type and shape change at different speeds; the generators compose because the layers are orthogonal); the UI and vocabulary restructure around one root artifact with parts, the way a component has parts.

- **Root: Theme** — the whole look, backed by the manifest file, unchanged on disk. One panel at the top of the sidebar: active look identity, Save (captures everything, which manifest save already does), Save As, Load with the preview flow, Import/Export. The nine presets appear here and only here. The word "manifest" leaves the UI; it survives as the file-format term in docs and code.
- **Part: Colors & Type** — the current theme-layer manager, disclosed inside the root per the editor's component conventions (labeled groups, progressive disclosure, permanent before impermanent). Keeps its layer files, Save/Load with preview (unit 9), and Adopt. Its Load list drops shipped presets; user layer files stay.
- **Part: Components** — a summary, not a third manager: how many components sit off the active look's config, linking into the per-component editors where the in-situ file managers remain untouched.
- Part-level Adopt auto-patching the root (`patchActiveManifest`) is the hierarchy's consistency rule: editing a part updates the whole, as with a component's parts.
- Rides along: move `manifestPreview.ts` to `core/preview/lookPreview.ts` (naming debt flagged in the unit-9 review; two import sites).

Unit 10, one commit: panel restructure + vocabulary sweep (help popovers, dialog titles, delete confirms), preset filtering in the layer list, the rename, tests for the list filtering, svelte-check clean. Server, formats, CLIs, migrations: untouched.

### Addendum 5, as executed (2026-08-13)

Shipped in unit 10 plus a review-fix commit. The root Theme panel lives at the foot of the sidebar, not the top: review ruled the plan text wrong, not the code — the layer manager already lived in the footer, nothing vacated the top, and the hierarchy intent is carried by nesting (root identity above indented parts, pinned by margin-top auto) rather than vertical position. Blocker fixed: the Components count special-cases the Default look (the one full-set, non-delta manifest), counting only customised components against it; the general disagreement rule stands for every delta look.

Carried into unit 11: Adopt and the production out-of-sync signal sit two clicks deep behind the collapsed part; server error strings still say "manifest" on reachable paths; a customised local shadow of a preset theme becomes unreachable from the filtered layer list (needs an isPackage marker on the themes list); the count's refresh misses clean component Loads; two stale user-guide passages predate the wave; the ManifestFileManager/ThemeFileManager file names invert the hierarchy (deferred rename, public export touched).

## Addendum 6: one artifact for the user (decided 2026-08-13)

Mark's verdict on the exposed layer: "I'm not convinced there's a necessity to separate spacing from color when it comes to theme. At least for the user." The internal layering stays (it is what keeps the color and shape generators composable); the layer stops being a user-facing artifact.

- **One save/load surface.** The Theme panel is the only manager: Save captures everything, Load previews and applies everything, presets live there. The Colors & Type FILE MANAGER (save/save-as/load list inside the disclosure) is removed from the UI.
- **The disclosure becomes status, and keeps the ship signal.** The Colors & Type part shows read-only identity (palette name, font pairing) plus the production out-of-sync state and the Adopt action that unit 10's review flagged as buried (finding 2): Adopt is the one operation that must survive at part level, surfaced in the part summary or by auto-opening when out of sync. The Components part stays as the summary it is.
- **Partial application is an option, not an artifact.** The Load Theme dialog gains one toggle: "Colors and type only. Keep my shapes." Preview honors it live: the toggle switches the preview engine between manifestLook (whole look) and themeLook (colors and type over current shapes); Save with the toggle on commits via the layer path (PUT theme active + hydrate), Save with it off applies the manifest as today.
- **Layer-only files surface in the one list.** Existing colors-and-type files (my-theme) appear in the Load Theme list marked as colors-and-type entries; selecting one is implicitly the colors-only operation, since that is all such a file contains. No migration, no data change. This also resolves review finding 3's severity: a customised local shadow of a preset theme reappears in the unified list once theme files are listed there (mark package-vs-local with an isPackage flag on the themes list response, the follow-up the review named; a small server addition is in scope this time).
- Rides along from the unit-10 review: the four reachable server error strings that still say "manifest"; the count refresh missing clean component Loads; the two stale user-guide passages; the ManifestFileManager/ThemeFileManager file rename inverting the hierarchy (rename both to match the hierarchy now that their roles are final: LookPanel / a part component, public export updated).

Unit 11, one commit. Server scope this time: the isPackage list flag and the four error-string rewordings; nothing else. Formats, CLIs, migrations untouched.

### Addendum 6, as executed (2026-08-13)

**isPackage** is one boolean on each `GET /themes` row: the name resolves from the package dir and no distinct local file shadows it. `versionedFileResourceServer.isPackageFile` carries it. In the library repo the local dir IS the package dir, where path identity says nothing, so the review's blocker fix threads `packageOwnedNames` (the theme basenames from the package's own `files` listing) into the themes resource: shipped names read as package files, user files like `my-theme` read as local, and the library repo's editor lists the same layer rows a consumer's would. One flag covers both questions the UI asks, because a listed name resolves from somewhere: `isPackage: false` means a local file the user owns.

**Listing rules** (`core/themes/loadRows.ts`, pure, tested): every look becomes a row, local and package alike, protected flag carried; a colors and type file becomes a row only when `isPackage` is false. Row ids are namespaced `look:<slug>` / `layer:<slug>`, since Apply materialises a look's theme under the look's own name and the two kinds share a slug space. Looks first, then layers, each in server order. A local copy of a preset theme therefore appears (review finding 3), including the pristine copy Apply leaves behind, which reads as "Ocean, colors & type" under the Ocean look. Named as a consequence, not hidden: hiding it needs a content comparison against the package file, and the addendum asked for reachability.

**Toggle**: `isColorsOnly(row, toggle)` is pure and tested. A layer row forces colors-only and the checkbox renders checked and disabled with a title saying why, rather than vanishing: the user's own setting survives underneath and returns when they pick a look again. Toggling with a preview live repaints the selected row through the other engine from the payload already fetched. The checkbox is a `.ui-form-checkbox`, not `ui/Toggle.svelte`, which styles itself from APP tokens and would change color as the previewed theme changes.

**Save flows**: whole look is unchanged (Apply plus reload). Colors-only reverts the preview, writes the look's embedded theme to `themes/<look slug>.json` by value (`PUT /themes/:name`, the same materialisation Apply does for the theme half), sets it active and hydrates. The Default look skips the write: its layer is the package file already sitting under that name, and PUT would 403. A layer row skips it too, having nothing to materialise. Production is untouched either way, so a colors-only load leaves the part out of sync until Adopt.

**Structure**: `ManifestFileManager.svelte` → `ThemePanel.svelte` (the UI word), `ThemeFileManager.svelte` → `ColorsTypePart.svelte` (its role). The part survives as a component rather than dissolving: it holds the identity line (active colors and type name, font pairing from the store's fonts slice), the unsaved status with its discard arm, Adopt with its `ACTIVE_IS_PROTECTED` recovery, and the production card. The panel owns all the data it reads, so the collapsed summary reports "not in production" and the part auto-opens once per mount when it does. `/ui` exports `ThemePanel` and keeps `ThemeFileManager` as an alias at the same path, so the published import still resolves.

**Adopt lost its dialog.** The old flow opened the layer Save As when the protected default theme was dirty; with layer Save As gone, Adopt names the file itself (`my-colors`, stepping past anything on disk) exactly as the manifest recovery already named `my-theme`. One click, no naming ceremony for a file that is no longer an artifact.

**Left for review**: the Theme panel's Save still captures saved files only, and with the layer's Save gone, Adopt is the only path for unsaved colors and type to reach disk. The confirm now says so ("Adopt them first to include them"). Making Save flush the dirty layer first would close it; that is a behavior change the addendum does not call for.

Also in: the Components count now refreshes on a `componentActiveRevision` pulse that `ComponentFileManager` bumps whenever a component starts running a different config file (load, delete, save under a new name), the four reachable manifest error strings plus `respondUnreadableManifest`'s three speak theme vocabulary (codes unchanged), and the three stale user-guide passages are rewritten. `presetThemes.ts` and its test are retired: the flag does its job.

### Unit 11 review fixes (2026-08-13)

Blocker: `isPackageFile` degenerated in the library repo (local dir == package dir made every theme read as shipped, hiding all layer rows including `my-theme`); fixed by threading `packageOwnedNames` from the package's `files` listing, with unit and integration pins. Colors-only Save now confirms before replacing a user's saved colors-and-type file under the look's slug, naming the production consequence when that file is production; the earlier "production is untouched" claim was too strong and is corrected here: the PUT syncs production CSS when the written slug is the production theme, and the confirm is the gate. Restored the shipped-theme `files` cross-check the retired presetThemes test carried.

Known limitations, recorded: after a colors-only load the list still marks the look row active rather than the live layer row (the active-manifest pointer genuinely does not change; a truthful layer marker needs the active theme file surfaced in the panel, a follow-up); theme Save still captures saved files only, with Adopt as the sole flush for unsaved colors and type, and the confirm says so.

## Addendum 7: production belongs to the theme (decided 2026-08-13)

Mark's screenshot review of unit 11: "we still have bifurcation between the two in the UI. newly introduced even." The Colors & Type part kept a full second lifecycle: its own Editor/Production cards, its own Adopt, and its own file identities on screen (root says my-manifest_01, the part says Halloween, production says My Theme). Three names for one artifact.

- **Adopt moves to the root.** The root card carries the production state ("in production" / "out of sync") and one Adopt that ships the whole look: theme layer plus every component whose active config differs from production. One server door (a whole-look adopt endpoint on the active state) so it cannot land halfway; the existing per-slice adopt endpoints stay for the component editors' in-situ Adopt, which is the surviving granular control. The ACTIVE_IS_PROTECTED recovery (auto-fork when the active look is Default) moves with it.
- **The part loses its lifecycle and its file names.** Colors & Type reduces to a read-only identity line: the font pairing and nothing named after a file. No Editor card, no Production card, no layer Adopt, no discard arm (unsaved edits remain visible through the root Save confirm and the editor's own dirty affordances). If nothing disclosed remains, the disclosure collapses to a plain row beside the Components count.
- **Out-of-sync is whole-look**: theme production differs from active, or any component's production differs from its active. Computed where the root renders, from data the panel already fetches plus the components list.
- Copy sweep: nothing in the panel may print a theme-layer or production file name; the root identity is the only name.

Unit 12, one commit. Server scope: the one whole-look adopt endpoint (composing existing setProduction + sync + patchActiveManifest machinery, honoring ACTIVE_IS_PROTECTED). Formats, CLIs, migrations untouched.

### Addendum 7, as executed (2026-08-13)

**The door** is `PUT /api/live-tokens/production`, the root peer of `/themes/production` and `/component-configs/:comp/production`: no body, because it promotes the state the server already holds. It answers `{ ok, promoted, theme: { fileName, name } | null, components: string[] }`, where `promoted` is false exactly when nothing moved. The 409 `ACTIVE_IS_PROTECTED` check runs before any write, in the theme vocabulary the unit-11 sweep established.

**Atomicity** is one pointer pass, then one `regenerateTokensCss()`, then one manifest write. `syncTokensToCss` and `syncComponentsToCss` are both that same rebuild, so per-slice calls would have written the generated file once per component; `syncFontsToCss` runs only when the theme half moved, since fonts.css tracks the production theme alone. `patchActiveManifest` now takes a list of slices and does one read and one write for all of them, with the two existing call sites passing a single-element list. Three tests pin it: one generated-CSS write, one `look.json` write, and zero writes of any kind when production already runs the look.

**The active look re-embeds every slice, not just the promoted ones.** A slice can be in production and still embed an older copy of its file (saving a config that is already production syncs the CSS but patches no manifest), and a whole-look adopt has no reason to leave that behind. The visible consequence, pinned by test: a look that carries a config for a component now running the default loses that entry, because production is running the default and the look records what shipped.

**The panel** carries the state line ("in production" / "out of sync") under the active name and the green Adopt below it, disabled and muted when in sync. Out-of-sync is `lookProductionState` (pure, tested, in `core/manifests/lookSummary.ts`): the theme's active file against the production theme, plus every component whose active config is not its production one. A null production theme reads as in sync, so a mount does not flash the alarm before the fetch lands. The recovery is the unit-11 one moved up a level: 409 → `saveAsManifest(freshName('my-theme', taken), 'My Theme')` → retry once.

**ColorsTypePart is deleted.** With no Editor card, no Production card, no Adopt and no discard arm, only the font pairing was left, so the disclosure collapses to a static row beside Components and the component has nothing to be. The auto-open machinery, the slide transition and the chevron styles go with it; `/ui` still exports `ThemePanel` under both names.

**Unsaved edits stay out, and now have nowhere to go.** Adopt promotes what is saved and the confirm says so before it runs. The unit-11 note recorded Adopt as the only path for unsaved colors and type to reach disk; that path is gone with the layer flush, so the Save confirm's "Adopt them first to include them" was a false instruction and is removed. Unsaved colors and type now live only in the editor's own browser state. Flagged for review, not resolved here: closing it means either Save flushing the dirty layer or Adopt doing it, both behavior changes this addendum does not call for.

### Unit 12 review fixes (2026-08-13)

**Blocker: the token layer got its write path back, and Save and Adopt changed meaning with it.** `persistTheme` had no callers after unit 11, so color, type and spacing edits could only reach localStorage and `$dirty` latched forever. Save, Save As and Adopt now flush the layer first (`flushLayer` → `persistTheme`), which writes the file, points active at it and clears dirty. Save and Adopt therefore mean the look on screen. The protected default cannot be written, so a dirty flush over it forks to `my-colors` (stepping past anything on disk) with active following the fork: the recovery ColorsTypePart carried before unit 12, moved up. `layerFlushTarget` and `freshName` are pure in `core/themes/layerFlush.ts`. Save As is in the flush set beyond the review's letter: narrowing the confirm without flushing there would have made Save As drop colors and type silently. The two confirms now fire on unsaved COMPONENT edits alone, naming how many and where to save them, since that is the only state a capture still leaves behind. Known limit, unchanged: Adopt is disabled while every pointer agrees, so edits made on a layer file that is already production do not ship through Adopt — the flush's PUT syncs the production CSS itself in that case (`handleThemeByName`), which is how they land.

**Adopt no longer deletes look entries for slices that did not move.** `handleAdoptLook` patched every component into the active look, so a look carrying a config for a component sitting on its default lost that entry to an unrelated adopt. Only promoted slices are patched now (theme when `themePromoted`, `promotedComponents` alone); the stale-content refresh survives for exactly those. The unit-12 pin that asserted the deletion is inverted, and the untouched-component scenario has a test of its own.

**A null production theme is its own state.** `lookProductionState` gains `unknown`, and `inProduction` is false while it holds, so an unread production can no longer read as permanently shipped. The panel renders unknown neutrally (no green, no claim) and leaves Adopt enabled, so clicking resolves the state through the pulse refresh; `refreshProduction` retries once after 3s on a failed read, its exit from a state nothing else re-asks about.

**The 409 recovery is bounded.** `runAdopt` takes a depth capped at one fork: a second `ACTIVE_IS_PROTECTED` surfaces as an error. `adoptStatus` holds at `adopting` across the fork (the premature `idle` reset is gone), so the re-entry guard covers the whole flow.

`ThemePanel.test.ts` drives the panel against a fake server for the orderings that span services (layer write before capture, flush before ship, one fork per Adopt, the unknown state's neutral render); `layerFlush.test.ts` and `themeService.test.ts` cover the pure parts and `markSaved` reachability.

### Unit 12 re-review fixes (2026-08-13)

Re-review of `2f7c73c` returned PASS with six findings. Five are fixed here; the sixth is recorded under Known deferred items.

**The theme layer gets its own dirty signal.** `flushLayer` gated on the global `$dirty`, which is a history-depth comparison, and every component mutation pushes history — so component-only work triggered a layer write: a rewrite of an identical file on a saved look, and on the protected Default a fork of `my-colors` nobody asked for, which Adopt then moved the production pointer onto. `themeDirty` is the components slice's baseline mechanism at theme scope: `themeContent(state)` — what a save writes, minus the name and the timestamps — serialized at every read (`loadFromFile`) and every write (`persistTheme`), compared against live state. Component-dirty and layer-dirty are separate signals from here on; `$dirty` keeps its other job, the discard confirms.

**Three smaller ones.** The 3s production retry holds its handle and clears it in `onDestroy`, so an unmounted panel can no longer write the module-level production store (it was also leaving a live timer behind in the tests). `handleAdoptLook`'s comment no longer claims a refresh for already-current pointers, which the promoted-slices-only fix ended. New tests cover the narrowed confirm's count and copy, Save As flushing the dirty layer, and the two component-only pins above (no `PUT /themes/*` on Save, no fork on Default).

## Resume point (2026-08-13, session handoff)

Branch `manifest-encapsulation`, stacked on `shape-space-adjust`; all units through 11 review-PASSED with fixes in. Unit 12 (root-level Adopt, commit 1f22f35) FAILED review; an Opus fix wave was in flight at handoff and commits on its own when green. The user's editor session left 4 modified data files (tokens.generated.css, three _active/_production pointers) + ~77 untracked demo configs in the tree: leave all of them alone, never `git add -A`.

### The four unit-12 findings the fix wave addresses

1. BLOCKER: `persistTheme` had zero callers — color/type edits could not reach a file, `$dirty` latched forever, confirms instructed a nonexistent "save first". Fix: ThemePanel's Save and Adopt flush the dirty token layer via persistTheme first (auto-fork `my-colors` / "My Colors" when the protected default is active), confirms narrowed to unsaved COMPONENT edits only, themes-workflow.md + CHANGELOG accuracy pass.
2. HIGH: adopt re-embedded every slice, deleting look entries for components on default even when unmoved (only-copy loss). Fix: patch only promoted slices; the "button entry survives" case becomes the pinned test.
3. MEDIUM: null production read as permanently "in production" with Adopt disabled (false calm, no exit). Fix: `unknown` state in lookProductionState, neutral render, Adopt enabled, a retry path.
4. LOW: 409 recovery unbounded + double-fire window. Fix: depth cap 1, hold 'adopting' through the fork.

### Next steps, in order

1. DONE at handoff: the fix commit is `2f7c73c` on top of this section's commit, all four findings addressed, gates green (3340 tests, 0 check errors, docs current). Notable semantics it adds: Save, Save As and Adopt all flush dirty token-layer edits via `persistTheme` first (fork to `my-colors` / "My Colors" on the protected default; new pure module `layerFlush.ts`); confirms fire only for unsaved component edits; adopt patches promoted slices only; `LookProductionState.unknown` renders neutral with Adopt enabled plus a 3s retry; 409 recovery caps at one fork. Known limit recorded by the fix: colors edited on a layer file that is already production do not ship via Adopt (Adopt disables when pointers agree) — they reach production through the PUT-syncs-production path instead.
2. DONE: re-review of `2f7c73c` returned PASS with six findings; five are fixed in the commit above ("Unit 12 re-review fixes"), the sixth is a nit recorded under Known deferred items. Unit 12 is closed.
3. Verify the CHANGELOG Unreleased bullets ("One Theme panel", "Adopt ships the whole look", "Loading is preview first") match post-fix semantics.
4. Hand the user the browser checklist below — units 8-12 are UI; the checklist is the acceptance test.
5. Then the branch is merge-ready: `shape-space-adjust` first or `manifest-encapsulation` directly (contains both).

### Browser checklist (post-fix)

1. Root card: Active name, production state line, green Adopt, Save/Save As/Load/Import; no file name anywhere below the root identity.
2. Colors & Type and Components render as plain static rows (no chevron/disclosure); Components "Open" pill switches views.
3. Edit a color, click Save: the edit reaches the theme file on disk (new semantics), $dirty clears, no false "unsaved changes" confirm afterward.
4. Drift one component, Adopt: line flips out-of-sync naming it, one click ships it, tokens.generated.css regenerates once, both _production pointers move.
5. On the Default look with edits, Adopt: silent fork to ONE new "My Colors"/"My Theme" file, promotion completes, no dialog, no second fork.
6. Look-content survival: a look carrying a config for a component now on default keeps that entry after adopting an unrelated change.
7. Kill/restart the dev server under the open editor: production state must not sit on a permanent false "in production" with Adopt disabled.
8. Load window: preview looks with the window open, Cancel restores exactly (unsaved edits included), "Colors and type only" toggle repaints mid-preview, colors-and-type rows force the toggle, replace-confirm fires before overwriting a tuned shadow.
9. /live-tokens/components hosts the same panel, Open pill suppressed.

### Known deferred items (recorded, not owed now)

Corrupt-manifest count not surfaced in list UI (needs a server field); look row stays marked active after a colors-only load (needs active theme file surfaced); `handleSetProductionTheme`'s unreachable "Active manifest is protected" string; RELEASING.md Stat.svelte ghost was fixed; release-time: retitle CHANGELOG Unreleased, re-run generate:preset-manifests after any theme migration.

Adopt limits, both from the promoted-slices-only fix: Adopt stays disabled while every pointer agrees, so colors edited on a layer file that is already production ship through the flush's PUT instead; and a slice whose pointer already agrees but whose file content changed since the look was saved keeps a stale embedded copy after Adopt, since only promoted slices are re-embedded. Save refreshes both. The trade is deliberate — re-embedding everything is what deleted a look's only copy of a config.

Display names can collide in the Load list: `layerFlushTarget` always labels its fork "My Colors" while the file name steps past what is on disk (`my-colors_01`), so two rows can read the same. Same shape as the `my-theme` recovery fork, and pre-existing there.
