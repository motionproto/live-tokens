# Reactive Theme Update Audit

Date: 2026-08-17  
Version audited: 0.49.1 working tree

## Executive summary

The normal editor-to-host live-update path is intact: an editor mutation updates the Svelte store, `deriveCssVars()` produces the complete CSS-variable map, and `cssVarSync` writes each changed variable to both the editor document and the same-origin host document. All 25 registered components pass the static editor/runtime/default-config contract, including typography, color, spacing, effects, and intrinsic configuration variables.

The audit did not find evidence that all component and token updates are globally disconnected. It did find several gaps that can make specific changes appear non-reactive or leave the DOM inconsistent with editor state. The most important is that fonts are maintained by imperative side effects outside the authoritative renderer. A font edit applies immediately through its UI caller, but undo/redo does not replay those side effects, and a removed stack can leave its old `--font-*` value inline. Section Divider also measures SVG text before a newly selected webfont necessarily finishes loading, so its outline geometry can remain sized for the fallback font.

Real-browser follow-up found a release-blocking directionality gap in that theme-load correction. The host page and editor iframe are separate JavaScript documents with separate Svelte stores. Applying a theme inside the iframe hydrated the editor and mirrored CSS into the host, but applying it from a consumer's host-side theme control hydrated only the host. An already-open editor retained the previous theme's typed palettes, component aliases, name, and summary. The visible CSS snapshot and editable dependency graph could therefore disagree.

Verdict: the component/token dependency graph remains intact once both documents hold the same theme state. Theme application must synchronize the complete typed payload in both directions; mirroring CSS alone is insufficient. Font side effects and special JavaScript consumers also need to remain under the same reactive contract.

## Scope and method

The audit traced:

- editor control writes into global-token, palette, gradient, shadow, overlay, column, font, and component slices;
- store subscription, variable derivation, diffing, and removal;
- editor-frame to host-document mirroring;
- theme initialization, preview, apply, cancel, save, adopt, undo, and redo paths;
- all 25 registered component schemas against their runtime CSS declarations and default configurations;
- runtime code that reads computed styles in JavaScript instead of relying on CSS alone;
- font source and stack injection;
- existing unit, component, contract, and build-time checks.

The in-app browser had no available session, so this pass could not perform a manual interactive browser matrix. Runtime verification used the repository's happy-dom tests and contract scripts. A real-browser smoke matrix remains a release requirement because SVG font metrics, iframe propagation, CSS style queries, and font loading cannot be fully proven by happy-dom.

## Reactive architecture

| Domain | Authoritative state | DOM path | Host propagation | Assessment |
| --- | --- | --- | --- | --- |
| Global/type/semantic variables | `editorState.cssVars` | `deriveCssVars` -> renderer diff -> `cssVarSync` | Mirrored from iframe to same-origin parent root | Sound after synchronized theme hydration |
| Palettes | `editorState.palettes` | derived palette variables -> renderer | Mirrored | Sound |
| Gradients | `editorState.gradients` | derived gradient variables -> renderer | Mirrored | Sound |
| Shadows | `editorState.shadows` | derived shadow variables -> renderer | Mirrored | Sound after initial seed |
| Columns and overlays | typed store slices | derived variables -> renderer | Mirrored | Sound |
| Component aliases and config | `editorState.components` | `componentsToVars` -> renderer | Mirrored | Sound; all 25 registry contracts pass |
| Font stacks | `editorState.fonts.stacks` | imperative `applyFontStacks` calls | Mirrored only when caller remembers | Not authoritative |
| Font sources | `editorState.fonts.sources` | imperative head-node injection | Mirrored only when caller remembers | Not authoritative |
| Theme preview | temporary DOM diff | direct paint, then explicit revert | Mirrored | Deliberate exception; well-contained |

## Findings

### F1 — High: font side effects can diverge from editor state

Font source and stack data is stored in `editorState`, but `deriveCssVars()` intentionally excludes it. UI and hydration callers manually invoke `applyFontSources()` and `applyFontStacks()` after changing the store.

Consequences:

- undo and redo replace store state without re-running either font side effect;
- any future caller that uses `setFontSources()` or `setFontStacks()` without the matching imperative helper silently breaks live behavior;
- `applyFontStacks()` writes resolved stacks but never removes a previously written stack that is absent or now resolves to no value;
- full hydration with an empty source or stack list does not currently call the helpers, so stale links, styles, or root variables can survive.

This violates the core invariant that the DOM is a projection of editor state.

Recommendation: make the renderer own font projection. Include resolved stack variables in `deriveCssVars()` so normal diff/removal semantics apply, and reconcile font-source nodes from every store emission. Remove redundant imperative calls from UI and hydration paths once the renderer is authoritative.

### F2 — High: Section Divider does not remeasure after asynchronous font load

Section Divider renders its title in SVG and uses `getBBox()` to size the SVG/viewBox. It remeasures when the root inline `style` attribute changes, which covers live font-family, font-size, font-weight, outline-width, and outline-color writes. However, a webfont normally finishes loading after the CSS variable changes. The component does not observe `document.fonts`, so the initial measurement can be for the fallback face and remain stale after the actual face arrives.

Recommendation: schedule the same measure/filter synchronization when the document font set becomes ready and on `loadingdone`, with cleanup on unmount. Keep root-style observation for token changes.

### F3 — Medium: component boot hydration can preserve stale local state on an empty successful response

`initializeTheme()` only calls `seedComponentsFromApi()` when at least one component configuration was fetched. If the component list succeeds but is empty, or every listed config read returns null, persisted components remain in the editor and host instead of being replaced by the server's active state.

Recommendation: distinguish an unavailable endpoint from a successful authoritative response. When the list request succeeds, seed the result even when it is empty. Treat individual-read failure as an all-or-nothing hydration failure so the page does not become a mixture of active configs and CSS defaults.

### F4 — Medium: renderer correctness assumes it is the only DOM writer

The renderer diffs against an in-memory `lastApplied` map rather than the actual roots. Theme preview is a documented direct-DOM exception and explicitly restores the live look. Other direct writers and `clearAllCssVarOverrides()` do not invalidate the renderer cache. A later state emission whose value equals `lastApplied` can therefore skip repairing a missing or externally changed inline value.

Current exposure is limited: component controls normally write through the store, and the known preview path restores its changes. The invariant is still fragile and easy to violate in future work.

Recommendation: keep normal editor controls store-first, reduce exported direct-write use, and add an explicit renderer resync/invalidation operation for lifecycle resets. Tests should prove repair after clearing or preview cancellation.

### F5 — Medium: JavaScript-backed component reactions are under-tested

Most components consume custom properties in CSS and update automatically. Three runtime areas have extra JavaScript behavior:

- Section Divider copies computed outline values into SVG filter attributes and measures text geometry;
- Dialog maps two CSS configuration variables into nested Button variants;
- Floating Token Tags continuously recomputes geometry/contrast with animation frames.

Section Divider and Dialog observe every root inline-style mutation, not just relevant variables. This is functionally broad but can cause every mounted instance to recompute after unrelated token edits. There are no focused tests proving these computed-style bridges react to live root changes.

Recommendation: add targeted behavior tests first. If profiling shows material cost, batch Section Divider measurement in one animation frame and skip work when the relevant computed values have not changed.

### F6 — Medium: host-document fan-out lacks a direct regression test

`cssVarSync` mirrors set and remove operations into the same-origin parent document, which is the mechanism that makes the overlay editor change the host. Existing tests prove local root updates and broad component contracts, but do not directly prove parent-root set, update, and removal behavior or event behavior across both documents.

Recommendation: add a test seam for resolving synced roots/documents and cover local plus parent fan-out. Include removal and a full-theme replacement, not only initial set.

### F7 — Low: root-style observers are coarse

Dialog and Section Divider observe the entire root `style` attribute. One token edit rewrites one property, but every mounted observer still wakes. This does not explain a missed update; it is a scaling concern.

Recommendation: retain correctness first, then coalesce reads and compare relevant computed values before updating component state.

### F8 — Critical: host-initiated theme loads leave an open editor on stale typed state

The initial in-place `applyTheme()` implementation hydrated only the document
that called it. `cssVarSync` deliberately knows how an iframe can reach its
parent, but a host document has no corresponding child-root/store fan-out.
Consequently, a consumer-side theme picker could move the server pointer and
host design system while the already-open editor continued to edit its prior
palette and component graph. Existing Playwright coverage missed this because
all theme actions originated inside the iframe—the direction that already
worked.

Recommendation: broadcast the complete resolved apply payload between
same-origin Live Tokens documents. Every receiver must hydrate colors/type,
component configs, active-theme identity, and local Theme Panel summary state
through its own store renderer. Cover host-to-editor and editor-to-host theme
application separately, then mutate a component after the host-side switch to
prove the result is a live editable graph rather than a copied CSS snapshot.

## Existing evidence

The following checks passed during the audit:

- token migration/contract check;
- component default synchronization check;
- editor font-isolation check;
- overlay portal check;
- 80 focused tests covering theme hydration, preview/revert, component registry intrinsics, public component mounting, Dialog portal wiring, and font removal UI.

The registry contract confirms for every registered component that:

1. the runtime file and schema exist;
2. editable schema variables are unique;
3. every editable variable is declared by the runtime component;
4. every editable variable has a default configuration seed;
5. a representative alias round-trips through the component store slice.

These checks establish coverage and persistence shape, but they do not yet establish browser-level reactivity for every property.

## Recommended implementation order

1. Make font stacks and font sources renderer-owned; cover initial apply, update, removal, undo, redo, and theme hydration.
2. Make Section Divider remeasure after font loading; cover outline width/color plus font size/weight/family reactions.
3. Make successful component boot hydration authoritative even for an empty result; cover failure versus empty-response behavior.
4. Add direct CSS-variable fan-out tests for editor and host roots, including removal and full-theme replacement.
5. Add a small representative reactive matrix spanning color, typography, spacing, effect, intrinsic config, semantic dependency, undo/redo, preview/revert, and reset.
6. Run a real-browser overlay smoke pass before release, including Spring Meadow and Section Divider.
7. Consider observer batching and renderer cache hardening after correctness is covered.

## Release gate

Do not tag the next version until:

- renderer-owned font tests pass;
- Section Divider responds after asynchronous font completion;
- component initialization cannot retain stale state after an authoritative empty response;
- focused and full test suites, Svelte check, build, and a real-browser host/editor smoke pass succeed.

## Implementation status

Implemented after this audit was saved:

- font stacks are derived by the authoritative renderer and font-source nodes are reconciled by the same store subscription;
- font set/update/removal plus undo/redo are covered by regression tests;
- Section Divider remeasures on font readiness and `loadingdone`, with tests for font geometry and outline filter updates;
- successful empty component hydration clears stale state, while unavailable or partial reads preserve the current system;
- host/editor root set, update, removal, and editor change events have direct tests;
- a cross-domain reactive matrix covers global typography, columns, overlays, shadows, gradients, component typography, outline color, and intrinsic display configuration;
- Dialog's JavaScript variant bridge has a focused live-update test.

Verification after implementation: 75 Vitest files and 3,484 tests pass;
Svelte check reports no errors and two pre-existing accessibility warnings; the
production build passes.

The real-browser release gate is now implemented in Playwright. Chromium opens
the editor as a same-origin overlay and verifies editor/host fan-out rather than
testing an isolated editor document. Its registry-driven component contract discovers
all 1,237 aliases in the 25 shipped component defaults and checks set, update,
and removal on both roots. Focused browser journeys cover real component control
clicks, resolved font size/weight, SVG outline synchronization, color opacity,
gradients, split padding, intrinsic display, font stacks and source nodes,
undo/redo, theme hydration, one-step preset adoption, and no-reload behavior.
The file API is pointed at a disposable copy under `.playwright-data/`.

Both `verify.yml` and `publish.yml` install Chromium and run `npm run test:e2e`,
so a release cannot publish after losing the live editor-to-host contract.

Real-browser investigation after the initial Playwright pass exposed and fixed
F8. Theme application now uses a same-origin `BroadcastChannel` to deliver the
complete resolved theme payload to every already-open host/editor document.
Each receiver hydrates its own Svelte stores and renderer, and the Theme Panel
updates its local identity and component summary from the same event. The new
regression starts the editor first, calls `applyTheme()` from the host, verifies
matching primitive variables and theme identity in both documents, and then
changes a component alias to prove subsequent edits still repaint the host.

The browser suite now also proves a primitive Brand palette mutation changes
the derived `--color-brand-*` token, its `--surface-brand-high` semantic token,
and the rendered primary Button while preserving
`--button-primary-surface: var(--surface-brand-high)`. This closes the missing
token → semantic → component dependency-chain assertion.

The final audit gate is an automated rendered-component harness rather than a
generated set of handwritten tests. It visits every standardized editor size,
variant, part, and state; activates optional modes from shared controls and ARIA
semantics; operates every property's real editor control; and perturbs every
shipped component property. It completes one component's full property set
before advancing to the next. Each control write must agree on the editor and
host roots, and each perturbation must change the actual runtime preview's
computed styles, pseudo-elements, attributes, or geometry. It has no
per-component test list or exception table and covers all 25 components and all
1,237 properties in Chromium.

That exhaustive pass found and fixed concrete runtime gaps that the earlier
schema/default contract could not detect:

- Section Divider declared and bridged per-size title line-height but never
  applied it to the title element;
- Side Navigation declared title border, indicator, and label-border aliases
  without painting them, and its editor omitted those controls;
- Side Navigation's forced item-hover selected the already-active row and its
  forced section-hover did not forward hover typography;
- Button and Icon Button editors could not paint their outline active state;
- Card's preview omitted an icon even though icon size is editable;
- Image's preview had no deterministic hover state for its zoom alias;
- dialog, placeholder, and scrollbar properties required portaled and
  pseudo-element fingerprinting rather than ordinary descendant styles.

The editor-control phase subsequently found three additional classes of gap:

- Section Divider typography colors were declared as linked across sizes, but
  the shared typography editor did not enable its color link path;
- Tab Bar shipped default, hover, and disabled indicator colors that the editor
  did not expose;
- split padding parents and Card's two-variable hover enablement needed standard
  composite ownership metadata so every affected property could be exercised
  through the visible control.

`npm run test:e2e:components` runs the full harness. Set
`LIVE_TOKENS_COMPONENT=<registry-name>` to run the same logic against one
component while diagnosing a failure.
