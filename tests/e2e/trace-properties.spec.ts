import { expect, test, type Page } from '@playwright/test';
import { TRACE_AXES, traceProperties } from '../../src/testing/support/traceProperties';

const FIXTURE = `
<style>
  :root { --theme-gap: 4px; --theme-ink: #222; --fixture-ring: #36c; }
  .editor { --ui-surface: #fff; background: var(--ui-surface); color: var(--ui-text, #000); }
  .stage { --ui-wash: var(--ui-surface); background: var(--ui-wash); }
  .fixture { --_size: var(--fixture-size); --_ink: var(--fixture-text, var(--theme-ink)); background: var(--fixture-surface); }
  .knob { width: var(--_size); height: var(--_size); padding: var(--theme-gap); color: var(--_ink); outline: none; }
  .knob:focus-visible { outline: 2px solid var(--fixture-ring); }
  .knob::before { content: ''; display: var(--fixture-glow, block); }
  .field { border: 1px solid var(--fixture-border); background: var(--fixture-surface); outline: none; }
  .field:focus { outline: 2px solid var(--fixture-ring); }
  .field.error, .field.error:focus { outline: 2px solid var(--fixture-error); }
  .field.error { border-radius: var(--fixture-radius); outline-offset: var(--fixture-offset); }
</style>
<div class="editor">
  <div class="stage" data-scope>
    <div class="fixture"><button class="knob">Go</button></div>
    <input class="field plain"><input class="field error">
  </div>
  <button class="knob">Outside</button>
</div>`;

const KNOWN = new Set([
  '--fixture-size', '--fixture-text', '--fixture-surface', '--fixture-ring', '--fixture-glow',
  '--fixture-border', '--fixture-error', '--fixture-radius', '--fixture-offset',
]);
const TARGET = { selector: '.knob', scope: '[data-scope]' };

async function open(page: Page): Promise<void> {
  await page.setContent(FIXTURE);
}

test.describe('traceProperties', () => {
  test('follows a private custom property to the schema variable behind it', async ({ page }) => {
    await open(page);
    expect(await traceProperties(page, TARGET, TRACE_AXES['target-size'], KNOWN)).toEqual(['--fixture-size']);
  });

  test('reads pseudo-elements and ancestor surfaces, dropping editor and theme names', async ({ page }) => {
    await open(page);
    expect(await traceProperties(page, TARGET, TRACE_AXES['color-contrast'], KNOWN))
      .toEqual(['--fixture-glow', '--fixture-surface', '--fixture-text']);
  });

  test('reads the focus styles under forced focus and releases the force', async ({ page }) => {
    await open(page);
    expect(await traceProperties(page, TARGET, TRACE_AXES['SIA-R65'], KNOWN)).toEqual(['--fixture-ring']);
    expect(await page.locator('.stage .knob').evaluate((knob) => getComputedStyle(knob).outlineStyle)).toBe('none');
  });

  test('keeps the focus rule and later overrides of its properties, dropping the resting styles', async ({ page }) => {
    await open(page);
    const field = (state: string) => ({ selector: `.field.${state}`, scope: '[data-scope]' });
    expect(await traceProperties(page, field('plain'), TRACE_AXES['SIA-R65'], KNOWN)).toEqual(['--fixture-ring']);
    expect(await traceProperties(page, field('error'), TRACE_AXES['SIA-R65'], KNOWN)).toEqual(['--fixture-error', '--fixture-ring']);
  });

  test('traces nothing for a target outside the scope', async ({ page }) => {
    await open(page);
    const outside = { selector: '.editor > .knob', scope: '[data-scope]' };
    expect(await traceProperties(page, outside, TRACE_AXES['target-size'], new Set(['--theme-gap']))).toEqual([]);
  });
});
