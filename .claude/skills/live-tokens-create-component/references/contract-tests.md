# The registry contract as a test in a consumer project

The package ships the contract as a test file. `checkRegistryEntry` is the
assertion behind it, exported so a project can write its own file instead. The
contract takes one registry entry and returns a violation line per failure; an
empty array is the pass.

## The shipped path

`npx live-tokens check-component <id> --tests` runs the shipped file for you,
under vitest, alongside the Playwright component contract suites, and maps
every failure to a finding with a rule id and a line. The compiled file is
`src/testing-js/registry.contract.js`; the `.ts` source it compiles from is not
in the tarball.

It resolves a shipped component's `sourceFile` against the package and yours
against your project, and reports a component that exists as files and never
reached a registration.

A project scaffolded by `create` has `@playwright/test`, `vitest`, and
`happy-dom` installed, with `live-tokens.testing.ts`, `src/registerComponents.ts`,
and `tests/contracts.ts` in place. Any other project adds the three as
devDependencies. Both run `npx playwright install chromium` once. A missing
one is a `tests-not-installed` finding naming the install command.

Name the module that registers your components, in `live-tokens.testing.ts` at
the project root, as a plain quoted string:

```ts
// live-tokens.testing.ts
import { defineTestingConfig } from '@motion-proto/live-tokens/testing/vitest';

export default defineTestingConfig({
  registrySetup: 'src/registerComponents.ts',
});
```

The setup module registers and stops there, exactly as the Registration
section of live-tokens-create-component wires it up:

```ts
// src/registerComponents.ts
import { registerComponent } from '@motion-proto/live-tokens';
import MyWidgetEditor, { allTokens } from './system/components/MyWidgetEditor.svelte';

registerComponent({
  id: 'mywidget',
  label: 'My Widget',
  icon: 'fas fa-magic',
  sourceFile: 'src/system/components/MyWidget.svelte',
  editorComponent: MyWidgetEditor,
  schema: allTokens,
});
```

Import the same module from `src/main.ts`, so one list of registrations serves
the app and the tests. Importing an editor registers nothing, and importing
`main.ts` would mount the app, which is why the registrations live in a module
of their own.

`LIVE_TOKENS_COMPONENT=<id>` is what `check-component <id> --tests` sets for
you; it narrows the run to one component and fails when no component is
registered under that id.

## The component contract

The eight Playwright suites drive one `ComponentContract` per component. The
package ships one for each of its own components and none for yours. A run
with `LIVE_TOKENS_COMPONENT=<id>` and no contract for `<id>` reports one
`contract-missing` finding, which names the setting that unlocks the suites.

Name the module that exports your contracts as `contractsModule`, next to
`registrySetup`:

```ts
// live-tokens.testing.ts
export default defineTestingConfig({
  registrySetup: 'src/registerComponents.ts',
  contractsModule: 'tests/contracts.ts',
});
```

The module exports a `ComponentContract[]`, as the default export or a named
`contracts` export. The type ships from `@motion-proto/live-tokens/testing`,
and the doc comment on each field is the reference for it. A contract
declares the component's parts as selectors inside the preview, then one
expectation per obligation:

```ts
// tests/contracts.ts
import type { ComponentContract } from '@motion-proto/live-tokens/testing';

export const contracts: ComponentContract[] = [
  {
    id: 'statcard',
    origin: 'custom',
    root: 'root',
    parts: { root: '.statcard', value: '.statcard-value' },
    properties: [
      {
        paints: {
          root: {
            backgroundColor: '--statcard-surface',
            borderTopColor: '--statcard-border',
            borderTopWidth: '--statcard-border-width',
            borderRadius: '--statcard-radius',
            paddingTop: '--statcard-padding',
          },
          value: { color: '--statcard-value-text', fontSize: '--statcard-value-font-size' },
        },
      },
    ],
    states: { applicable: false, reason: 'a stat card renders one state' },
    persistence: {
      cases: [
        { shape: 'token', variable: '--statcard-radius', observe: { part: 'root', css: 'borderRadius' } },
      ],
      resetVariable: '--statcard-radius',
    },
    theme: {
      theme: 'brand',
      changed: ['--statcard-radius'],
      unchanged: ['--statcard-padding'],
      aliasedTo: { '--statcard-radius': '--radius-none' },
      observe: { part: 'root', css: 'borderRadius', variable: '--statcard-radius' },
    },
    interaction: { applicable: false, reason: 'a stat card carries no interactive role' },
    sketch: {
      style: 'pencil',
      parts: [{ part: 'root', fill: '--statcard-surface', stroke: '--statcard-border' }],
    },
  },
];
```

Each obligation and what it needs from the project:

- `properties`: part key, then CSS property, then the semantic property that
  drives it. One entry per variant tab and state tab the editor renders;
  omit `variant` and `state` when the editor renders one view. The paint maps
  and `uncovered` together name every property in `default.json`. A property
  no computed style shows verbatim, one consumed inside `calc()` or a gradient
  function, goes in `uncovered` with its reason.
- `states`: one entry per state tab, with the class or attributes the preview
  forces. `applicable: false` when the editor renders no state strip.
- `persistence`: an edit the run makes through the editor, saves, reloads, and
  reads back. `resetVariable` is a property one of the cases moves.
- `theme`: a theme in the project's data tree whose block for the component
  reassigns a property. Save one with the editor before the first run.
  `changed` names the properties the theme moves, `unchanged` the ones it
  leaves, and `aliasedTo` the design token each reassigned property resolves
  to under it.
- `interaction`: the interactive part's role and its cases. `applicable:
  false` for a component with no interactive role.
- `sketch`: a sketch style id and the fill and stroke each reserved-class part
  resolves to under it. `applicable: false` only for a component
  `references/sketch-mode.md` exempts.

## Running vitest yourself

`check-component --tests` covers the shipped path. Run vitest directly only
when you need to drive it outside the CLI. `createVitestConfig` lives at
`@motion-proto/live-tokens/testing/vitest`, which never imports
`@playwright/test`, so a project holding only `vitest` and `happy-dom` can
still build this config:

```ts
// vitest.contract.config.ts
import { createVitestConfig } from '@motion-proto/live-tokens/testing/vitest';
import viteConfig from './vite.config';
import settings from './live-tokens.testing';

export default createVitestConfig(viteConfig, { registrySetup: settings.registrySetup });
```

```bash
npx vitest run --config vitest.contract.config.ts
```

## Writing your own file

`checkRegistryEntry` is exported at
`@motion-proto/live-tokens/component-editor/contract`, so a project that wants
its own suite writes two lines against its own registrations:

```ts
// tests/registryContract.test.ts
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { getComponentRegistryEntries } from '@motion-proto/live-tokens';
import { checkRegistryEntry } from '@motion-proto/live-tokens/component-editor/contract';
import '../src/registerComponents';

const mine = getComponentRegistryEntries().filter((e) => e.origin === 'custom');

describe.each(mine.map((e) => [e.id, e] as const))('%s', (_id, entry) => {
  it('meets the registry contract', () => {
    expect(checkRegistryEntry(entry)).toEqual([]);
  });
});
```

Filter on `origin`. The registry always carries the shipped components too, and
their `sourceFile` paths are relative to the package root. Without the filter
every built-in fails on a path that does not exist in your project.

The helper reads the runtime file and `default.json` off disk, which is why it
is node-only and has its own subpath.

## Paths

Paths resolve against `process.cwd()` and `src/live-tokens/data/component-configs`.
A project that moved either passes them:

```ts
checkRegistryEntry(entry, { projectRoot, componentConfigsDir });
```

`componentConfigsDir` is the same directory `live-tokens.config.json` names.

## What it holds

1. **Registration**: `sourceFile` resolves to a real file, the schema is non-empty.
2. **Uniqueness**: no schema variable is declared twice.
3. **Editor to runtime**: every editable token's CSS var is declared in the
   runtime's `<style>` block, so an edit has something to repaint.
4. **Editor to default config**: every editable token has a seed alias in
   `component-configs/<id>/default.json`, so the component adopts with full
   defaults. A component with no `default.json` is editor-only; this check and
   the next one skip it.
5. **Opacity floors**: a token declaring `minOpacity` ships a default at or
   above it, so a floating panel starts out legible over page content.
6. **Round-trip**: `setComponentAlias` persists into the slice under the same key.

Checks 3 and 4 exclude `hidden: true` tokens, `kind: 'gradient'` tokens (stored
as gradient objects, not vars), and `-padding-(top|right|bottom|left)` suffixes
(written on demand by the split-padding UI and read through the `themed-padding`
mixin's fallback chain, so they exist as neither `:root` declarations nor seeds).
