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

  it('drops a duplicate a persisted stack already carries', () => {
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

    const rows = stackEl(target, 'Font Editorial').querySelectorAll<HTMLElement>('.slot-row');
    expect(rows.length).toBe(2);
    expect(
      Array.from(rows).map((r) => r.querySelector<HTMLSelectElement>('select.slot-select')!.value),
    ).toEqual(['system:system-ui-sans', 'generic:sans-serif']);
    unmount(component);
  });

  it('no row offers a value another row in the same stack holds', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const component = mount(FontStackEditor, { target, props: {} });
    flushSync();

    const rows = stackEl(target, 'Font Editorial').querySelectorAll<HTMLElement>('.slot-row');
    const primary = Array.from(
      rows[0].querySelectorAll<HTMLOptionElement>('option'),
    ).map((o) => o.value);
    expect(primary).toContain('project:src_inter:inter');
    expect(primary).not.toContain('system:system-ui-sans');
    expect(primary).not.toContain('generic:sans-serif');
    unmount(component);
  });

  it('adds a project font the stack lacks before any fallback', () => {
    __resetForTests();
    seedFontsFromColorsAndType(
      [
        ...sources,
        {
          id: 'src_domine',
          kind: 'font-face',
          label: 'Domine',
          cssText: '@font-face { font-family: "Domine"; src: local("Domine"); }',
          families: [{ id: 'src_domine:domine', name: 'Domine', cssName: '"Domine"' }],
        },
      ],
      stacks,
    );
    const target = document.createElement('div');
    document.body.appendChild(target);
    const component = mount(FontStackEditor, { target, props: {} });
    flushSync();

    const add = stackEl(target, 'Font Editorial').querySelector<HTMLButtonElement>('button.add-fallback')!;
    expect(add.textContent?.trim()).toBe('+ add Domine');
    add.click();
    flushSync();

    // Joins the other fonts, above the fallbacks.
    expect(slotsOf('--font-editorial')).toEqual([
      { kind: 'project', familyId: 'src_inter:inter' },
      { kind: 'project', familyId: 'src_domine:domine' },
      { kind: 'system', preset: 'system-ui-sans' },
      { kind: 'generic', value: 'sans-serif' },
    ]);
    unmount(component);
  });
});
