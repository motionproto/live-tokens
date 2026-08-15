import { describe, expect, it } from 'vitest';
import type { LiveSource } from './themeTypes';
import { countComponentsOffLook, lookProductionState } from './lookSummary';

const comp = (name: string, source: LiveSource) => ({ name, source });

describe('countComponentsOffLook', () => {
  it('counts a buffered component the theme does not carry', () => {
    const components = [comp('card', 'working'), comp('button', 'default')];
    expect(countComponentsOffLook(components, {})).toBe(1);
  });

  it('counts a defaulted component the theme carries a config for', () => {
    const components = [comp('card', 'default'), comp('button', 'default')];
    expect(countComponentsOffLook(components, { card: {} })).toBe(1);
  });

  it('reports nothing off the theme right after an apply', () => {
    const components = [comp('card', 'working'), comp('button', 'working'), comp('badge', 'default')];
    expect(countComponentsOffLook(components, { card: {}, button: {} })).toBe(0);
  });

  it('counts a theme-sourced config as running the theme', () => {
    expect(countComponentsOffLook([comp('card', 'theme')], { card: {} })).toBe(0);
  });

  it('treats a missing theme as carrying nothing', () => {
    const components = [comp('card', 'working'), comp('button', 'default')];
    expect(countComponentsOffLook(components, null)).toBe(1);
  });

  it('ignores theme entries for components this install lacks', () => {
    expect(countComponentsOffLook([comp('card', 'working')], { card: {}, stat: {} })).toBe(0);
  });

  it('reports the full-set Default theme in sync while no buffer exists', () => {
    const components = [comp('card', 'default'), comp('button', 'default'), comp('badge', 'default')];
    const fullSet = { card: {}, button: {}, badge: {} };
    expect(countComponentsOffLook(components, fullSet, true)).toBe(0);
  });

  it('counts only buffered components against the Default theme', () => {
    const components = [comp('card', 'working'), comp('button', 'default')];
    const fullSet = { card: {}, button: {} };
    expect(countComponentsOffLook(components, fullSet, true)).toBe(1);
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
