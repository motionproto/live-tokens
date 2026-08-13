import { describe, expect, it } from 'vitest';
import { countComponentsOffLook } from './lookSummary';

const comp = (name: string, activeFile: string) => ({
  name,
  activeFile,
  productionFile: activeFile,
});

describe('countComponentsOffLook', () => {
  it('counts a customised component the look does not carry', () => {
    const components = [comp('card', 'my-card'), comp('button', 'default')];
    expect(countComponentsOffLook(components, {})).toBe(1);
  });

  it('counts a defaulted component the look carries a config for', () => {
    const components = [comp('card', 'default'), comp('button', 'default')];
    expect(countComponentsOffLook(components, { card: {} })).toBe(1);
  });

  it('reports nothing off the look right after an apply', () => {
    const components = [comp('card', 'ocean'), comp('button', 'ocean'), comp('badge', 'default')];
    expect(countComponentsOffLook(components, { card: {}, button: {} })).toBe(0);
  });

  it('leaves an adopted config in sync whatever file it lives in', () => {
    const components = [comp('card', 'my-card')];
    expect(countComponentsOffLook(components, { card: {} })).toBe(0);
  });

  it('treats a missing look as carrying nothing', () => {
    const components = [comp('card', 'my-card'), comp('button', 'default')];
    expect(countComponentsOffLook(components, null)).toBe(1);
  });

  it('ignores look entries for components this install lacks', () => {
    expect(countComponentsOffLook([comp('card', 'ocean')], { card: {}, stat: {} })).toBe(0);
  });

  it('reports the full-set Default look in sync when every pointer is default', () => {
    const components = [comp('card', 'default'), comp('button', 'default'), comp('badge', 'default')];
    const fullSet = { card: {}, button: {}, badge: {} };
    expect(countComponentsOffLook(components, fullSet, true)).toBe(0);
  });

  it('counts only customised components against the Default look', () => {
    const components = [comp('card', 'my-card'), comp('button', 'default')];
    const fullSet = { card: {}, button: {} };
    expect(countComponentsOffLook(components, fullSet, true)).toBe(1);
  });
});
