// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from 'vitest';
import type { FontSource, FontStack } from '../themes/themeTypes';
import {
  __resetForTests,
  clearComponentAlias,
  mutate,
  redo,
  setComponentAlias,
  setFontSources,
  setFontStacks,
  undo,
} from './editorStore';

const source: FontSource = {
  id: 'audit-face',
  kind: 'font-face',
  label: 'Audit Face',
  cssText: '@font-face { font-family: "Audit Face"; src: local("Audit Face"); }',
  families: [{ id: 'audit-face:regular', name: 'Audit Face', cssName: '"Audit Face"' }],
};

const sansStack: FontStack = {
  variable: '--font-sans',
  slots: [
    { kind: 'project', familyId: 'audit-face:regular' },
    { kind: 'generic', value: 'sans-serif' },
  ],
};

function fontNode(): Element | null {
  return document.head.querySelector('[data-font-source-id="audit-face"]');
}

beforeEach(() => {
  __resetForTests();
  document.documentElement.removeAttribute('style');
  document.head.querySelectorAll('[data-font-source-id]').forEach((node) => node.remove());
});

describe('editor renderer reactive projection', () => {
  it('projects a representative cross-domain theme mutation in one pass', () => {
    mutate('reactive matrix', (state) => {
      state.cssVars['--font-size-5xl'] = '52px';
      state.columns.count = 10;
      state.overlays.tokens[0].opacity = 0.5;
      state.shadows.tokens = [{
        variable: '--shadow-sm',
        x: 1,
        y: 2,
        blur: 3,
        spread: 0,
        opacity: 0.25,
        hue: 200,
        saturation: 20,
        lightness: 10,
        angle: 117,
        distance: 2,
      }];
      state.gradients.tokens[0].angle = 22;
      state.components.sectiondivider = {
        aliases: {
          '--sectiondivider-lg-title-font-size': { kind: 'token', name: '--font-size-5xl' },
          '--sectiondivider-lg-title-font-weight': { kind: 'token', name: '--font-weight-bold' },
          '--sectiondivider-lg-title-outline-color': { kind: 'token', name: '--color-danger-600' },
          '--sectiondivider-lg-description-display': { kind: 'literal', value: 'none' },
        },
        config: {},
      };
    });

    const style = document.documentElement.style;
    expect(style.getPropertyValue('--font-size-5xl')).toBe('52px');
    expect(style.getPropertyValue('--columns-count')).toBe('10');
    expect(style.getPropertyValue('--overlay-low')).toContain('50%');
    expect(style.getPropertyValue('--shadow-sm')).toBe('1px 2px 3px 0px hsla(200, 20%, 10%, 0.25)');
    expect(style.getPropertyValue('--gradient-1')).toContain('22deg');
    expect(style.getPropertyValue('--sectiondivider-lg-title-font-size')).toBe('var(--font-size-5xl)');
    expect(style.getPropertyValue('--sectiondivider-lg-title-font-weight')).toBe('var(--font-weight-bold)');
    expect(style.getPropertyValue('--sectiondivider-lg-title-outline-color')).toBe('var(--color-danger-600)');
    expect(style.getPropertyValue('--sectiondivider-lg-description-display')).toBe('none');
  });

  it('projects representative component typography edits and removals immediately', () => {
    setComponentAlias('sectiondivider', '--sectiondivider-lg-title-font-size', {
      kind: 'token',
      name: '--font-size-5xl',
    });
    setComponentAlias('sectiondivider', '--sectiondivider-lg-title-font-weight', {
      kind: 'token',
      name: '--font-weight-bold',
    });

    const style = document.documentElement.style;
    expect(style.getPropertyValue('--sectiondivider-lg-title-font-size')).toBe('var(--font-size-5xl)');
    expect(style.getPropertyValue('--sectiondivider-lg-title-font-weight')).toBe('var(--font-weight-bold)');

    clearComponentAlias('sectiondivider', '--sectiondivider-lg-title-font-size');
    expect(style.getPropertyValue('--sectiondivider-lg-title-font-size')).toBe('');
  });

  it('owns font stack set, removal, undo, and redo', () => {
    setFontSources([source]);
    setFontStacks([sansStack]);

    const style = document.documentElement.style;
    expect(style.getPropertyValue('--font-sans')).toBe('"Audit Face", sans-serif');

    setFontStacks([]);
    expect(style.getPropertyValue('--font-sans')).toBe('');

    expect(undo()).toBe(true);
    expect(style.getPropertyValue('--font-sans')).toBe('"Audit Face", sans-serif');

    expect(redo()).toBe(true);
    expect(style.getPropertyValue('--font-sans')).toBe('');
  });

  it('owns font source set, removal, undo, and redo', () => {
    setFontSources([source]);
    expect(fontNode()).not.toBeNull();

    setFontSources([]);
    expect(fontNode()).toBeNull();

    expect(undo()).toBe(true);
    expect(fontNode()).not.toBeNull();

    expect(redo()).toBe(true);
    expect(fontNode()).toBeNull();
  });
});
