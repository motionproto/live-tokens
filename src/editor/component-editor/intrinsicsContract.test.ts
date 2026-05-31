// @vitest-environment node
/**
 * Universal intrinsics contract — runs against every registry entry that
 * declares `intrinsics` (structural/display properties driven by bespoke
 * editor controls, not the generic token grid).
 *
 * Guards the bug class behind the SectionDivider alignment fix: an intrinsic
 * carries its default twice — in the runtime component's `:global(:root)` and
 * in the editor's read-back default (`IntrinsicSpec.default`, which the getters
 * fall back to when a variant is unedited). When the two drift, the control
 * displays a state the page never renders, and a native <select> won't even
 * fire onchange to write the "change" the user thinks they made.
 *
 * For every (component, intrinsic, variant) this asserts:
 *   (1) the runtime `:global(:root)` declares a default for the variable,
 *   (2) that runtime default is one of the spec's allowed `values`, and
 *   (3) the editor's declared default for the variant equals the runtime
 *       default (both run through the spec's `normalize`, if any).
 *
 * A new component with intrinsics is auto-covered by adding `intrinsics` to its
 * registry entry — same pattern as registryContract.test for schema tokens.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { buildTokenRegistry, extractGlobalRootBody } from '../core/palettes/tokenRegistry';
import { getComponentRegistryEntries } from './registry';

const REPO_ROOT = path.resolve(__dirname, '../../..');

const entries = getComponentRegistryEntries().filter((e) => e.intrinsics && e.intrinsics.length > 0);

describe('component intrinsics contract', () => {
  describe.each(entries.map((e) => [e.id, e] as const))('%s', (_id, entry) => {
    const runtimePath = path.resolve(REPO_ROOT, entry.sourceFile);
    const registry = buildTokenRegistry(
      existsSync(runtimePath) ? extractGlobalRootBody(readFileSync(runtimePath, 'utf-8')) : '',
    );

    for (const spec of entry.intrinsics!) {
      const norm = spec.normalize ?? ((x: string) => x);
      for (const variant of spec.variants) {
        const variable = spec.variable(variant);

        it(`${spec.key} [${variant}]: editor default agrees with runtime :root`, () => {
          const runtimeRaw = registry.getDeclaredValue(variable);
          expect(
            runtimeRaw,
            `${variable} has no :global(:root) default in ${entry.sourceFile}`,
          ).not.toBeNull();
          expect(
            spec.values,
            `runtime default "${runtimeRaw}" for ${variable} is not in the spec's value set`,
          ).toContain(norm(runtimeRaw!));

          const editorDefault = spec.default[variant];
          expect(
            editorDefault,
            `intrinsic "${spec.key}" has no editor default for variant "${variant}"`,
          ).toBeDefined();
          expect(
            norm(editorDefault),
            `${entry.id}/${spec.key}[${variant}]: editor default "${editorDefault}" ` +
              `disagrees with runtime :root default "${runtimeRaw}" for ${variable}. ` +
              `Runtime :global(:root) is the source of truth — update the editor's spec default.`,
          ).toBe(norm(runtimeRaw!));
        });
      }
    }
  });
});
