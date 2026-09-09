# The registry contract as a test in a consumer project

The package ships the contract as a test file. `checkRegistryEntry` is the
assertion behind it, exported so a project can write its own file instead. The
contract takes one registry entry and returns a violation line per failure; an
empty array is the pass.

## The shipped file

`src/testing/registry.contract.ts` runs the contract over every component the
registry holds, resolving a shipped component's `sourceFile` against the package
and yours against your project. It also reports a component that exists as files
and never reached a registration.

Add `vitest` and `happy-dom` as devDependencies. Then name the module that
registers your components, in `live-tokens.testing.ts` at the project root:

```ts
// live-tokens.testing.ts
import { defineTestingConfig } from '@motion-proto/live-tokens/testing';

export default defineTestingConfig({
  registrySetup: 'src/live-tokens-components.ts',
});
```

The setup module registers and stops there:

```ts
// src/live-tokens-components.ts
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

The Vitest config comes from the package. It inlines the package and the
FontAwesome stylesheet it imports, sets the `happy-dom` environment, and
collects the shipped contract file:

```ts
// vitest.contract.config.ts
import { createVitestConfig } from '@motion-proto/live-tokens/testing';
import viteConfig from './vite.config';
import settings from './live-tokens.testing';

export default createVitestConfig(viteConfig, { registrySetup: settings.registrySetup });
```

```bash
npx vitest run --config vitest.contract.config.ts
```

`LIVE_TOKENS_COMPONENT=<id>` narrows the run to one component and fails when no
component is registered under that id.

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
import '../src/live-tokens-components';

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
