import { describe, expect, it } from 'vitest';
import type { LiveSource } from './themeTypes';
import { countComponentsOffLook, lookProductionState } from './lookSummary';

const comp = (name: string, source: LiveSource) => ({ name, source });

describe('countComponentsOffLook', () => {
  it('counts a buffered component', () => {
    const components = [comp('card', 'working'), comp('button', 'theme')];
    expect(countComponentsOffLook(components)).toBe(1);
  });

  it('counts every buffered component', () => {
    const components = [comp('card', 'working'), comp('button', 'working'), comp('badge', 'theme')];
    expect(countComponentsOffLook(components)).toBe(2);
  });

  it('reports nothing off the theme right after an apply', () => {
    const components = [comp('card', 'theme'), comp('button', 'theme')];
    expect(countComponentsOffLook(components)).toBe(0);
  });

  it('reports zero for an empty list', () => {
    expect(countComponentsOffLook([])).toBe(0);
  });
});

describe('lookProductionState', () => {
  it('reports the look in production when production names the open theme', () => {
    const state = lookProductionState({
      openTheme: 'ocean',
      productionTheme: 'ocean',
      unpublished: false,
    });
    expect(state).toEqual({ inProduction: true, unknown: false, themeOff: false, unpublished: false });
  });

  it('reports out of sync when production ships another theme', () => {
    const state = lookProductionState({
      openTheme: 'my-theme',
      productionTheme: 'ocean',
      unpublished: false,
    });
    expect(state.themeOff).toBe(true);
    expect(state.inProduction).toBe(false);
  });

  it('reports out of sync while the open theme has moved past the bake', () => {
    const state = lookProductionState({
      openTheme: 'ocean',
      productionTheme: 'ocean',
      unpublished: true,
    });
    expect(state.themeOff).toBe(false);
    expect(state.inProduction).toBe(false);
  });

  it('claims neither state until production answers', () => {
    const state = lookProductionState({
      openTheme: 'my-theme',
      productionTheme: null,
      unpublished: false,
    });
    expect(state).toEqual({ inProduction: false, unknown: true, themeOff: false, unpublished: false });
  });
});
