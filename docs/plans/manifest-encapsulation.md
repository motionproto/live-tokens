# Encapsulated manifests

Status: DECIDED 2026-08-13 ("the design holds"), ready to implement. Open questions resolved per their recommendations: theme embeds by value; Apply keeps setting production; the demo look manifests are throwaway, regenerated as v2.

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
2. **Default regeneration + full deletability.** `ensureManifestsDir` materializes the full-set Default manifest (package default theme + derived default configs, drift-aware like `generateDefaultConfig`); theme DELETE loses the production guard and gains production self-heal (pointer → default + syncs, mirroring the config DELETE handler); active-manifest deletion allowed with `_active` self-heal to default. Package/default 403s stay. Tests.
3. **Client + tooling.** `manifestService` snapshot functions build by-value manifests; `ManifestFileManager` drops the active-manifest delete guard, help copy rewritten for encapsulation; `ThemeFileManager` `canDelete` loses the production-theme exclusion; `scripts/collapse-manifest-to-default.mjs` rewritten to read embedded data. svelte-check green.
4. **Data + docs.** Repo's `manifests/default.json` regenerated (stat entry gone); `my-manifest` restored per decision 5; demo look manifests regenerated as v2; README manifest model copy updated; cross-reference from `docs/plans/shape-space-skill.md`.
