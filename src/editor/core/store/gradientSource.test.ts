import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { componentGradientSource } from './gradientSource';
import { editorState, setComponentAlias, __resetForTests } from './editorStore';
import type { GradientAliasValue } from './editorTypes';

const COMPONENT = 'sectiondivider';
const VAR = '--sectiondivider-lg-background';

function source() {
  return componentGradientSource(COMPONENT, VAR);
}
function aliasNow() {
  return get(editorState).components[COMPONENT]?.aliases[VAR];
}

beforeEach(() => {
  __resetForTests();
});

describe('componentGradientSource — flat-alias synthesis', () => {
  it('renders a transparent token alias as a none fill (so the editor shows up)', () => {
    setComponentAlias(COMPONENT, VAR, { kind: 'token', name: '--color-transparent' });
    const snap = get(source().current)!;
    expect(snap.type).toBe('none');
    expect(snap.stops.length).toBe(1);
  });

  it('renders a flat colour token alias as a solid fill carrying that colour', () => {
    setComponentAlias(COMPONENT, VAR, { kind: 'token', name: '--surface-canvas-low', opacity: 40 });
    const snap = get(source().current)!;
    expect(snap.type).toBe('solid');
    expect(snap.stops[0].color).toBe('--surface-canvas-low');
    expect(snap.stops[0].opacity).toBe(40);
  });

  it('renders a missing alias as a none fill', () => {
    const snap = get(source().current)!;
    expect(snap.type).toBe('none');
  });

  it('passes an existing gradient alias through unchanged', () => {
    const value: GradientAliasValue = {
      type: 'linear', angle: 90,
      stops: [{ position: 0, color: '--surface-brand', opacity: 100 }, { position: 100, color: '--surface-brand-low', opacity: 80 }],
    };
    setComponentAlias(COMPONENT, VAR, { kind: 'gradient', value });
    const snap = get(source().current)!;
    expect(snap.type).toBe('linear');
    expect(snap.angle).toBe(90);
    expect(snap.stops.length).toBe(2);
  });

  it('promotes a flat colour to a real gradient when the user picks a stop colour', () => {
    setComponentAlias(COMPONENT, VAR, { kind: 'token', name: '--surface-canvas-low' });
    source().setStop(0, { color: '--surface-brand-500' });
    const ref = aliasNow();
    expect(ref?.kind).toBe('gradient');
    expect((ref as { kind: 'gradient'; value: GradientAliasValue }).value.stops[0].color).toBe('--surface-brand-500');
  });

  it('expands a flat fill into two endpoints when switched to linear', () => {
    setComponentAlias(COMPONENT, VAR, { kind: 'token', name: '--surface-canvas-low' });
    source().setType('linear');
    const ref = aliasNow();
    expect(ref?.kind).toBe('gradient');
    const value = (ref as { kind: 'gradient'; value: GradientAliasValue }).value;
    expect(value.type).toBe('linear');
    expect(value.stops.length).toBe(2);
    expect(value.stops.map((s) => s.position)).toEqual([0, 100]);
    expect(value.stops.every((s) => s.color === '--surface-canvas-low')).toBe(true);
  });
});
