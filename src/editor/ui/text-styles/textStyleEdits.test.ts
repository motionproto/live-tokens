// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import {
  __resetForTests,
  editorState,
  mutate,
  toColorsAndType,
  undo,
} from '../../core/store/editorStore';
import {
  EDITABLE_NAMES,
  STEPS,
  USAGES,
  recommend,
  recommendedEditedExpression,
  scalePx,
  typeScaleDeclarations,
} from '../../core/typeScale/typeScale';
import { EYEBROW, sizesOf, stepTarget, textStyleEdits } from './textStyleEdits';

const DECLARED = new Map(typeScaleDeclarations().map((d) => [d.name, d.value]));
const edits = textStyleEdits((name) => DECLARED.get(name) ?? null);
const stored = () => get(editorState).cssVars;
const H1 = stepTarget('heading', 'xl');
const H1_DESKTOP_PX = scalePx(1.5, 1.25, 'xl');

beforeEach(() => {
  __resetForTests();
});

describe('size edits', () => {
  it('stores a size edit as a rem literal under the editable name', () => {
    edits.setSize(H1, 'phone', 30);
    expect(stored()).toEqual({ '--heading-xl-phone-font-size': '1.875rem' });
  });

  it('deletes the key when the typed size matches its recommendation', () => {
    edits.setSize(H1, 'phone', 30);
    edits.setSize(H1, 'phone', recommend(H1_DESKTOP_PX, 0.63) + 0.04);
    expect(stored()).toEqual({});
  });

  it('writes both recommendation expressions with a desktop edit and keeps an edited phone size', () => {
    edits.setSize(H1, 'phone', 30);
    edits.setSize(H1, 'desktop', 40);
    expect(stored()).toEqual({
      '--heading-xl-desktop-font-size': '2.5rem',
      '--heading-xl-tablet-font-size': recommendedEditedExpression('--heading-xl', 2.5, 'tablet'),
      '--heading-xl-phone-font-size': '1.875rem',
    });
  });

  it('deletes the recommendation expressions when the desktop edit clears', () => {
    edits.setSize(H1, 'phone', 30);
    edits.setSize(H1, 'desktop', 40);
    edits.setSize(H1, 'desktop', H1_DESKTOP_PX);
    expect(stored()).toEqual({ '--heading-xl-phone-font-size': '1.875rem' });
  });

  it('recommends tablet and phone sizes from an edited desktop size', () => {
    edits.setSize(H1, 'desktop', 40);
    const sizes = sizesOf(edits.view(), H1);
    expect(sizes.desktop).toMatchObject({ px: 40, edited: true });
    expect(sizes.tablet.px).toBeCloseTo(recommend(40, 0.75), 6);
    expect(sizes.tablet.edited).toBe(false);
  });

  it('resets a tablet size under an edited desktop to the edited recommendation', () => {
    edits.setSize(H1, 'desktop', 40);
    edits.setSize(H1, 'tablet', 33);
    edits.resetSize(H1, 'tablet');
    expect(stored()['--heading-xl-tablet-font-size']).toBe(
      recommendedEditedExpression('--heading-xl', 2.5, 'tablet'),
    );
  });

  it('undoes a desktop edit and its recommendations in one step', () => {
    edits.setSize(H1, 'desktop', 40);
    undo();
    expect(stored()).toEqual({});
  });

  it('clamps a size to the input range', () => {
    edits.setSize(H1, 'desktop', 2);
    expect(stored()['--heading-xl-desktop-font-size']).toBe('0.375rem');
  });
});

describe('eyebrow sizes', () => {
  it('follows body sm on every viewport until its desktop size holds an edit', () => {
    edits.setSize(stepTarget('body', 'sm'), 'phone', 13);
    const sizes = sizesOf(edits.view(), EYEBROW);
    expect(sizes.desktop.px).toBeCloseTo(scalePx(1, 1.125, 'sm'), 6);
    expect(sizes.phone).toMatchObject({ px: 13, edited: false });
  });

  it('writes edited recommendations once its desktop size holds an edit', () => {
    edits.setSize(EYEBROW, 'desktop', 12);
    expect(stored()).toEqual({
      '--eyebrow-desktop-font-size': '0.75rem',
      '--eyebrow-tablet-font-size': recommendedEditedExpression('--eyebrow', 0.75, 'tablet'),
      '--eyebrow-phone-font-size': recommendedEditedExpression('--eyebrow', 0.75, 'phone'),
    });
  });
});

describe('links', () => {
  it('unlinks a step face by storing the usage face', () => {
    edits.writeToken('--heading-font-family', '--font-serif');
    edits.toggleLink(H1, 'font-family');
    expect(stored()['--heading-xl-font-family']).toBe('var(--font-serif)');
  });

  it('relinks by deleting the key when the declared value is the link', () => {
    edits.toggleLink(H1, 'font-weight');
    edits.toggleLink(H1, 'font-weight');
    expect(stored()).toEqual({});
  });

  it('relinks a pinned step by storing the link expression', () => {
    edits.toggleLink(stepTarget('heading', 'sm'), 'font-family');
    expect(stored()).toEqual({ '--heading-sm-font-family': 'var(--heading-font-family)' });
  });

  it('links the eyebrow to the body usage', () => {
    edits.toggleLink(EYEBROW, 'font-weight');
    expect(stored()).toEqual({ '--eyebrow-font-weight': 'var(--font-weight-normal)' });
  });
});

describe('settings', () => {
  it('stores a base typed in px as a rem count', () => {
    edits.setBase('heading', 32);
    expect(stored()).toEqual({ '--heading-scale-base': '2' });
  });

  it('deletes a setting typed back to its declared value', () => {
    edits.setBase('heading', 32);
    edits.setBase('heading', 24);
    edits.setRatio('code', 1.5);
    edits.setRatio('code', 1.125);
    expect(stored()).toEqual({});
  });

  it('stores a selector token as a var() reference and deletes it on reset', () => {
    edits.writeToken('--display-font-weight', '--font-weight-bold');
    expect(stored()).toEqual({ '--display-font-weight': 'var(--font-weight-bold)' });
    edits.writeToken('--display-font-weight', null);
    expect(stored()).toEqual({});
  });

  it('clamps compression to its slider range', () => {
    edits.setCompression('phone', 0.1);
    expect(stored()).toEqual({ '--type-phone-scale-compression': '0.4' });
  });
});

describe('resets', () => {
  beforeEach(() => {
    edits.setCompression('tablet', 0.8);
    edits.setBase('heading', 32);
    edits.setSize(H1, 'desktop', 40);
    edits.setBase('body', 18);
    edits.setSize(EYEBROW, 'phone', 13);
    mutate('seed', (s) => {
      s.cssVars['--space-4'] = '5px';
    });
  });

  it('deletes only the key a value reset names', () => {
    edits.resetKey('--heading-scale-base');
    expect(stored()).not.toHaveProperty('--heading-scale-base');
    expect(stored()).toHaveProperty('--heading-xl-desktop-font-size');
  });

  it('resets one usage and leaves the others', () => {
    edits.resetUsage('heading');
    expect(stored()).toEqual({
      '--type-tablet-scale-compression': '0.8',
      '--body-scale-base': '1.125',
      '--eyebrow-phone-font-size': '0.8125rem',
      '--space-4': '5px',
    });
  });

  it('resets the eyebrow with the body usage', () => {
    edits.resetUsage('body');
    expect(stored()).not.toHaveProperty('--body-scale-base');
    expect(stored()).not.toHaveProperty('--eyebrow-phone-font-size');
    expect(stored()).toHaveProperty('--heading-scale-base');
  });

  it('resets every type-scale key and keeps other variables', () => {
    edits.resetAll();
    expect(stored()).toEqual({ '--space-4': '5px' });
  });
});

it('writes only editable names', () => {
  const targets = [...USAGES.flatMap((u) => STEPS.map((s) => stepTarget(u, s))), EYEBROW];
  edits.setCompression('tablet', 0.9);
  for (const usage of USAGES) {
    edits.setBase(usage, 20);
    edits.setRatio(usage, 1.3);
  }
  for (const target of targets) {
    edits.setSize(target, 'tablet', 15);
    edits.setSize(target, 'desktop', 30);
    edits.setSize(target, 'phone', 14);
    edits.toggleLink(target, 'font-family');
    edits.toggleLink(target, 'font-weight');
    edits.writeToken(`${target.prefix}-line-height`, '--line-height-relaxed');
    edits.writeToken(`${target.prefix}-letter-spacing`, '--letter-spacing-wide');
  }
  edits.writeToken('--eyebrow-text-transform', 'uppercase');

  const names = Object.keys(stored());
  expect(names.length).toBeGreaterThan(targets.length * 5);
  expect(names.filter((name) => !EDITABLE_NAMES.has(name))).toEqual([]);
});

it('carries an edited key into the saved cssVariables', () => {
  edits.setSize(H1, 'desktop', 40);
  const file = toColorsAndType(get(editorState), { name: 'edited' });
  expect(file.cssVariables['--heading-xl-desktop-font-size']).toBe('2.5rem');
  expect(file.cssVariables).not.toHaveProperty('--heading-xl-font-size');
});
