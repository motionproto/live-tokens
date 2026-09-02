import { describe, it, expect } from 'vitest';
import { rawKind, matchesKind } from './aliasKinds';

/** First match wins, so every rule that ends in `-width`, `-height` or `-size`
    has to be reached before the bare `length` rule. These are the pairs that
    would collide if one moved. */
describe('rawKind', () => {
  it.each([
    ['--widget-panel-width', 'length'],
    ['--widget-panel-height', 'length'],
    ['--widget-avatar-size', 'length'],
    ['--widget-frame-border-width', 'border-width'],
    ['--widget-title-accent-width', 'border-width'],
    ['--widget-bar-divider-width', 'divider-width'],
    ['--widget-bar-divider-height', 'divider-height'],
    ['--widget-track-height', 'divider-height'],
    ['--widget-label-line-height', 'line-height'],
    ['--widget-label-font-size', 'font-size'],
    ['--widget-toggle-icon-size', 'font-size'],
    ['--widget-toggle-thumb-size', 'font-size'],
    ['--widget-marker-dot-size', 'dot-size'],
    ['--widget-frame-surface', 'surface'],
  ])('%s is %s', (variable, kind) => {
    expect(rawKind(variable)).toBe(kind);
  });
});

describe('matchesKind', () => {
  it('does not answer to surface for a bare dimension', () => {
    expect(matchesKind('--widget-panel-width', 'surface')).toBe(false);
    expect(matchesKind('--widget-panel-width', 'length')).toBe(true);
  });
});
