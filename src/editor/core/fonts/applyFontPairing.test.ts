import { describe, it, expect } from 'vitest';
import { applyFontPairing } from './applyFontPairing';
import type { ColorsAndType } from '../themes/themeTypes';

const GOOGLE = 'https://fonts.googleapis.com/css2?family=';

function doc(): ColorsAndType {
  return {
    name: 'Fixture',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    editorConfigs: { brand: { seed: '#123456' } as never },
    cssVariables: { '--surface-default': 'oklch(0.9 0 0)' },
    harmonyAxes: [{ id: 'a', hue: 200 } as never],
    fontSources: [
      {
        id: 'src_old_quicksand',
        kind: 'google',
        url: `${GOOGLE}Quicksand:wght@300..700&display=swap`,
        families: [{ id: 'src_old_quicksand:quicksand', name: 'Quicksand', cssName: '"Quicksand"' }],
      },
      {
        id: 'src_typekit_abc',
        kind: 'typekit',
        url: 'https://use.typekit.net/abc.css',
        families: [{ id: 'src_typekit_abc:fira-code', name: 'Fira Code', cssName: '"Fira Code"' }],
      },
    ],
    fontStacks: [
      {
        variable: '--font-display',
        slots: [{ kind: 'project', familyId: 'src_old_quicksand:quicksand' }, { kind: 'generic', value: 'serif' }],
      },
      {
        variable: '--font-sans',
        slots: [{ kind: 'system', preset: 'system-ui-sans' }, { kind: 'generic', value: 'sans-serif' }],
      },
      { variable: '--font-serif', slots: [{ kind: 'generic', value: 'serif' }] },
      {
        variable: '--font-mono',
        slots: [{ kind: 'project', familyId: 'src_typekit_abc:fira-code' }, { kind: 'generic', value: 'monospace' }],
      },
    ],
  } as ColorsAndType;
}

const pairing = {
  display: { name: 'Cinzel', url: `${GOOGLE}Cinzel:wght@400..900&display=swap`, weights: [400, 500, 600, 700, 800, 900] },
  body: { name: 'Lato', url: `${GOOGLE}Lato:wght@300;400;700&display=swap` },
};

describe('applyFontPairing', () => {
  it('puts each face at the head of its stack and keeps the fallbacks', () => {
    const { colorsAndType } = applyFontPairing(doc(), pairing);
    const display = colorsAndType.fontStacks!.find((s) => s.variable === '--font-display')!;
    const body = colorsAndType.fontStacks!.find((s) => s.variable === '--font-sans')!;

    expect(display.slots[0]).toEqual({ kind: 'project', familyId: 'src_google_cinzel:cinzel' });
    expect(display.slots.slice(1)).toEqual([{ kind: 'generic', value: 'serif' }]);
    expect(body.slots).toEqual([
      { kind: 'project', familyId: 'src_google_lato:lato' },
      { kind: 'system', preset: 'system-ui-sans' },
      { kind: 'generic', value: 'sans-serif' },
    ]);
  });

  it('drops a source no stack references any more', () => {
    const { colorsAndType, report } = applyFontPairing(doc(), pairing);
    const ids = colorsAndType.fontSources!.map((s) => s.id);
    expect(ids).not.toContain('src_old_quicksand');
    expect(report.dropped.map((d) => d.names).flat()).toEqual(['Quicksand']);
  });

  it('keeps a source an untouched stack still references', () => {
    const { colorsAndType } = applyFontPairing(doc(), pairing);
    expect(colorsAndType.fontSources!.map((s) => s.id)).toContain('src_typekit_abc');
  });

  it('leaves colour untouched', () => {
    const before = doc();
    const { colorsAndType } = applyFontPairing(before, pairing);
    expect(colorsAndType.cssVariables).toEqual(before.cssVariables);
    expect(colorsAndType.editorConfigs).toEqual(before.editorConfigs);
    expect(colorsAndType.harmonyAxes).toEqual(before.harmonyAxes);
  });

  it('does not mutate its input', () => {
    const before = doc();
    applyFontPairing(before, pairing);
    expect(before.fontStacks![0].slots[0]).toEqual({
      kind: 'project',
      familyId: 'src_old_quicksand:quicksand',
    });
  });

  it('is idempotent', () => {
    const once = applyFontPairing(doc(), pairing).colorsAndType;
    const twice = applyFontPairing(once, pairing);
    expect(twice.colorsAndType).toEqual(once);
    expect(twice.report.changed).toBe(false);
  });

  it('reads weights off the URL when the face does not carry them', () => {
    const { colorsAndType } = applyFontPairing(doc(), pairing);
    const lato = colorsAndType.fontSources!.find((s) => s.id === 'src_google_lato')!;
    expect(lato.families[0].weights).toEqual([300, 400, 700]);
  });

  it('stamps preset ids under the preset prefix, display before body', () => {
    const { colorsAndType } = applyFontPairing(doc(), pairing, { idPrefix: 'src_preset_' });
    const stamped = colorsAndType.fontSources!.filter((s) => s.id.startsWith('src_preset_'));
    expect(stamped.map((s) => s.families[0].name)).toEqual(['Cinzel', 'Lato']);
  });

  it('refuses a pairing that names no slot', () => {
    expect(() => applyFontPairing(doc(), {})).toThrow(/names no slot/);
  });
});
