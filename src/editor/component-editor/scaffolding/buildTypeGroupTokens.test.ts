// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  structuralGroupKey,
  buildTypeGroupColorTokens,
  buildTypeGroupTokens,
  buildTypeGroupFontTokens,
} from './buildTypeGroupTokens';
import type { TypeGroupConfig } from './types';

const keyOf = (tokens: { variable: string; groupKey?: string }[], variable: string) =>
  tokens.find((t) => t.variable === variable)?.groupKey;

describe('structuralGroupKey', () => {
  it('strips the leading variant segment (Badge-shaped): collapses across variants', () => {
    const d = { component: 'badge', variants: ['primary', 'accent'] };
    expect(structuralGroupKey('--badge-primary-text', d)).toBe('text');
    expect(structuralGroupKey('--badge-accent-text', d)).toBe('text');
  });

  it('strips a mid-variable state segment, keeping the part (SideNav-shaped)', () => {
    const d = { component: 'sidenavigation', variants: ['default', 'hover', 'active'] };
    expect(structuralGroupKey('--sidenavigation-section-default-text', d)).toBe('section-text');
    expect(structuralGroupKey('--sidenavigation-item-hover-text', d)).toBe('item-text');
    expect(structuralGroupKey('--sidenavigation-footer-active-text', d)).toBe('footer-text');
    expect(structuralGroupKey('--sidenavigation-title-default-label', d)).toBe('title-label');
  });

  it('keeps the slot and the font property (Card / Table fonts)', () => {
    const card = { component: 'card', variants: ['default'] };
    expect(structuralGroupKey('--card-default-title', card)).toBe('title');
    expect(structuralGroupKey('--card-default-body-font-family', card)).toBe('body-font-family');
    const table = { component: 'table', variants: ['default'] };
    expect(structuralGroupKey('--table-default-header-font-family', table)).toBe('header-font-family');
    expect(structuralGroupKey('--table-default-cell-line-height', table)).toBe('cell-line-height');
  });

  it('handles multi-segment variant values', () => {
    const d = { component: 'toggle', variants: ['on-hover'] };
    expect(structuralGroupKey('--toggle-on-hover-track-surface', d)).toBe('track-surface');
  });
});

describe('buildTypeGroupColorTokens precedence', () => {
  const group = (extra: Partial<TypeGroupConfig> = {}): TypeGroupConfig => ({
    colorVariable: '--widget-primary-text',
    ...extra,
  });

  it('per-group colorGroupKey wins over everything and is never recomputed', () => {
    const tokens = buildTypeGroupColorTokens([group({ colorGroupKey: 'pinned' })], {
      component: 'widget',
      variants: ['primary'],
      groupKeyFor: () => 'fromCallback',
    });
    expect(keyOf(tokens, '--widget-primary-text')).toBe('pinned');
  });

  it('groupKeyFor (legacy function arg) overrides structural derivation', () => {
    const tokens = buildTypeGroupColorTokens([group()], () => 'fromFn');
    expect(keyOf(tokens, '--widget-primary-text')).toBe('fromFn');
  });

  it('structural derivation applies when component/variants supplied', () => {
    const tokens = buildTypeGroupColorTokens([group()], { component: 'widget', variants: ['primary'] });
    expect(keyOf(tokens, '--widget-primary-text')).toBe('text');
  });

  it('emits no groupKey (solo) when no derivation is supplied — no name inference', () => {
    const tokens = buildTypeGroupColorTokens([group()]);
    expect(keyOf(tokens, '--widget-primary-text')).toBeUndefined();
  });

  it('two parts ending in the same word stay distinct under structural derivation', () => {
    const groups: TypeGroupConfig[] = [
      { colorVariable: '--nav-section-default-text' },
      { colorVariable: '--nav-item-default-text' },
    ];
    const tokens = buildTypeGroupColorTokens(groups, { component: 'nav', variants: ['default'] });
    expect(keyOf(tokens, '--nav-section-default-text')).toBe('section-text');
    expect(keyOf(tokens, '--nav-item-default-text')).toBe('item-text');
  });
});

describe('buildTypeGroupTokens / buildTypeGroupFontTokens', () => {
  const typeGroups: Record<string, TypeGroupConfig[]> = {
    default: [
      {
        colorVariable: '--card-default-title',
        familyVariable: '--card-default-title-font-family',
        sizeVariable: '--card-default-title-font-size',
      },
      {
        colorVariable: '--card-default-body',
        familyVariable: '--card-default-body-font-family',
      },
    ],
  };

  it('with a derivation, font keys are slot-scoped and the color token gets a key', () => {
    const tokens = buildTypeGroupTokens(typeGroups, { component: 'card', variants: ['default'] });
    expect(keyOf(tokens, '--card-default-title')).toBe('title');
    expect(keyOf(tokens, '--card-default-title-font-family')).toBe('title-font-family');
    expect(keyOf(tokens, '--card-default-body-font-family')).toBe('body-font-family');
  });

  it('without a derivation, font keys are the bare defaults and color tokens carry no key', () => {
    const tokens = buildTypeGroupTokens(typeGroups);
    expect(keyOf(tokens, '--card-default-title')).toBeUndefined();
    expect(keyOf(tokens, '--card-default-title-font-family')).toBe('font-family');
  });

  it('font-only helper emits linkable, slot-scoped font tokens and no color token', () => {
    const tokens = buildTypeGroupFontTokens(typeGroups, { component: 'card', variants: ['default'] });
    expect(tokens.some((t) => t.variable === '--card-default-title')).toBe(false);
    expect(keyOf(tokens, '--card-default-title-font-family')).toBe('title-font-family');
    expect(tokens.every((t) => t.canBeLinked)).toBe(true);
  });
});
