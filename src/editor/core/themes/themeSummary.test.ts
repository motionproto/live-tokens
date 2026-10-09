import { describe, expect, it } from 'vitest';
import type { LiveSource } from './themeTypes';
import { countComponentsOffTheme, themeProductionState } from './themeSummary';

const comp = (name: string, source: LiveSource) => ({ name, source });

describe('countComponentsOffTheme', () => {
  it('counts a buffered component', () => {
    const components = [comp('card', 'working'), comp('button', 'theme')];
    expect(countComponentsOffTheme(components)).toBe(1);
  });

  it('counts every buffered component', () => {
    const components = [comp('card', 'working'), comp('button', 'working'), comp('badge', 'theme')];
    expect(countComponentsOffTheme(components)).toBe(2);
  });

  it('reports nothing off the theme right after an apply', () => {
    const components = [comp('card', 'theme'), comp('button', 'theme')];
    expect(countComponentsOffTheme(components)).toBe(0);
  });

  it('reports zero for an empty list', () => {
    expect(countComponentsOffTheme([])).toBe(0);
  });
});

describe('themeProductionState', () => {
  const baked = (fileName: string) => ({ _fileName: fileName, _baked: true });

  it('reports the theme in production when production names the open theme and its bake is current', () => {
    const state = themeProductionState({ openTheme: 'ocean', production: baked('ocean'), unsaved: false });
    expect(state).toEqual({ inProduction: true, unknown: false, themeOff: false, unpublished: false });
  });

  it('reports out of sync when production ships another theme', () => {
    const state = themeProductionState({ openTheme: 'my-theme', production: baked('ocean'), unsaved: false });
    expect(state.themeOff).toBe(true);
    expect(state.inProduction).toBe(false);
  });

  it('reports out of sync while the live state holds unsaved changes', () => {
    const state = themeProductionState({ openTheme: 'ocean', production: baked('ocean'), unsaved: true });
    expect(state.themeOff).toBe(false);
    expect(state.unpublished).toBe(true);
    expect(state.inProduction).toBe(false);
  });

  it('reports out of sync when the server says the bake predates the saved theme', () => {
    const state = themeProductionState({
      openTheme: 'ocean',
      production: { _fileName: 'ocean', _baked: false },
      unsaved: false,
    });
    expect(state.themeOff).toBe(false);
    expect(state.unpublished).toBe(true);
    expect(state.inProduction).toBe(false);
  });

  it('claims neither state until production answers', () => {
    const state = themeProductionState({ openTheme: 'my-theme', production: null, unsaved: false });
    expect(state).toEqual({ inProduction: false, unknown: true, themeOff: false, unpublished: false });
  });
});
