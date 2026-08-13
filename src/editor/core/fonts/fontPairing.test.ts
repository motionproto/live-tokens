import { describe, expect, it } from 'vitest';
import type { FontSource, FontStack } from '../themes/themeTypes';
import { fontPairingLabel } from './fontPairing';

const sources: FontSource[] = [
  {
    id: 'src_1',
    kind: 'google',
    url: 'https://fonts.googleapis.com/css2?family=Arvo',
    families: [
      { id: 'fam_arvo', name: 'Arvo', cssName: '"Arvo"' },
      { id: 'fam_manrope', name: 'Manrope', cssName: '"Manrope"' },
    ],
  },
];

const stack = (variable: FontStack['variable'], slots: FontStack['slots']): FontStack => ({
  variable,
  slots,
});

describe('fontPairingLabel', () => {
  it('names the heading face then the body face', () => {
    const stacks = [
      stack('--font-display', [{ kind: 'project', familyId: 'fam_arvo' }]),
      stack('--font-sans', [{ kind: 'project', familyId: 'fam_manrope' }]),
      stack('--font-mono', [{ kind: 'generic', value: 'monospace' }]),
    ];
    expect(fontPairingLabel(stacks, sources)).toBe('Arvo / Manrope');
  });

  it('skips a slot whose family is gone and takes the next one', () => {
    const stacks = [
      stack('--font-display', [
        { kind: 'project', familyId: 'fam_deleted' },
        { kind: 'generic', value: 'serif' },
      ]),
      stack('--font-sans', [{ kind: 'system', preset: 'system-ui-sans' }]),
    ];
    expect(fontPairingLabel(stacks, sources)).toBe('serif / System');
  });

  it('names whichever half a theme carries', () => {
    expect(fontPairingLabel([stack('--font-sans', [{ kind: 'project', familyId: 'fam_manrope' }])], sources))
      .toBe('Manrope');
    expect(fontPairingLabel([], sources)).toBe('');
  });
});
