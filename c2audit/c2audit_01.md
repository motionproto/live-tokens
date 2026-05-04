# C2 Audit Report — 01

**Date:** 2026-05-03
**Branch:** `main` (working tree clean at audit time; HEAD `9670db4 linkage`)
**Scope:** full codebase — pre-architecture-lock review
**Files reviewed:** 35 (state core, scaffolding, theme/plugin, overlay, pages, palette derivation, representative editors + components, both test files)
**Findings:** 3 critical, 12 major, 13 minor, 4 nits
**Scope tags:** ~14 [local], ~18 [cross-cutting]

---

## Handoff context (for the next task to pick up)

### Why this audit was run
The user is about to lock in the architecture. Before that happens they want a structured review of design-quality issues across the whole codebase, then to use the report as the basis for an architectural review and a sweep of fixes. Goal is to avoid letting structural debt compound any further — the codebase is at the size where the next round of decisions (component config files, scoped undo, schema-driven token registry) calcify into shapes that are very hard to undo later.

### How the report is organised
- Severity-first ordering (Critical → Major → Minor → Nits → Project conventions → Clean). The document's organising axis is severity, not workflow status.
- Every finding has `[local]` or `[cross-cutting]` immediately after the title. As work lands, append `[done]`, `[skipped]`, `[partial]`, or `[deferred]` after the scope tag. Do not move findings out of their position when they're resolved — `grep '\[done\]'` produces the shipped list; `grep -v -e '\[done\]' -e '\[skipped\]'` produces what's outstanding.
- Add a one-line `**Resolution (YYYY-MM-DD):** <what shipped, what's deferred>` immediately under the touched bullet block when work lands.

### How to read the C2 vocabulary
Each finding names the C2 / Fowler smell or principle it falls under (Primitive Obsession, Shotgun Surgery, Once And Only Once, Lava Flow, etc.). That's the value of this audit over a generic review — the named concepts have well-understood costs and remedies, so the next agent can pattern-match rather than re-deriving.

### Recommended approach for the architectural review pass
The three Criticals (C1, C2, C3) are the load-bearing decisions. **Do C3 first.** It is the smallest concrete change with the largest downstream effect: distinguishing "CSS variable alias" from "component config" in the slice shape unblocks Dialog's button-variant problem (per memory: `feedback_state_model.md` and `project_component_alias_editing.md`) and prevents on-disk component files from accumulating mixed-shape entries that later need their own migration.

After C3, **C2 (single component registry) before C1 (editorStore split)** — because C2 is mechanically easier and creates the canonical "list of components" that C1's per-domain slices can register into.

The Major findings cluster: M1+M2 are about the parallel theme/component plumbing and can be fixed in one pass. M3 needs a `schemaVersion` decision before any theme-format change. M4+M9+M10 are independent and parallelisable. M6 needs a judgment call from the user before touching code (do all three history regimes reduce to one?). M7+M8 are pre-conditions for using the library outside the dev-server harness.

### Critical things to know before touching code
- **Memory: Iframe CSS var fan-out constraint** — writes must hit both self and parent `:root` via `cssVarSync`. Any state architecture must preserve this. `src/lib/cssVarSync.ts` is the canonical path.
- **Memory: Mirror theme-file lifecycle for new editor artifacts** — new editable classes get their own named-files + active/production + backups + file-manager UI. M2's parameterised `versionedFileResource` should preserve this contract; don't sidecar new artifacts into theme JSON.
- **Memory: Sharing is dev-declared, not user-editable** — `canBeShared` / `groupKey` / sibling sets are authored by the component dev. C2's "single component registry" should make this more explicit, not less.
- **Memory: Component vs interaction state model** — components have component states (default/selected/disabled, mutually exclusive) and interaction states (default/hover, in selects). Disabled is terminal; selected-disabled is impossible. Worth checking that any state-machine refactor preserves these invariants — segmentedcontrol's migration code in editorStore.ts:982 already encodes one earlier round.
- **Memory: Parts are not states** — Dialog's overlay/header/body/footer are structural parts. The DialogEditor's `frameStates` keys these as states; that's intentional UI sugar, but if a state-machine type is introduced, parts and states should be different types.
- **Memory: Treat uncommitted work as the only copy** + **Don't stash to isolate verification runs** — the user is sensitive to destructive git ops. Don't `stash drop` / `reset` / `checkout --` without explicit confirmation. For "let me run tests on the base tree," use a worktree.

### Tests as guardrails
- `src/lib/editorStore.test.ts` (332 lines) — exercises the three history regimes (mutate, transaction, palette session) and their cross-regime edges. **If you touch the history machine, these must keep passing.**
- `src/lib/componentConfig.test.ts` (105 lines) — covers per-component dirty tracking and seed-from-API. Keep it green when restructuring slices.
- `src/component-editor/editorTokens.test.ts` exists — verify what it covers before any token refactor.
- `src/ui/PaletteEditor.test.ts` exists — verify before touching paletteDerivation.

### What was checked and came back clean
- Type definitions in `editorTypes.ts` and `themeTypes.ts` are tight.
- `paletteDerivation.ts`, `oklch.ts`, `curveEngine.ts`, `cssVarSync.ts`, `editorContext.ts` are cohesive single-purpose modules.
- LSP / Composition / ISP are not problem areas.
- No race hazards observed.
- Most comments do say WHY (the editor philosophy is well-narrated). The "Phase 1/2" markers and "// NEW:" stragglers are the exception.

---

## Summary

Design health is solid in the small (pure modules — `paletteDerivation`, `oklch`, `cssVarSync`, `editorContext`, the test suites — are clean and cohesive) but accumulating structural debt in the large. The two themes that dominate findings: (1) **the canonical "list of components" lives in 5+ places** (defaultSections, componentSources, ComponentEditorPage's nav items, each editor's `registerComponentSchema`, and the server's filesystem scan) and adding a component is now Shotgun Surgery; (2) **the alias map is being overloaded** as both a CSS-variable indirection table and a stringly-typed component-config bucket (Dialog button variants, Button shimmer flag), which is the highest-risk decision to lock in as-is. The 1313-line `editorStore.ts` and 1136-line `themeFileApi.ts` are reaching the size where their internal seams need to be made explicit before they ossify. The component-editor scaffolding is split unevenly: `StandardButtonsEditor` shows the right derived pattern, while `SegmentedControlEditor` still hand-lists 16 typography tokens — the codebase already knows how to reduce this boilerplate, the regression is in some editors not having caught up.

## Critical

### C1. Editor store has accreted ~10 unrelated concerns into one 1313-line module — God Class `[cross-cutting]`
- **Where:** `src/lib/editorStore.ts:1` (whole file)
- **What:** One module owns: state shape & defaults, history (undo/redo/transaction), palette edit sessions, slider gesture wiring, font / palette / shadow / overlay / column / gradient / component slices, schema registry, sibling/sharing logic, three independent migration tables (`COMPONENT_PREFIX_RENAMES`, `COMPONENT_SUFFIX_RENAMES`, segmentedcontrol-specific block at 982–1027, `LEGACY_KEY_RENAMES`, `BG_TO_CANVAS_PREFIXES`), regex parsers for shadows + RGBA, debounced `localStorage` persistence, eager hydrate, and the DOM subscriber that writes `:root`. Module-load side effects (`ensureHydrated()` at 1267, `store.subscribe(...)` at 1303) make the import non-pure.
- **Why it matters:** Every domain change touches this file; the file is the natural fault line that tests and the in-flight refactor (per memory) are already pulling against. Once consumers depend on its current export surface — including the `__resetForTests` escape hatches that reach into module-private mutables — splitting later forces breaking changes everywhere.
- **Direction:** Before lock-in, partition into a state-core (writable + history machine + transaction primitives), per-domain slices (palettes/fonts/shadows/overlays/columns/components/gradients) registered into the core, a separate migration module that runs once on hydrate/load, and a renderer module that owns the `deriveCssVars → cssVarSync` subscriber. Don't pre-design the public API — let each tab's migration drive it.

### C2. The "list of components" is duplicated across 5+ shapes — Shotgun Surgery setup `[cross-cutting]`
- **Where:** `src/component-editor/scaffolding/defaultSections.ts:17` (id/label/component); `src/component-editor/scaffolding/componentSources.ts:1` (id → source filename); `src/pages/ComponentEditorPage.svelte:76` (id/label/icon for nav); each editor's top-level `registerComponentSchema(...)` call (e.g. `SegmentedControlEditor.svelte:115`); `src/vite-plugin/themeFileApi.ts:304` (server scans `src/components/*.svelte`).
- **What:** Adding a new component requires: creating the `.svelte` source, creating its editor, adding to `defaultSections`, adding to `componentSources` (else the "Source" link breaks silently), adding to `componentNavItems` (else it's missing from the rail), calling `registerComponentSchema` (else sibling lookups silently degrade to last-dash inference), and the server picks it up automatically — but only if its filename casing matches. Five canonical lists, three with silent-degradation failure modes.
- **Why it matters:** This is what Open/Closed exists to prevent. The three silent-degradation paths in particular mean a half-registered component looks like it works until a user tries to share/link tokens.
- **Direction:** One source of truth keyed by component id — either a single `components.ts` registry that exports the typed list and is consumed by every site, or `import.meta.glob` driving everything. Either way, validate at startup that the registered set matches what the server saw.
- [done] **Resolution (2026-05-04):** new `src/component-editor/registry.ts` is the single source of truth. Each entry binds the canonical lowercase id to `{ label, icon, sourceFile, editorComponent, schema }`. Editor token data hoisted into `<script context="module">` blocks across all 14 editors and exported as `allTokens`; registry imports each, calls `registerComponentSchema(id, schema)` once eagerly at module load (replaces 14 implicit-on-import side effects). `defaultSections.ts`, `componentSources.ts`, and `ComponentEditorPage.svelte`'s `componentNavItems` now derive from the registry. Boot-time `validateRegistryAgainstServerScan` compares the `/api/component-configs` server scan to the registry's id list — warns on either-direction drift. Adding a component is now: author the runtime `.svelte`, author its editor (with `<script context="module">` exports), add one registry entry. The five lists collapsed to one. Wave branch: `c2/wave-2-c2-component-registry`.

### C3. Component aliases overloaded as a stringly-typed config bucket — Primitive Obsession + Refused Bequest `[cross-cutting]`
- **Where:** `src/component-editor/DialogEditor.svelte:14` (`--dialog-confirm-variant: 'primary' | 'secondary' | …`); `src/component-editor/StandardButtonsEditor.svelte:11,14` (`--button-shimmer: '--shimmer-on' | '--shimmer-off'`); contract defined at `src/lib/editorTypes.ts:46` (`aliases: Record<string, string>`).
- **What:** The slice's `aliases` map is documented as "component-token → semantic-token" (editorStore.ts:684) but is now also storing arbitrary string config (a Svelte prop value, a shimmer toggle). `componentsToVars` (editorStore.ts:774) wraps non-`--` values verbatim, producing a junk CSS declaration `--dialog-confirm-variant: primary;` that nothing consumes. Editors then `BUTTON_VARIANTS.includes(... as ButtonVariant)` to recover type safety after the fact.
- **Why it matters:** This is the architectural decision most worth getting right *before* lock-in. The current overload is invisible: nothing crashes, the editor works, but the type contract lies. As more editors need non-CSS config (per memory: alias-editing gap), the smell will spread. Once on-disk component config files start carrying these mixed entries, splitting them out is a migration tax.
- **Direction:** Distinguish "CSS variable alias" from "component config" in the slice shape — e.g. `{ aliases: Record<string, CssVarRef>, config: Record<string, unknown> }`. CssVarRef can be a branded string or `{ kind: 'token'; name: string } | { kind: 'literal'; value: string }`, which also lets you delete the `semanticName.startsWith('--')` test on editorStore.ts:778.
- [done] **Resolution (2026-05-04):** split `ComponentSlice.aliases` into `{ aliases: Record<string, CssVarRef>, config: Record<string, unknown> }`. `CssVarRef` is a `{kind:'token',name}|{kind:'literal',value}` discriminated union; `componentsToVars` dispatches on kind and the `startsWith('--')` heuristic is gone. New `setComponentConfig`/`clearComponentConfig` APIs; `DialogEditor` (confirm/cancel variants) and runtime `Dialog.svelte` migrated to `.config`. Per-component dirty baseline now stringifies both buckets. Transient on-load migration `splitAliasesAndConfig` keyed off `KNOWN_COMPONENT_CONFIG_KEYS` reroutes legacy single-bucket entries; TODO marker for Wave 4 (M3 schemaVersion) to absorb. Disk shape extended with optional `config` field for round-trip; legacy disk files load cleanly via the migration. **Note:** `--button-shimmer` was initially classified as config in the audit's example list, but it's actually a real CSS-var alias (Button.svelte uses `display: var(--button-shimmer)` and tokens.css declares `--shimmer-on: block` / `--shimmer-off: none`); it stays in the aliases bucket so the CSS cascade keeps resolving. The "config = literal-valued knobs consumed by JS readers" rule now turns on whether the consumer reads via `var(...)` cascade or `$editorState`. Wave branch: `c2/wave-1-c3-alias-config`.

## Major

### M1. `themeFileApi.ts` is one 600-line route table with cargo-cult try/catch per route `[cross-cutting]`
- **Where:** `src/vite-plugin/themeFileApi.ts:524–1122` (single `server.middlewares.use(async (req, res, next) => {...})` lambda)
- **What:** ~14 inline `if (url === X && req.method === Y) { try { ... jsonResponse(200, ...) } catch (err: any) { jsonResponse(500, { error: err.message }) } return; }` blocks. Order is load-bearing (`COMP_ACTIVE_REGEX` must run before `COMP_BY_NAME_REGEX` per the comment on line 836). Every route reimplements the same shape.
- **Why it matters:** Long Method + Sequential Coupling — every new endpoint adds a copy and risks changing the order of an existing one. `try { ... } catch (err: any)` indiscriminately turns every internal error into a 500 with `err.message` exposed.
- **Direction:** Extract a `route(method, pattern, handler)` table that runs once per request; let handlers throw and centralise the 500. The order-sensitive `active`/`production` vs `:name` routes become explicit table ordering, not a comment-warning.
- [done] **Resolution (2026-05-04):** Extracted `dispatch(req, res, routes)` into `src/vite-plugin/files/routeTable.ts`; each handler is now a top-level function that may throw, with the 500-on-throw catch centralised. Route ordering (active/production before `:name`) is explicit table position. Removed all 14 per-route try/catch blocks.

### M2. Theme service / component-config service / theme-plugin / component-plugin are parallel hierarchies `[cross-cutting]`
- **Where:** `src/lib/themeService.ts:1` ↔ `src/lib/componentConfigService.ts:1`; `src/vite-plugin/themeFileApi.ts:99,108,61,80` (theme helpers) ↔ `:390,401,373` (component helpers).
- **What:** Identical CRUD shape on both sides — list/load/save/delete + active/production + backups — implemented twice. Server-side: `getActiveFileName/getProductionFileName` mirror `getComponentActiveFileName/getComponentProductionFileName`; `backupThemeFile` mirrors `backupComponentConfigFile` (both with hardcoded `.slice(10)` retention, line 75 and 385).
- **Why it matters:** Adding a third resource type (per memory: new editable classes get full file-manager lifecycles) doubles the work again. Each code path drifts independently — e.g. theme backup keeps 10, component backup keeps 10 because someone copied carefully, but a future tweak to one won't propagate.
- **Direction:** Parameterised `versionedFileResource(dir, options)` that yields the active+production+backup helpers — both client API helpers and server filesystem helpers can be generated this way. The 10-backup retention becomes a single `BACKUP_RETENTION` constant.
- [done] **Resolution (2026-05-04):** Added `src/lib/files/versionedFileResource.ts` (client REST shape) and `src/vite-plugin/files/versionedFileResource.ts` (server fs shape, exporting `BACKUP_RETENTION = 10`). Both `themeService` and `componentConfigService` now consume the client helper; the dev-server plugin builds one resource per directory via `versionedFileResourceServer({dir})`. Theme-file lifecycle (active+production+backups) preserved.

### M3. Migration tables in `editorStore.ts` accumulate without being dropped — Lava Flow risk `[cross-cutting]` [done]
- **Where:** `src/lib/editorStore.ts:960–997` (4 separate prefix/suffix/segmentedcontrol-specific tables), `:1086–1107` (legacy theme key renames + bg→canvas), `:982` (segmentedcontrol option-disabled migration).
- **What:** Each table carries an explicit "drop these once all on-disk … resaved" comment. None has been dropped. The bookkeeping for *when* to drop relies on the user remembering — there is no lifecycle.
- **Why it matters:** Migrations are correct now; they will silently make non-migration loads slower forever. More importantly, every future rename will pile on. The pattern lacks a TTL or a "migration version" stamp on the file that would let load drop migrations after a known-good upgrade.
- **Direction:** Stamp a `schemaVersion` on saved theme/config files; run only the migrations between the file's stamp and current. Move the tables out of editorStore into a `migrations/` folder where each is dated, since they're effectively dead code after one cycle.
- **Resolution (2026-05-04):** Added `Theme.schemaVersion` / `ComponentConfig.schemaVersion` (optional, absence = 0). Extracted three dated migration files under `src/lib/migrations/`: `2026-04-24-legacy-keys-and-bg-to-canvas.ts` (theme), `2026-04-24-component-prefix-and-suffix-renames.ts` (component-config), `2026-04-27-segmentedcontrol-disabled-flatten.ts` (component-config). Theme and component-config have independent version sequences; runner filters by `appliesTo` + `fromVersion >= file.schemaVersion`. `loadFromFile` / `loadComponentActive` / `seedComponentsFromApi` now route through `runMigrations`; `toTheme` / `persist` stamp `CURRENT_*_SCHEMA_VERSION` on save. New test file `src/lib/migrations/migrations.test.ts` (7 cases) covers legacy-up-to-current, gating by stamp, identity at current, and purity. Future renames add a new dated file and bump no longer require editing `editorStore.ts`. (Wave 4 commit, branch `c2/wave-4-m3-schema-version`.)

### M4. `TokenLayout.svelte` dispatches selectors via 13 `endsWith('-x')` predicates and 13 markup branches `[cross-cutting]`
- **Where:** `src/component-editor/scaffolding/TokenLayout.svelte:53–152` (predicates + categorize), `:228–286` (markup dispatch).
- **What:** Each selector kind has an `is*(v)` predicate parsing the variable suffix, a branch in `categorize`, and a near-identical 6-prop `<UI*Selector ... on:change={() => handleRowChange(token)} />` line in markup. Adding a kind is Shotgun Surgery on this one file.
- **Why it matters:** The kind isn't carried in the token type — it's recovered by parsing the variable name (Stringly Typed). Suffix collisions can mis-categorise silently. The 6-prop forwarding boilerplate also makes prop changes painful.
- **Direction:** Carry `kind` (or `selector: ComponentType`) on the token type, register `Record<Kind, Selector>` once, and replace the if/else tree with `<svelte:component this={selectorFor(token.kind)} {...sharedProps} />`. `isPaddingSplit`'s DOM scrape (line 193) goes away when component is the only source.
  - [done] **Resolution (2026-05-04):** 13 `is*` predicates collapsed into a single `KIND_PATTERNS` table; markup if/else tree collapsed into one `<svelte:component this={SELECTOR_REGISTRY[kind].component} {...sharedProps} {...extra} />` dispatch. Padding-split is now a first-class kind (`'padding-split'`) detected in `categorize` rather than a DOM-scrape branch in markup; `paddingIsSplit` still runs once during categorization but no longer affects the rendering tree. Editors untouched — `kind` is derived per render from the variable name (no Token-type widening). Tests 18 → 18.

### M5. `VariantGroup.svelte` duplicates the type-group + token-layout block for tabs vs list mode `[local]`
- **Where:** `src/component-editor/scaffolding/VariantGroup.svelte:170–202` (tabs branch) and `:235–272` (list branch).
- **What:** Two identical `<TokenLayout>` + `<TypeEditor>` rendering blocks differing only in surrounding chrome. Adding a per-state control means editing both branches.
- **Direction:** Extract a `<StateBlock>` sub-component (or a snippet/named slot) and call it from each branch. Keep the chrome differences in the branches.
- [done] **Resolution (2026-05-04):** New `src/component-editor/scaffolding/StateBlock.svelte` owns the shared inner block (`<TypeEditor>` row over `<TokenLayout>`) plus its scoped styles. Both VariantGroup branches now call `<StateBlock tokens typeGroups component sharedOrder on:change />` while keeping their own chrome (tabs strip + Preview slot vs per-state collapse header + state-section). The `.state-controls` / `.state-type-groups` CSS rules and their `:global` descendant rules moved into StateBlock; the chrome-only styles (`.state-section`, `.state-header`, `.tabs-preview`, etc.) stayed in VariantGroup. Tests 18 → 18.

### M6. Three coexisting history regimes — judgment call to settle before lock-in `[cross-cutting]`
- **Where:** `src/lib/editorStore.ts:391` (`mutate`), `:412/428/443/469` (transactions), `:508/521/554` (palette sessions). Tests at `src/lib/editorStore.test.ts:117–278` work hard to verify cross-regime semantics.
- **What:** `mutate` pushes one entry; `transaction` collapses many into one; `paletteSession` collapses across multiple transactions and clips undo to a session floor. Each was a real product need but the result is three concepts with overlapping purposes (commit, abort, cancel, "no change → no entry") implemented per-regime.
- **Why it matters:** Test names ("undo() with a pending transaction aborts it first") show that cross-regime edges are subtle. New edit modes (e.g. component-file edits per memory's alias gap) will plausibly want a similar "scoped undo." Locking in three is harder to extend than locking in one composable abstraction.
- **Direction:** Consider whether all three reduce to "scoped undo with commit/cancel" — sessions = transactions whose floor is also clipped from undo. If yes, fold; if no, document the orthogonal axes so the next mode picks the right one.

### M7. Module-load side effects spread across the editor — Hidden Dependencies `[cross-cutting]` [done]
- **Where:** `src/lib/editorStore.ts:1267` (eager hydrate), `:1303` (DOM subscriber); `src/lib/cssVarSync.ts:26-27` (`selfRoot`, `parentRoot` cached at import); `src/lib/columnsOverlay.ts:16` (subscribe-then-persist on import); `src/lib/router.ts:10` (reads `window.location` at module load); `src/component-editor/SegmentedControlEditor.svelte:115` and every other editor's top-level `registerComponentSchema` call.
- **What:** Importing these modules has DOM/storage side effects — fine in browser dev, problematic for SSR, tests, or any harness that imports for type information.
- **Why it matters:** Compounding load-order constraints. `configureEditor({storagePrefix})` (M8) is a concrete victim of this — it has to be called before `editorStore` is imported anywhere, or `PERSIST_KEY` is already cached with the default `lt-` prefix.
- **Direction:** Ensure each module exports a deferred `init()` that the host calls (or that's idempotent). The editor-schema registration is the cleanest case — call it from a side-effect-free function that the editor page invokes once.
- **Resolution (2026-05-04):** Added idempotent `init()` to `cssVarSync`, `columnsOverlay`, `router`, and `editorStore`. Module-load side effects (DOM root resolution, storage subscribe-and-persist, `window.location` reads, eager hydrate, DOM subscriber) now fire only when the host opts in. `src/main.ts` is the single boot orchestration point that calls all four. `__resetForTests` and the existing test suites still work without `init()` because the store-level state machinery is decoupled from the DOM subscriber. Wave 2 still owns the 14 editor `.svelte` `registerComponentSchema` calls.

### M8. `configureEditor` storagePrefix is mutable global state with no enforced ordering `[local]` [done]
- **Where:** `src/lib/editorConfig.ts:1` (`let prefix = 'lt-'`); `src/lib/editorStore.ts:25` (`PERSIST_KEY = storageKey('editor-state')` at module load).
- **What:** Library consumers call `configureEditor({storagePrefix: 'my-app-'})` to namespace storage. But `editorStore.ts` resolves `PERSIST_KEY` at module-load — by the time `main.ts` calls `configureEditor`, anything else that imported `editorStore` has already locked in the default. The persist key is also a constant — there is no recompute.
- **Why it matters:** Two consumers of the library that boot-sequence differently get silently different storage keys.
- **Direction:** Resolve storage keys lazily (read `prefix` at use time, not at module load) — or accept the prefix as a `configureEditor` argument that explicitly initialises the store.
- **Resolution (2026-05-04):** `editorStore` now wraps the persist key in `getPersistKey()` (called per use, no memoisation) instead of a module-scope const. `columnsOverlay` likewise resolves its key per call. New `lazyConfig.test.ts` verifies that calling `configureEditor({storagePrefix: 'test-'})` after import is observed by `storageKey('editor-state')`.

### M9. `SegmentedControlEditor` hand-lists 16 typography tokens that `StandardButtonsEditor` derives by loop `[local]`
- **Where:** `src/component-editor/SegmentedControlEditor.svelte:96–139` (typeGroupTokens + shareableContexts spelled out 3-way for 4 states × 4 props); contrast `src/component-editor/StandardButtonsEditor.svelte:60–89` and `RadioButtonEditor.svelte:58–86` (derived from arrays via `flatMap`).
- **What:** The codebase already knows how to derive these (Button + Radio do); the older Segmented editor is the regression. Adding a fifth typography prop means editing three lists in lockstep — the very Shotgun-Surgery this scaffolding was meant to remove.
- **Direction:** Refactor SegmentedControlEditor to use the same derive-from-arrays pattern. Consider a small helper in the scaffolding (`buildTypeGroupTokens(states, props)`) that all three call — `siblingsFor` in StandardButtonsEditor:99 also reinvents `buildSiblings` from `siblings.ts:13`.
- [done] **Resolution (2026-05-04):** New `src/component-editor/scaffolding/buildTypeGroupTokens.ts` exports `buildTypeGroupTokens(typeGroups, options?)` and a companion `buildTypeGroupShareableContexts(typeGroups)` — both walk the existing `Record<string, TypeGroupConfig[]>` and emit the four font-prop tokens / shareable-context entries per group, so the per-state typography variables stay in lockstep with the `TypeGroupConfig` declarations. SegmentedControlEditor now derives its 16-token typeGroupTokens block and the typography half of `shareableContexts` via these helpers (was 16 hand-listed tokens × 3 fields + 16 hand-listed map entries). StandardButtonsEditor swapped its hand-listed `variantTypeGroupTokens(v)` for the same helper. `siblings.ts:13`'s `buildSiblings` was generalised to accept `variantStates: (v) => Record<string, Token[]>` (was `(v) => Token[]`); StandardButtonsEditor's reinvented `siblingsFor` is gone, replaced by the canonical helper. Badge / Notification / ProgressBar wrap their single-state builders inline (`(sv) => ({ [sv]: variantTokens(sv) })`). Token-name parity verified offline: original 16 SegmentedControl tokens and 6 × 4 Button tokens are identical (variable, label, groupKey, canBeShared, order). buildSiblings users 3→4 (StandardButtons added); reinvented helpers 1→0. Tests 18 → 18; svelte-check 0 errors.

### M10. `Notification.svelte` declares 16 tokens × 4 variants by copy-paste — Once And Only Once `[local]`
- **Where:** `src/components/Notification.svelte:108–183` (token block) and `:211–324` (per-variant SCSS rules).
- **What:** Four near-identical 16-line declaration groups, then four near-identical 25-line SCSS rule groups. The variant-name → token-prefix mapping is mechanical.
- **Direction:** A SCSS `@each $variant in (info, warning, danger, success)` loop can collapse the rules. The `:global(:root)` declarations could be one block referencing `--notification-{variant}-*` patterns once, since the per-variant CSS only differs by the variable prefix.
- [done] **Resolution (2026-05-04):** Per-variant SCSS rules (lines 211–324) collapsed from 4 × 26 lines to one `@each $variant in (info, warning, danger, success) { &.#{$variant} { … } }` block — these rules compile through SCSS so `#{$variant}` interpolation works as intended. The `:global(:root)` token block (lines 108–183) was investigated for the same treatment but **left flat by design**: the Layer-2 token-discovery parser (`extractGlobalRootBody` in `src/lib/parsers/globalRootBlock.ts`) reads the `.svelte` source verbatim and does NOT pre-compile SCSS, so wrapping the declarations in `@each` would make the editor's alias-picker / file-manager UI see zero tokens for Notification (verified: when this was tried, `component-configs/notification/default.json` regenerated with `aliases: {}`). The constraint is now documented inline in the file (lines 107–113) so the next refactor pass doesn't repeat the experiment. A future cross-cutting fix would be to teach `extractGlobalRootBody` to expand `@each` interpolations — that would make the `:global(:root)` block also collapsible to one variant — but that's a parser change with broader implications and out of scope here. Tests 18 → 18 failures (same baseline); svelte-check 0 errors.

### M11. Two regex parsers for `:global(:root)` blocks — `[cross-cutting]`
- **Where:** `src/lib/tokenRegistry.ts:45` (`extractGlobalRootBody`) and `src/vite-plugin/themeFileApi.ts:276` (`extractGlobalRootBodySsr`). Same regex, same "no nested braces" assumption.
- **What:** Browser and Node reimplementations because the plugin is Node-only. Acceptable today; flagging because if the assumption ever breaks (someone writes a media query inside a token block), both must change.
- **Direction:** Move to a shared TS file imported by both — Vite's tsup build already produces both formats. Or accept the duplication with a colocated comment that names both call sites.
- [done] **Resolution (2026-05-04):** Single canonical `extractGlobalRootBody` in `src/lib/parsers/globalRootBlock.ts`. `tokenRegistry.ts` imports + re-exports it; `themeFileApi.ts` imports it directly. Verified the tsup ESM+CJS plugin build bundles it cleanly.

### M12. `router.ts` hardcodes `lt-prev-route` instead of using `storageKey()` `[local]` [done]
- **Where:** `src/lib/router.ts:3` (`const PREV_KEY = 'lt-prev-route'`).
- **What:** A library consumer who calls `configureEditor({storagePrefix: 'my-app-'})` still gets `lt-prev-route` for this one key. Inconsistent with `editorStore`, `columnsOverlay`, `editorConfigStore`, and `LiveEditorOverlay` which all use `storageKey()`.
- **Direction:** Switch to `storageKey('prev-route')` — same caveat as M8 about resolution timing.
- **Resolution (2026-05-04):** `router.ts` now resolves the previous-route key via `storageKey('prev-route')` per call (lazy, same pattern as M8). `pages/Editor.svelte`'s "Back to site" lookup also switched from the literal `'lt-prev-route'` to `storageKey('prev-route')` so it stays in lockstep with the prefix.

## Minor

### m1. `sanitizeFileName` exists in two places `[cross-cutting]`
- `src/lib/themeService.ts:135` and `src/vite-plugin/themeFileApi.ts:132` — identical implementation. One should import from the other (Node imports the lib's pure helper, since it has no DOM dependencies).
- [done] **Resolution (2026-05-04):** Canonical pure helper now lives in `src/lib/files/versionedFileResource.ts`; `themeService.ts` re-exports it (preserving `import { sanitizeFileName } from '../lib/themeService'` call sites in the UI), and `themeFileApi.ts` imports the same source.

### m2. `(theme as any)._fileName` smuggling `[cross-cutting]`
- Server attaches `_fileName` to responses (`src/vite-plugin/themeFileApi.ts:562, 939, 1060`); clients access it via `as any` cast (`src/lib/themeInit.ts:33`). Add `_fileName?: string` to the `Theme`/`ComponentConfig` type or move it to a wrapping envelope.
- [done] **Resolution (2026-05-04):** Added `_fileName?: string` (server-set, optional) to both `Theme` and `ComponentConfig` in `src/lib/themeTypes.ts`; dropped the `as any` cast in `themeInit.ts`.

### m3. Repeated `setTimeout(() => (saveStatus = 'idle'), 2000)` `[local]`
- `src/component-editor/scaffolding/ComponentFileManager.svelte:147,151,201,205,252,255` — five copies of the same pattern. One `flashStatus(state)` helper.
- [done] **Resolution (2026-05-04):** Extracted `flashStatus(state)` for the saveStatus flash sites (4 setTimeouts in `handleSave`/`confirmSaveAs` collapsed) and a parallel `flashProductionStatus(state)` for the structurally identical productionUpdateStatus block in `handleUpdateProduction`. Two helpers because the status enums differ (`SaveStatus` vs `ProductionStatus`); both share the same 2s idle-revert timing. Tests 18 → 18.

### m4. Empty `try {} catch {}` blocks for "silent fallback" `[cross-cutting]`
- `src/lib/themeInit.ts:36, 54`; `ComponentFileManager.svelte:77, 86, 224, 242`; `LiveEditorOverlay.svelte:42, 47, 99, 112`; `editorStore.ts:1222, 1252`; `columnsOverlay.ts:9, 19`. The pattern is acceptable case-by-case (storage quota, missing endpoint), but the density invites Cargo Cult — a developer adding new code copies the empty catch without re-considering. A small `quietGet/quietSet` helper for storage and a single `safeFetch` for boot-time API calls would make the silence intentional.

### m5. `applyCssVariables` re-exported from both `cssVarSync` and `themeService` `[local]`
- `src/lib/themeService.ts:130-132` re-exports from `cssVarSync` "to preserve existing call sites." `src/lib/index.ts:9-15` exports the same trio directly from `cssVarSync`. Two import paths for the same function — pick one, delete the other (Boat Anchor).

### m6. `Token` type redeclared inline `[local]`
- `src/component-editor/scaffolding/TokenLayout.svelte:21` reproduces the type exactly from `src/component-editor/scaffolding/types.ts:2`. Import the canonical type. Same pattern in `sharedBlock.ts:7` (`SharedToken` is `Token` plus optional fields — can `extend`).
- [done] **Resolution (2026-05-04):** TokenLayout now `import type { Token } from './types'` (inline type dropped). `SharedToken` in `sharedBlock.ts` is now `interface SharedToken extends Token { mergeVariables?: string[] }` — base fields inherited, only the shared-block-specific addition stays local.

### m7. `SCALE_SHADOW_VARIABLES` (Set) duplicates `SHADOW_VAR_NAMES` (tuple) `[local]`
- `src/lib/editorStore.ts:238` defines the tuple, `:275` defines the Set with the same five literals. Derive one from the other.

### m8. `void _state` reactivity hack in `sharedBlock.ts` `[local]`
- `src/component-editor/scaffolding/sharedBlock.ts:44, 46` — accept `EditorState` only to force a Svelte reactive re-run, then immediately `void _state`. API smell. Make `computeSharedBlock` callable without state (it reads via `getComponentPropertySiblings(...)` which already calls `get(store)`); callers that need reactivity can do `$: shared = computeSharedBlock(...); void $editorState;` at the call site.
- [done] **Resolution (2026-05-04):** Dropped the `_state: EditorState` parameter from `computeSharedBlock` (and the `EditorState` import); jsdoc now documents that callers own reactivity. All 11 callers (Notification, SegmentedControl, InlineEditActions, ProgressBar, CollapsibleSection, RadioButton, TabBar, Card, Badge, StandardButtons, plus the canonical declaration) now do `$: shared = computeSharedBlock(component, shareableContexts, allTokens); $: void $editorState;` as two reactive statements.

### m9. `navigate()` triggers two store writes per call `[local]` [done]
- `src/lib/router.ts:14-23`: `route.set(pathname)` then `dispatchEvent(PopStateEvent)` whose listener (line 25) calls `route.set(...)` again. The synthetic popstate is unnecessary — drop it, or drop the explicit `route.set` and rely on the listener.
- **Resolution (2026-05-04):** Dropped the synthetic `dispatchEvent(PopStateEvent)`. `navigate()` now produces exactly one `route.set` per call; the popstate listener (installed in `init()`) only handles real browser back/forward events. Verified by `lazyConfig.test.ts` with a `vi.fn()` subscriber.

### m10. Dead `id.startsWith('divider-')` branch `[local]`
- `src/pages/ComponentEditorPage.svelte:142` — none of the `componentNavItems` match this prefix. Either populate (with intent) or delete (Speculative Generality).
- [done] **Resolution (2026-05-04):** Verified post-Wave-2: no `componentNavItems` entry, no `defaultSections.ts` entry, no `componentSources.ts` entry, no other code site starts ids with `divider-`. Branch deleted; the `.nav-divider-label` CSS rule and its rail-expanded sibling deleted with it (no other consumer).

### m11. `// NEW: Show action button in header row` task-narration comment `[local]`
- `src/components/Notification.svelte:18` — "NEW:" is a moment-of-change marker that violates the "comments belong to the code, not the PR" project convention. Same file: 11+ `actionInline`/`actionHeader`/`actionLeftVariant`/etc. boolean+option flags are a Long Parameter List / Flag Arguments accumulation worth flagging separately.
- [done] **Resolution (2026-05-04):** Dropped the `// NEW:` task-narration comment from `actionInline`/`actionHeader` declaration. The flag-args accumulation (11+ `actionInline`/`actionHeader`/`actionLeftVariant`/etc. booleans) is **out-of-scope for this audit pass** and flagged for a separate follow-up — the right fix is a structural refactor (single `actions: { header?, inline?, left?, right? }` config object), not a one-liner cleanup, so it deserves its own bullet/wave.

### m12. `structuredCloneJSON` reinvented in tests `[local]`
- `src/lib/editorStore.test.ts:331` — `JSON.parse(JSON.stringify(v))` helper; happy-dom and Node 18+ both have global `structuredClone`.
- [done] **Resolution (2026-05-04):** All 3 call sites (lines 65/241/262) switched to global `structuredClone(...)`; the `structuredCloneJSON` helper at the bottom of the file deleted. Tests 18 → 18.

### m13. `seedShadowsFromDom` couples seed timing to the shadows UI `[local]`
- `src/lib/editorStore.ts:321`: "Called once from the shadows UI when state has no tokens yet." This is a Hidden Sequential Coupling — if the user never opens the shadows tab, no seed happens; tokens.css then disagrees with what the editor *thinks* shadows are. Move the seed into hydrate or into `loadFromFile`'s "preserve existing" branch.

## Nits

- `src/lib/editorStore.ts:14, 1278` `[local]` — "Phase 1" / "Phase 2 derivation" comments. Remove once stable; keep them in the PR description. [done] **Resolution (2026-05-04):** Removed the "Phase 1" paragraph from the module doc-comment and the "Phase 2 derivation" header above `deriveCssVars`. Reworded `toTheme`'s docstring to drop its own "Phase 1" reference. The narration was scaffolding for an in-flight migration that has since landed.
- `src/lib/paletteDerivation.ts:201` `[local]` — `--text-primary-color` one-off rule (when ns=='primary' and step=='primary') deserves a one-line WHY (avoid `--text-primary` collision) or extraction to a tiny rename map.
  - [done] **Resolution (2026-05-04):** Added a one-line comment above the rule explaining the collision-avoidance with the neutral `--text-primary` token.
- `src/component-editor/scaffolding/ComponentFileManager.svelte:1` `[local]` — 888 lines. Split the SaveAs dialog and the file menu into sub-components; the parent is hard to follow now.
  - [deferred] **(2026-05-04):** Wave 3f bundled this with smaller micros and chose to defer rather than scope-creep. The split is its own ~30-min refactor (extract `<SaveAsDialog>` and `<FileMenu>` sub-components, thread props through, move CSS) and deserves its own follow-up wave; tracking as outstanding.
- `src/lib/editorStore.ts:1140` `[local]` — `loadFromFile` is 40 lines that read like a small pipeline (clear → split rawVars by domain → preserve session-scoped fields → reset history). A typed `loaders[domain](rawVars)` table would make the flow explicit.

## Project conventions

- `src/components/Notification.svelte:18` `[local]` — "// NEW: ..." task narration comment, violates "no current-task comments in code."
- `src/lib/editorStore.ts:14, 1278` `[local]` — "Phase 1" / "Phase 2" current-state narration comments. [done] **Resolution (2026-05-04):** Removed both narration blocks; same fix as the matching Nits entry.
- `src/lib/editorStore.ts:960–997, 1086–1107` `[cross-cutting]` — migration tables with "drop entries here once …" comments are intent-tracking that probably belongs in a planning doc, not the source. Acceptable today; will rot. [done] **Resolution (2026-05-04):** Tables extracted to dated files under `src/lib/migrations/`; lifecycle is now mechanical (file-deletion drops the migration once `CURRENT_*_SCHEMA_VERSION` is past it). See M3.
- Defensive checks like `if (!t || !t.stops[index]) return;` (`editorStore.ts:735, 752`) on a typed in-memory model: prefer making the lookup return-or-throw and trust the type — but acceptable here given the UI may dispatch out-of-order events.

## Clean

- **State invariants & encapsulation** — the `EditorState` shape (`src/lib/editorTypes.ts`) is tight and well-typed.
- **Pure derivation** — `paletteDerivation.ts`, `oklch.ts`, `curveEngine.ts` are cohesive, side-effect free, and testable.
- **CSS-var sync** — `cssVarSync.ts` is a single-purpose module honoring the documented iframe fan-out constraint (memory note); good error containment around cross-origin parents.
- **Editor context** — `editorContext.ts` cleanly separates public `Readable` vs internal `Writable` handles via a `Symbol` key.
- **Test coverage of state machine** — `editorStore.test.ts` and `componentConfig.test.ts` are focused, well-named, and exercise cross-regime edges.
- **Composition over inheritance** — components use slots and props; no inheritance abuse; no Refused Bequest in component hierarchies.
- **Race hazards** — none observed; `mutate`/transaction is single-threaded by design.
- **LSP & ISP** — interfaces are small and used by every implementer.
- **Mostly intention-revealing names** — `groupKey`, `unlinked`, `seedFromTheme`, `markComponentSaved`, `__resetForTests` all carry their meaning.

---

## Suggested triage / sequencing for the architectural pass

This is a recommendation, not a plan — the user should triage first.

1. **C3 (alias-vs-config split)** — smallest concrete change, largest downstream effect. Unblocks Dialog/Button workarounds. Define the type, migrate the two known sites (Dialog confirm/cancel variant, Button shimmer), update `componentsToVars` to drop the `startsWith('--')` guard.
2. **C2 (single component registry)** — derives the canonical list from one place (probably `import.meta.glob` of `src/components/*.svelte` + a typed registry of editor metadata). Removes silent-degradation paths. Once this lands, M9 (SegmentedControl boilerplate) is easier because the registry can drive `buildTypeGroupTokens`.
3. **M3 (schemaVersion stamping)** — needs to happen *before* any further token rename, otherwise the migration tables grow again. A one-week pause to add the stamp prevents months of accumulation.
4. **M2 + M1 together (`versionedFileResource` parameterisation)** — the parallel theme/component plumbing collapses into one. M1's route-table cleanup is mostly a consequence of this.
5. **M7 + M8 (module-load side effects + storagePrefix lazy resolution)** — pair these. Both are about making the library safely usable outside the dev-server harness. M12 is the same fix in `router.ts`.
6. **C1 (editorStore split)** — last among the structural items. Best done after C2 and C3 because both reshape what the per-domain slices look like. Keep the test suites green throughout.
7. **M6 (history regimes)** — judgment call. Talk to the user; do not start coding without that conversation.
8. **M4 (TokenLayout selector dispatch), M5 (VariantGroup duplication), M9 (SegmentedControlEditor regression), M10 (Notification CSS), m1-m13** — parallelisable cleanup once the structural items are settled.

When work lands, mark each finding here with `[done] **Resolution (YYYY-MM-DD):** …` immediately under its bullet block. Don't move findings — severity remains the document's organising axis.
