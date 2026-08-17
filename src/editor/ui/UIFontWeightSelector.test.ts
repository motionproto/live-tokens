// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import UIFontWeightSelector from './UIFontWeightSelector.svelte';
import {
  __resetForTests,
  seedFontsFromColorsAndType,
} from '../core/store/editorStore';
import { setCssVar } from '../core/cssVarSync';
import type { FontSource, FontStack } from '../core/themes/themeTypes';

const sources: FontSource[] = [
  {
    id: 'src_comfortaa',
    kind: 'font-face',
    cssText: '@font-face { font-family: "Comfortaa"; src: local("Comfortaa"); }',
    families: [{
      id: 'src_comfortaa:comfortaa',
      name: 'Comfortaa',
      cssName: '"Comfortaa"',
      weights: [300, 400, 500, 600, 700],
    }],
  },
  {
    id: 'src_unknown',
    kind: 'font-face',
    cssText: '@font-face { font-family: "Mystery"; src: local("Mystery"); }',
    families: [{
      id: 'src_unknown:mystery',
      name: 'Mystery',
      cssName: '"Mystery"',
    }],
  },
];

const stacks: FontStack[] = [
  {
    variable: '--font-display',
    slots: [
      { kind: 'project', familyId: 'src_comfortaa:comfortaa' },
      { kind: 'generic', value: 'sans-serif' },
    ],
  },
];

beforeEach(() => {
  __resetForTests();
  document.body.innerHTML = '';
  document.documentElement.style.removeProperty('--heading-xl-font-family');
  document.documentElement.style.removeProperty('--heading-xl-font-weight');
  seedFontsFromColorsAndType(sources, stacks);
});

function optionByLabel(target: HTMLElement, label: string): HTMLButtonElement {
  const option = Array.from(target.querySelectorAll<HTMLButtonElement>('button.ui-option-item'))
    .find((button) => button.querySelector('.ui-option-label')?.textContent?.trim() === label);
  if (!option) throw new Error(`Font weight option not found: ${label}`);
  return option;
}

function openSelector(target: HTMLElement): void {
  target.querySelector<HTMLButtonElement>('button.ui-ts-trigger')?.click();
  flushSync();
}

describe('UIFontWeightSelector weight availability', () => {
  it('disables weights not declared by the selected font', () => {
    document.documentElement.style.setProperty('--heading-xl-font-family', 'var(--font-display)');
    const target = document.createElement('div');
    document.body.appendChild(target);
    const component = mount(UIFontWeightSelector, {
      target,
      props: { variable: '--heading-xl-font-weight' },
    });
    flushSync();
    openSelector(target);

    expect(optionByLabel(target, 'Thin').disabled).toBe(true);
    expect(optionByLabel(target, 'Extra Bold').disabled).toBe(true);
    expect(optionByLabel(target, 'Black').disabled).toBe(true);
    expect(optionByLabel(target, 'Light').disabled).toBe(false);
    expect(optionByLabel(target, 'Bold').disabled).toBe(false);
    expect(optionByLabel(target, 'Extra Bold').title)
      .toBe('Extra Bold is not available for Comfortaa');

    unmount(component);
  });

  it('updates when the companion font-family token changes', () => {
    document.documentElement.style.setProperty('--heading-xl-font-family', 'var(--font-display)');
    const target = document.createElement('div');
    document.body.appendChild(target);
    const component = mount(UIFontWeightSelector, {
      target,
      props: { variable: '--heading-xl-font-weight' },
    });
    flushSync();
    openSelector(target);
    expect(optionByLabel(target, 'Extra Bold').disabled).toBe(true);

    setCssVar('--heading-xl-font-family', '"Mystery", sans-serif');
    flushSync();
    expect(optionByLabel(target, 'Extra Bold').disabled).toBe(false);

    unmount(component);
  });
});
