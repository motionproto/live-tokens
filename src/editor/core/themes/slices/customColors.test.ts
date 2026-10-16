// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import type { ColorsAndType } from '../themeTypes';
import type { CustomColorToken } from '../../store/editorTypes';
import { palettesToValues } from '../../palettes/paletteDerivation';
import { defaultPaletteConfig } from '../../../ui/palette/paletteMath';
import {
  editorState,
  mutate,
  undo,
  loadFromFile,
  toColorsAndType,
  colorsAndTypeDirty,
  addCustomColor,
  setCustomColor,
  removeCustomColor,
  nextCustomColorSlot,
  customColorUsages,
  describeCustomColorUsages,
  nearestColorToken,
  replaceAndRemoveCustomColor,
  __resetForTests,
  __getHistoryLengths,
} from '../../store/editorStore';

function makeColorsAndType(overrides: Partial<ColorsAndType> = {}): ColorsAndType {
  return { name: 't', createdAt: '', updatedAt: '', editorConfigs: {}, cssVariables: {}, ...overrides };
}

const TEAL = { l: 0.62, c: 0.11, h: 190 };
const ROSE = { l: 0.7, c: 0.14, h: 10 };

beforeEach(() => {
  __resetForTests();
});

describe('custom colours — file round trip', () => {
  it('saves the list and its rendered vars, and a reload restores the list and sheds the vars', () => {
    addCustomColor(TEAL);
    addCustomColor(ROSE);
    const file = toColorsAndType(get(editorState), { name: 't' });
    expect(file.customColors).toEqual([
      { variable: '--color-custom-1', color: TEAL },
      { variable: '--color-custom-2', color: ROSE },
    ]);
    expect(file.cssVariables['--color-custom-1']).toBe('oklch(0.62 0.11 190)');

    loadFromFile(JSON.parse(JSON.stringify(file)));
    const s = get(editorState);
    expect(s.customColors.tokens).toEqual(file.customColors);
    expect(s.cssVars['--color-custom-1']).toBeUndefined();
    expect(get(colorsAndTypeDirty)).toBe(false);
    expect(toColorsAndType(s, { name: 't' }).customColors).toEqual(file.customColors);
  });

  it('a file without the field loads an empty list, keeps its bag, and saves no field', () => {
    loadFromFile(makeColorsAndType({ cssVariables: { '--other': '1px' } }));
    const s = get(editorState);
    expect(s.customColors.tokens).toEqual([]);
    expect(s.cssVars).toEqual({ '--other': '1px' });
    const file = toColorsAndType(s, { name: 't' });
    expect('customColors' in file).toBe(false);
    expect(Object.keys(file.cssVariables).filter((k) => k.startsWith('--color-custom-'))).toEqual([]);
  });
});

describe('custom colours — slots', () => {
  it('nextCustomColorSlot takes the lowest free number', () => {
    const at = (...ns: number[]): CustomColorToken[] =>
      ns.map((n) => ({ variable: `--color-custom-${n}`, color: TEAL }));
    expect(nextCustomColorSlot([])).toBe('--color-custom-1');
    expect(nextCustomColorSlot(at(1, 3))).toBe('--color-custom-2');
    expect(nextCustomColorSlot(at(1, 2))).toBe('--color-custom-3');
  });

  it('a removed number is reused by the next add', () => {
    addCustomColor(TEAL);
    addCustomColor(ROSE);
    expect(removeCustomColor('--color-custom-1')).toBe(true);
    expect(addCustomColor(TEAL)).toBe('--color-custom-1');
  });

  it('setCustomColor moves the rendered value', () => {
    const v = addCustomColor(TEAL);
    setCustomColor(v, ROSE);
    expect(toColorsAndType(get(editorState), { name: 't' }).cssVariables[v]).toBe('oklch(0.7 0.14 10)');
  });
});

function seedUsages(): void {
  addCustomColor(TEAL);
  addCustomColor(ROSE);
  mutate('seed usages', (s) => {
    s.components.button = {
      aliases: {
        '--button-bg': { kind: 'token', name: '--color-custom-1' },
        '--button-border': { kind: 'token', name: '--color-custom-1', opacity: 60 },
        '--button-text': { kind: 'token', name: '--color-custom-2' },
        '--button-sheen': {
          kind: 'literal',
          value: 'linear-gradient(30deg, color-mix(in srgb, var(--color-custom-1) 40%, transparent) 0%, var(--color-custom-10) 100%)',
        },
      },
      config: {},
    };
    s.components.card = {
      aliases: {
        '--card-glow': {
          kind: 'gradient',
          value: { type: 'linear', angle: 90, stops: [
            { position: 0, color: '--color-custom-1', opacity: 50 },
            { position: 100, color: '--color-brand-500' },
          ] },
        },
      },
      config: {},
    };
    s.gradients.tokens[1].stops[0].color = '--color-custom-1';
    s.washes.scrim.color = '--color-custom-1';
  });
}

describe('custom colours — usages', () => {
  it('finds component aliases, inline and library gradient stops, and wash colours', () => {
    seedUsages();
    expect(customColorUsages(get(editorState), '--color-custom-1')).toEqual([
      { kind: 'alias', component: 'button', property: '--button-bg' },
      { kind: 'alias', component: 'button', property: '--button-border' },
      { kind: 'alias', component: 'button', property: '--button-sheen' },
      { kind: 'alias', component: 'card', property: '--card-glow' },
      { kind: 'gradient', gradient: '--gradient-2' },
      { kind: 'wash', family: 'scrim' },
    ]);
  });

  it('the usage line names components, library gradients and washes', () => {
    seedUsages();
    const label = (id: string) => ({ button: 'Button', card: 'Card' })[id] ?? id;
    const s = get(editorState);
    expect(describeCustomColorUsages(customColorUsages(s, '--color-custom-1'), label))
      .toBe('Used by 4 properties in Button and Card, Gradient 2 and the scrim colour.');
    expect(describeCustomColorUsages(customColorUsages(s, '--color-custom-2'), label))
      .toBe('Used by 1 property in Button.');
  });

  it('removeCustomColor refuses a colour a slot names', () => {
    seedUsages();
    const before = __getHistoryLengths().past;
    expect(removeCustomColor('--color-custom-2')).toBe(false);
    expect(get(editorState).customColors.tokens).toHaveLength(2);
    expect(__getHistoryLengths().past).toBe(before);
  });

  it('replaceAndRemoveCustomColor rewrites every reference, keeps opacity, and undoes in one step', () => {
    seedUsages();
    const before = structuredClone(get(editorState));
    const pastBefore = __getHistoryLengths().past;

    replaceAndRemoveCustomColor('--color-custom-1', '--color-brand-500');
    const s = get(editorState);
    expect(s.components.button.aliases['--button-bg']).toEqual({ kind: 'token', name: '--color-brand-500' });
    expect(s.components.button.aliases['--button-border']).toEqual({ kind: 'token', name: '--color-brand-500', opacity: 60 });
    expect(s.components.button.aliases['--button-text']).toEqual({ kind: 'token', name: '--color-custom-2' });
    expect(s.components.button.aliases['--button-sheen']).toEqual({
      kind: 'literal',
      value: 'linear-gradient(30deg, color-mix(in srgb, var(--color-brand-500) 40%, transparent) 0%, var(--color-custom-10) 100%)',
    });
    const glow = s.components.card.aliases['--card-glow'];
    expect(glow.kind === 'gradient' && glow.value.stops[0]).toEqual({ position: 0, color: '--color-brand-500', opacity: 50 });
    expect(s.gradients.tokens[1].stops[0].color).toBe('--color-brand-500');
    expect(s.washes.scrim.color).toBe('--color-brand-500');
    expect(s.customColors.tokens.map((t) => t.variable)).toEqual(['--color-custom-2']);
    expect(customColorUsages(s, '--color-custom-1')).toEqual([]);
    expect(__getHistoryLengths().past).toBe(pastBefore + 1);

    undo();
    expect(get(editorState)).toEqual(before);
  });
});

describe('custom colours — nearestColorToken', () => {
  it('picks the nearest of White, Black and the other custom colours', () => {
    addCustomColor(TEAL);
    addCustomColor({ l: 0.6, c: 0.1, h: 195 });
    const s = get(editorState);
    expect(nearestColorToken(TEAL, s)).toBe('--color-custom-1');
    expect(nearestColorToken(TEAL, s, '--color-custom-1')).toBe('--color-custom-2');
    expect(nearestColorToken({ l: 0.97, c: 0.01, h: 90 }, s)).toBe('--color-white');
  });

  it('includes the palette steps', () => {
    loadFromFile(makeColorsAndType({
      editorConfigs: { Brand: defaultPaletteConfig({ baseColor: { l: 0.56, c: 0.18, h: 25 } }) },
    }));
    const s = get(editorState);
    const brand600 = palettesToValues(s.palettes)['--color-brand-600'];
    expect(brand600.kind === 'color' && nearestColorToken(brand600, s)).toBe('--color-brand-600');
  });
});
