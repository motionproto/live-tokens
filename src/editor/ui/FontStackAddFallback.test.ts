// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';

// happy-dom doesn't implement Element.getAnimations() which animate:flip touches.
if (typeof Element !== 'undefined' && !Element.prototype.getAnimations) {
  (Element.prototype as unknown as { getAnimations: () => unknown[] }).getAnimations = () => [];
}
import { mount, unmount, flushSync } from 'svelte';
import { get } from 'svelte/store';
import FontStackEditor from './FontStackEditor.svelte';
import { editorState, seedFontsFromColorsAndType, __resetForTests } from '../core/store/editorStore';
import type { FontSource, FontStack, FontStackVariable } from '../core/themes/themeTypes';

const sources: FontSource[] = [
  {
    id: 'src_inter',
    kind: 'font-face',
    label: 'Inter',
    cssText: '@font-face { font-family: "Inter"; src: local("Inter"); }',
    families: [{ id: 'src_inter:inter', name: 'Inter', cssName: '"Inter"' }],
  },
];

// The shape every shipped theme uses: the preferred system preset *and* the
// preferred generic are both already present.
const stacks: FontStack[] = [
  {
    variable: '--font-editorial',
    slots: [
      { kind: 'project', familyId: 'src_inter:inter' },
      { kind: 'system', preset: 'system-ui-sans' },
      { kind: 'generic', value: 'sans-serif' },
    ],
  },
];

beforeEach(() => {
  __resetForTests();
  document.body.innerHTML = '';
  seedFontsFromColorsAndType(sources, stacks);
});

function stackEl(target: HTMLElement, label: string): HTMLElement {
  const header = Array.from(target.querySelectorAll('.stack-variable')).find(
    (el) => el.textContent?.trim() === label,
  );
  if (!header) throw new Error(`${label} header not found`);
  return header.closest('.font-stack') as HTMLElement;
}

function slotsOf(variable: FontStackVariable) {
  return get(editorState).fonts.stacks.find((s) => s.variable === variable)!.slots;
}

describe('FontStackEditor add fallback', () => {
  it('never adds a slot the stack already holds', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const component = mount(FontStackEditor, { target, props: {} });
    flushSync();

    const add = stackEl(target, 'Font Editorial').querySelector<HTMLButtonElement>('button.add-fallback')!;
    add.click();
    flushSync();

    const slots = slotsOf('--font-editorial');
    const keys = slots.map((s) =>
      s.kind === 'project' ? `project:${s.familyId}` : s.kind === 'system' ? `system:${s.preset}` : `generic:${s.value}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
    expect(slots.length).toBe(4);
    unmount(component);
  });

  it('keeps the terminal fallback at the bottom', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const component = mount(FontStackEditor, { target, props: {} });
    flushSync();

    const add = stackEl(target, 'Font Editorial').querySelector<HTMLButtonElement>('button.add-fallback')!;
    add.click();
    flushSync();

    const slots = slotsOf('--font-editorial');
    expect(slots[slots.length - 1]).toEqual({ kind: 'generic', value: 'sans-serif' });
    unmount(component);
  });

  it('disables the button once every system and generic fallback is in the stack', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const component = mount(FontStackEditor, { target, props: {} });
    flushSync();

    const add = stackEl(target, 'Font Editorial').querySelector<HTMLButtonElement>('button.add-fallback')!;
    for (let i = 0; i < 10 && !add.disabled; i++) {
      add.click();
      flushSync();
    }

    // 1 project + 3 system presets + 3 generics.
    expect(slotsOf('--font-editorial').length).toBe(7);
    expect(add.disabled).toBe(true);
    unmount(component);
  });

  it('renders a stack that already carries a duplicate instead of throwing', () => {
    __resetForTests();
    seedFontsFromColorsAndType(sources, [
      {
        variable: '--font-editorial',
        slots: [
          { kind: 'system', preset: 'system-ui-sans' },
          { kind: 'system', preset: 'system-ui-sans' },
          { kind: 'generic', value: 'sans-serif' },
        ],
      },
    ]);
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(FontStackEditor, { target, props: {} });
    flushSync();

    expect(stackEl(target, 'Font Editorial').querySelectorAll('.slot-row').length).toBe(3);
    unmount(component);
  });
});
