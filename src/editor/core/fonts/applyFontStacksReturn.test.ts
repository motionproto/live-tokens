// @vitest-environment happy-dom
//
// applyFontStacks reports the variables it wrote. A caller that tears those
// vars down on the next switch reads them from the return value; keeping its
// own copy of the stack list is what let `--font-editorial` go stale.

import { beforeEach, describe, expect, it } from 'vitest';
import { applyFontStacks } from './fontLoader';
import { __resetCssVarSyncForTests } from '../cssVarSync';
import type { FontSource, FontStack } from '../themes/themeTypes';

const sources: FontSource[] = [
  {
    id: 'src_google_domine',
    kind: 'google',
    families: [{ id: 'src_google_domine:domine', name: 'Domine', cssName: '"Domine"' }],
  } as unknown as FontSource,
];

function stack(variable: FontStack['variable'], slots: FontStack['slots']): FontStack {
  return { variable, slots } as FontStack;
}

describe('applyFontStacks — the variables it reports', () => {
  beforeEach(() => {
    __resetCssVarSyncForTests();
    document.documentElement.removeAttribute('style');
  });

  it('returns each variable it set, and writes it to :root', () => {
    const applied = applyFontStacks(
      [
        stack('--font-editorial', [{ kind: 'project', familyId: 'src_google_domine:domine' }]),
        stack('--font-sans', [{ kind: 'generic', value: 'sans-serif' }]),
      ],
      sources,
    );

    expect(applied).toContain('--font-editorial');
    expect(applied).toContain('--font-sans');
    expect(document.documentElement.style.getPropertyValue('--font-editorial')).toContain('Domine');
  });

  it('omits a variable no stack resolved, and clears it', () => {
    applyFontStacks([stack('--font-mono', [{ kind: 'generic', value: 'monospace' }])], sources);
    const applied = applyFontStacks(
      [stack('--font-sans', [{ kind: 'generic', value: 'sans-serif' }])],
      sources,
    );

    expect(applied).toEqual(['--font-sans']);
    expect(document.documentElement.style.getPropertyValue('--font-mono')).toBe('');
  });

  // The drift guard: every stack the loader manages has to be reachable from
  // the return value, or a caller tracking it re-introduces the stale copy.
  it('covers the editorial stack alongside the original four', () => {
    const applied = applyFontStacks(
      (['--font-display', '--font-sans', '--font-serif', '--font-mono', '--font-editorial'] as const).map(
        (v) => stack(v, [{ kind: 'generic', value: 'serif' }]),
      ),
      sources,
    );

    expect(applied).toEqual([
      '--font-display',
      '--font-sans',
      '--font-serif',
      '--font-mono',
      '--font-editorial',
    ]);
  });
});
