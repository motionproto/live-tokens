# Live editing test specification

Live editing is a cross-document contract: an editor mutation must update the
editor iframe and its host page immediately, without Save, Adopt, navigation,
or reload. The automated release gate splits that contract between Vitest and
Playwright so each layer tests the behavior it can observe directly.

## Release invariant

For any editable value:

1. the editor store accepts the mutation;
2. the renderer serializes the value into the correct CSS representation;
3. the inline custom property is set on both editor and same-origin host roots;
4. dependent components repaint, including JavaScript-backed SVG and dialog
   behavior;
5. updating, undoing, redoing, resetting, and removing the value reconcile both
   roots;
6. loading a full theme from either the host or editor hydrates every open
   document's typed store and rendered roots without reloading;
7. saving a preset from the Theme Picker also adopts it.

## Playwright coverage

`tests/e2e/component-alias-contract.spec.ts` discovers every alias in every
shipped `component-configs/*/default.json`. It batches three renderer mutations
and checks every discovered variable on both roots after set, update, and
removal. The component registry's Vitest contract separately requires editable
schema variables to have default seeds, so adding a new shipped editable alias
automatically adds it to browser coverage.

`tests/e2e/component-render-contract.spec.ts` is the rendered-component test
harness. It discovers the same registry and default files, opens each real
component editor, visits every size, variant, part, and state, and checks that
component's complete property set before moving to the next component. For each
property it first operates the rendered editor control and requires the CSS
write to reach both editor and host roots. It then perturbs the property and
requires the mounted runtime preview's computed styles, pseudo-elements,
attributes, or geometry to change immediately. The property panel is outside
the fingerprint, so an editor-control repaint cannot satisfy the contract.

The harness has no per-component test cases or exception list. Standard token
selectors publish their owning variable as DOM metadata; composite controls
publish every variable they own. The harness discovers token selectors,
gradients, split padding, multi-variable toggles, canvas selects,
optional-content checkboxes, expanded/collapsed controls, and portaled dialogs
from that standardized editor structure and ARIA semantics. A second
data-driven pass activates dormant modes only for properties not observed in
the default pass. New component aliases therefore enter both the control-write
and rendered-reactivity gates without a handwritten Playwright test.

`tests/e2e/live-editing.spec.ts` covers three complementary paths:

- a primitive Brand palette edit through its production mutation action,
  proving primitive token → semantic surface token → Button component alias →
  computed host rendering;
- real Section Divider UI selections for title color, weight, size, and outline
  thickness, with assertions against the host component's computed type, SVG
  fill, and SVG filter;
- the transformation matrix for literals, token references with opacity,
  gradients, four-side padding, intrinsic display, font stacks, font-source
  nodes, and undo/redo.

`tests/e2e/theme-workflow.spec.ts` covers both directions. One journey clicks
the current editor theme name, selects a full preset, and clicks Save. It
asserts that active and production point at the selected theme, that the editor
and host share the hydrated palette, and that the page never reloaded. A second
journey keeps the editor open while the host calls `applyTheme()`, then verifies
the editor identity and palette update and makes a component edit afterward to
prove the synchronized result remains live.

## Unit coverage that stays in Vitest

Pure algorithms remain exhaustive in Vitest: palette derivation, gradient and
shadow serialization, migrations, theme resolution, registry/schema contracts,
component persistence, and renderer diff behavior. Playwright samples each
transformation family in the real browser and exhausts the cross-document alias
fan-out; it does not duplicate every pure input permutation.

## Isolation and execution

`npm run prepare:e2e` copies `src/live-tokens/data` to
`.playwright-data/live-tokens` and removes copied working buffers. The Vite test
server receives that directory through `LIVE_TOKENS_E2E_DATA_DIR`, including
isolated generated-token and font outputs. Tests therefore exercise real file
API writes without changing client or maintainer theme files.

The suite intentionally uses one Playwright worker because browser contexts
would otherwise share the same file-backed active and production pointers.

```bash
npm run test:e2e
npm run test:e2e:components
npm run test:e2e:ui
```

For a focused local diagnosis, scope the same harness without changing its
coverage logic:

```bash
LIVE_TOKENS_COMPONENT=image npm run test:e2e:components
```

Chromium is the release browser because the component runtime relies on current
CSS features, including style container queries and SVG filter behavior. CI and
the npm publish workflow install it with `npx playwright install --with-deps
chromium` before running the suite.
