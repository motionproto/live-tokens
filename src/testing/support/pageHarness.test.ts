import { describe, expect, it } from 'vitest';
import { buttonContract } from '../contracts/button';
import { cardContract } from '../contracts/card';
import { inputContract } from '../contracts/input';
import { menuSelectContract } from '../contracts/menuselect';
import { notificationContract } from '../contracts/notification';
import { restingPaintSpec } from './pageHarness';

const variantsOf = (id: ReturnType<typeof restingPaintSpec>) =>
  [...new Set((id?.entries ?? []).map((entry) => entry.variant))].sort();

const variablesOf = (spec: ReturnType<typeof restingPaintSpec>) =>
  new Set((spec?.entries ?? []).flatMap((entry) => entry.checks.map((check) => check.variable)));

describe('restingPaintSpec', () => {
  it('keeps the base and default states a page instance is in', () => {
    const variables = variablesOf(restingPaintSpec(buttonContract));
    expect(variables.has('--button-primary-padding')).toBe(true);
    expect(variables.has('--button-primary-surface')).toBe(true);
  });

  it('drops the states a resting instance is not in', () => {
    const variables = variablesOf(restingPaintSpec(buttonContract));
    expect(variables.has('--button-primary-hover-surface')).toBe(false);
    expect(variables.has('--button-primary-disabled-surface')).toBe(false);
    expect(variables.has('--button-outline-active-surface')).toBe(false);
  });

  it('drops an entry an editor control has to reach', () => {
    expect(variablesOf(restingPaintSpec(buttonContract)).has('--button-small-padding')).toBe(false);
  });

  it('keeps an entry the contract view setup would have dropped', () => {
    const variables = variablesOf(restingPaintSpec(inputContract));
    expect(variables.has('--input-default-surface')).toBe(true);
    expect(variables.has('--input-label-font-size')).toBe(true);
  });

  it('keeps every variant of a contract whose view opens behind a control', () => {
    const spec = restingPaintSpec(notificationContract);
    expect(variantsOf(spec)).toEqual(['danger', 'info', 'success', 'warning']);
    for (const variant of ['danger', 'info', 'success', 'warning']) {
      expect(variablesOf(spec).has(`--notification-${variant}-surface`)).toBe(true);
    }
  });

  it('keeps the resting entries of a contract whose view opens on a transient tab', () => {
    const variables = variablesOf(restingPaintSpec(menuSelectContract));
    expect(variables.has('--menuselect-default-text')).toBe(true);
    expect(variables.has('--menuselect-selected-surface')).toBe(false);
  });

  it('gives a state entry the variant the contract view opens on', () => {
    expect(variantsOf(restingPaintSpec(buttonContract))).toEqual([
      'danger', 'outline', 'primary', 'secondary', 'success', 'warning',
    ]);
  });

  it('leaves a contract with one variant unkeyed, so every instance matches', () => {
    expect(variantsOf(restingPaintSpec(cardContract))).toEqual([null]);
  });

  it('resolves each part against the instance, and the root against itself', () => {
    const spec = restingPaintSpec(buttonContract);
    const checks = (spec?.entries ?? []).flatMap((entry) => entry.checks);
    expect(checks.find((check) => check.part === 'root')?.selector).toBeNull();
    expect(checks.find((check) => check.part === 'icon')?.selector).toBe('.button i');
  });
});
