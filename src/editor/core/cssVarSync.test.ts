// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetCssVarSyncForTests,
  CSS_VAR_CHANGE_EVENT,
  CSS_VARS_CHANGE_EVENT,
  applyCssVariables,
  batchCssVarChanges,
  getSyncedDocuments,
  removeCssVar,
  setCssVar,
} from './cssVarSync';

let originalParentDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  originalParentDescriptor = Object.getOwnPropertyDescriptor(window, 'parent');
  document.documentElement.removeAttribute('style');
  __resetCssVarSyncForTests();
});

afterEach(() => {
  if (originalParentDescriptor) Object.defineProperty(window, 'parent', originalParentDescriptor);
  else Reflect.deleteProperty(window, 'parent');
  __resetCssVarSyncForTests();
});

describe('cssVarSync host fan-out', () => {
  it('sets, updates, and removes variables on editor and same-origin host roots', () => {
    const hostDocument = document.implementation.createHTMLDocument('host');
    Object.defineProperty(window, 'parent', {
      configurable: true,
      value: { document: hostDocument },
    });
    __resetCssVarSyncForTests();

    setCssVar('--live-audit', '12px');
    expect(document.documentElement.style.getPropertyValue('--live-audit')).toBe('12px');
    expect(hostDocument.documentElement.style.getPropertyValue('--live-audit')).toBe('12px');
    expect(getSyncedDocuments()).toEqual([document, hostDocument]);

    setCssVar('--live-audit', '20px');
    expect(document.documentElement.style.getPropertyValue('--live-audit')).toBe('20px');
    expect(hostDocument.documentElement.style.getPropertyValue('--live-audit')).toBe('20px');

    removeCssVar('--live-audit');
    expect(document.documentElement.style.getPropertyValue('--live-audit')).toBe('');
    expect(hostDocument.documentElement.style.getPropertyValue('--live-audit')).toBe('');
  });

  it('notifies editor controls after a live write', () => {
    const listener = vi.fn();
    document.addEventListener(CSS_VAR_CHANGE_EVENT, listener);
    setCssVar('--live-audit-event', '1');
    removeCssVar('--live-audit-event');
    document.removeEventListener(CSS_VAR_CHANGE_EVENT, listener);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[0][0]).toMatchObject({ detail: { name: '--live-audit-event' } });
  });

  it('exposes a completed multi-variable write as one batch', () => {
    const batches = vi.fn();
    const legacyReads: string[] = [];
    const readLegacy = () => {
      legacyReads.push(document.documentElement.style.getPropertyValue('--batch-b'));
    };
    document.addEventListener(CSS_VARS_CHANGE_EVENT, batches);
    document.addEventListener(CSS_VAR_CHANGE_EVENT, readLegacy);

    applyCssVariables({ '--batch-a': '1px', '--batch-b': '2px' });
    document.removeEventListener(CSS_VARS_CHANGE_EVENT, batches);
    document.removeEventListener(CSS_VAR_CHANGE_EVENT, readLegacy);

    expect(batches).toHaveBeenCalledTimes(1);
    expect(batches.mock.calls[0][0]).toMatchObject({
      detail: { names: ['--batch-a', '--batch-b'] },
    });
    // Compatibility events still fire, but only after the complete map landed.
    expect(legacyReads).toEqual(['2px', '2px']);
  });

  it('coalesces nested transactions into their outer batch', () => {
    const batches = vi.fn();
    document.addEventListener(CSS_VARS_CHANGE_EVENT, batches);

    batchCssVarChanges(() => {
      setCssVar('--outer', '1');
      batchCssVarChanges(() => setCssVar('--inner', '2'));
      removeCssVar('--outer');
    });
    document.removeEventListener(CSS_VARS_CHANGE_EVENT, batches);

    expect(batches).toHaveBeenCalledTimes(1);
    expect((batches.mock.calls[0][0] as CustomEvent).detail.names).toEqual(['--outer', '--inner']);
    expect(document.documentElement.style.getPropertyValue('--outer')).toBe('');
  });
});
