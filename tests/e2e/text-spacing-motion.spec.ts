import { expect, test, type Page } from '@playwright/test';
import {
  REDUCED_MOTION_RULE,
  TEXT_SPACING_RULE,
  scanReducedMotion,
  scanTextSpacing,
} from '../../src/testing/support/textSpacingAndMotion';
import { TRACE_AXES, traceProperties } from '../../src/testing/support/traceProperties';

const SCOPE = '[data-scope]';
const KNOWN = new Set(['--fixture-height', '--fixture-color', '--fixture-sweep', '--fixture-easing']);

const SPACING = `
<style>
  :root { --fixture-height: 18px; --fixture-color: #333; }
  body { font: 16px/1 sans-serif; }
  .chip { --_h: var(--fixture-height); display: inline-block; height: var(--_h); overflow: hidden; color: var(--fixture-color); }
  .sliding { display: inline-block; height: 18px; overflow: hidden; transition: all 2s; }
  .free { display: inline-block; padding: 4px; }
  .cut { display: inline-block; width: 40px; overflow: hidden; white-space: nowrap; }
</style>
<div data-scope>
  <span class="chip">Label</span>
  <span class="sliding">Sliding</span>
  <span class="free">Grows with its text</span>
  <span class="cut">A label already cut at rest</span>
</div>
<span class="chip">Outside</span>`;

const MOTION = `
<style>
  :root { --fixture-sweep: 0.5s; --fixture-easing: ease; }
  .sweep { position: relative; transition: background 150ms; }
  .sweep::before { content: ''; position: absolute; inset: 0; transition: left var(--fixture-sweep) var(--fixture-easing); }
  .spin { display: inline-block; animation: spin 1s linear infinite; }
  .calm { display: inline-block; transition: transform 500ms; }
  .quick { display: inline-block; transition: opacity 150ms; }
  @media (prefers-reduced-motion: reduce) { .calm { transition: none; } }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
<div data-scope>
  <button class="sweep">Go</button>
  <span class="spin">*</span>
  <span class="calm">Calm</span>
  <span class="quick">Quick</span>
</div>
<span class="spin">Outside</span>`;

async function traced(page: Page, selector: string, engineRule: string): Promise<string[]> {
  return traceProperties(page, { selector, scope: SCOPE }, TRACE_AXES[engineRule], KNOWN);
}

test.describe('text spacing and reduced motion', () => {
  test('a box that clips under the text spacing override reports with the property that fixes its size', async ({ page }) => {
    await page.setContent(SPACING);
    const found = await scanTextSpacing(page, SCOPE, [], [SCOPE]);
    expect(found.map((result) => [result.rule, result.engineRule, result.target])).toEqual([
      ['a11y-text-spacing', TEXT_SPACING_RULE, 'span.chip'],
      ['a11y-text-spacing', TEXT_SPACING_RULE, 'span.sliding'],
    ]);
    expect(found[0].help).toBe('Under the text spacing override, <span> holds 24px of content in 18px of height, and its overflow-y is hidden');
    expect(await traced(page, found[0].target, TEXT_SPACING_RULE)).toEqual(['--fixture-height']);
    expect(await page.evaluate(() => document.querySelectorAll('style').length)).toBe(1);
    expect(await page.locator('[data-lt-spacing-probe]').count()).toBe(0);
  });

  test('an animation that keeps going under reduced motion reports with the property that sets its length', async ({ page }) => {
    await page.setContent(MOTION);
    const found = await scanReducedMotion(page, SCOPE, [], [SCOPE]);
    expect(found.map(({ result }) => [result.rule, result.engineRule, result.target, result.help])).toEqual([
      ['a11y-reduced-motion', REDUCED_MOTION_RULE, 'button.sweep::before', 'A transition of left lasts 500 ms under prefers-reduced-motion: reduce'],
      ['a11y-reduced-motion', REDUCED_MOTION_RULE, 'span.spin', 'The animation spin runs without end under prefers-reduced-motion: reduce'],
    ]);
    // The shorthand carries its easing beside its duration, and the trace reads declarations whole.
    expect(await traced(page, found[0].trace.selector, REDUCED_MOTION_RULE)).toEqual(['--fixture-easing', '--fixture-sweep']);
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(false);
  });

  test('a scope without long motion reports nothing', async ({ page }) => {
    await page.setContent(MOTION);
    await page.evaluate(() => document.querySelectorAll('[data-scope] .sweep, [data-scope] .spin').forEach((el) => el.remove()));
    expect(await scanReducedMotion(page, SCOPE, [], [SCOPE])).toEqual([]);
  });
});
