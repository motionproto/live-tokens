# The registry contract as a test in your own project

`checkRegistryEntry` is the contract the package holds its own 26 components
to, exported so a project outside the package can run it over its own. It takes
one registry entry and returns a violation line per failure; an empty array is
the pass.

```ts
// tests/registryContract.test.ts
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { getComponentRegistryEntries, registerComponent } from '@motion-proto/live-tokens';
import { checkRegistryEntry } from '@motion-proto/live-tokens/component-editor/contract';
import MyWidgetEditor, { allTokens } from '../src/system/components/MyWidgetEditor.svelte';

registerComponent({
  id: 'mywidget',
  label: 'My Widget',
  icon: 'fas fa-magic',
  sourceFile: 'src/system/components/MyWidget.svelte',
  editorComponent: MyWidgetEditor,
  schema: allTokens,
});

const mine = getComponentRegistryEntries().filter((e) => e.origin === 'custom');

describe.each(mine.map((e) => [e.id, e] as const))('%s', (_id, entry) => {
  it('meets the registry contract', () => {
    expect(checkRegistryEntry(entry)).toEqual([]);
  });
});
```

Two lines there are load-bearing.

- **Register at the top of the test file**, rather than importing `main.ts`.
  The entries have to exist before `describe.each` reads them, and
  `bootLiveTokens` would mount the app.
- **Filter on `origin`.** The registry always carries the shipped components
  too, and their `sourceFile` paths are relative to the package root, not
  yours. Without the filter every built-in fails on a path that does not exist
  in your project.

## Setup

`vitest` and `happy-dom` as devDependencies, and the svelte plugin already in
`vite.config.ts` so the editor `.svelte` import resolves. The helper reads the
runtime file and `default.json` off disk, which is why it is node-only and has
its own subpath.

The package ships Svelte and TypeScript source, and `bootLiveTokens` imports the
FontAwesome stylesheet. Left external, Node meets that `.css` and stops with
`Unknown file extension ".css"`, before a single test runs. Inline both so Vite
transforms them:

```ts
// vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      server: { deps: { inline: [/@motion-proto\/live-tokens/, /@fortawesome/] } },
    },
  }),
);
```

## Paths

Paths resolve against `process.cwd()` and `src/live-tokens/data/component-configs`.
A project that moved either passes them:

```ts
checkRegistryEntry(entry, { projectRoot, componentConfigsDir });
```

`componentConfigsDir` is the same directory `live-tokens.config.json` names.

## What it holds

1. **Registration** — `sourceFile` resolves to a real file, the schema is non-empty.
2. **Uniqueness** — no schema variable is declared twice.
3. **Editor to runtime** — every editable token's CSS var is declared in the
   runtime's `<style>` block, so an edit has something to repaint.
4. **Editor to default config** — every editable token has a seed alias in
   `component-configs/<id>/default.json`, so the component adopts with full
   defaults. A component with no `default.json` is editor-only; this check and
   the next one skip it.
5. **Opacity floors** — a token declaring `minOpacity` ships a default at or
   above it, so a floating panel starts out legible over page content.
6. **Round-trip** — `setComponentAlias` persists into the slice under the same key.

Checks 3 and 4 exclude `hidden: true` tokens, `kind: 'gradient'` tokens (stored
as gradient objects, not vars), and `-padding-(top|right|bottom|left)` suffixes
(written on demand by the split-padding UI and read through the `themed-padding`
mixin's fallback chain, so they exist as neither `:root` declarations nor seeds).
