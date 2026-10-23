import { expect, test, type Page } from '@playwright/test';
import {
  BOUNDARY_RULE,
  FOCUS_INDICATOR_RULE,
  scanBoundaries,
  scanFocusIndicators,
  type CheckedResult,
} from '../../src/testing/support/nonTextContrast';
import { TRACE_AXES, traceProperties } from '../../src/testing/support/traceProperties';

// #b7b7b7 stands 2:1 against white, #767676 4.54:1.
const FIXTURE = `
<style>
  :root { --theme-page: #fff; }
  body { margin: 0; background: #222; }
  .stage { padding: 24px; background: var(--theme-page); }
  .field { --_edge: var(--fixture-border); border: 1px solid var(--_edge); background: var(--fixture-surface); outline: none; }
  .field:focus-visible { outline: 2px solid var(--fixture-ring); outline-offset: 2px; }
  .slider { background: var(--fixture-track); }
  .knob { appearance: none; position: relative; width: 120px; height: 16px; margin: 0; background: transparent; }
  .knob:focus-visible { outline: none; }
  .knob + .cap { position: absolute; width: 16px; height: 16px; background: #767676; }
  .knob:focus-visible + .cap { outline: 2px solid var(--fixture-cap-ring); outline-offset: 2px; }
  .plain { border: 1px solid #767676; }
  .shadowed:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--fixture-glow); }
  .wash { padding: 12px; background: linear-gradient(90deg, #fff, #000); }
</style>
<div class="stage" data-scope>
  <input class="field" aria-label="Field">
  <div class="slider"><input class="knob" type="range" aria-label="Level"><span class="cap"></span></div>
  <button class="plain">Native ring</button>
  <button class="shadowed">Glow</button>
  <div class="wash"><input class="field washed" aria-label="Washed"></div>
</div>
<input class="field outside" aria-label="Outside">`;

const SCOPE = '[data-scope]';
const KNOWN = new Set(['--fixture-border', '--fixture-surface', '--fixture-ring', '--fixture-cap-ring', '--fixture-glow', '--fixture-track']);

async function open(page: Page, values: Record<string, string>): Promise<void> {
  await page.setContent(FIXTURE);
  await page.evaluate((values) => {
    for (const [name, value] of Object.entries(values)) document.documentElement.style.setProperty(name, value);
  }, values);
}

const PASSING = {
  '--fixture-border': '#767676',
  '--fixture-surface': '#fff',
  '--fixture-ring': '#767676',
  '--fixture-cap-ring': '#767676',
  '--fixture-glow': '#767676',
  '--fixture-track': '#fff',
};

async function traced(page: Page, { result, trace }: CheckedResult): Promise<string[]> {
  return traceProperties(page, { scope: SCOPE, ...trace }, TRACE_AXES[result.engineRule], KNOWN);
}

test.describe('non-text contrast', () => {
  test('a 2:1 focus ring reports its ratio and the property that paints it', async ({ page }) => {
    await open(page, { ...PASSING, '--fixture-ring': '#b7b7b7' });
    const found = await scanFocusIndicators(page, SCOPE, ['.wash']);
    expect(found.map(({ result }) => [result.rule, result.engineRule, result.target])).toEqual([
      ['a11y-component', FOCUS_INDICATOR_RULE, 'div.stage > input.field'],
    ]);
    expect(found[0].result.help).toBe('Focus outline 2:1 against the backdrop, needs 3:1');
    expect(await traced(page, found[0])).toEqual(['--fixture-ring']);
    expect(await page.locator('.field').first().evaluate((field) => getComputedStyle(field).outlineStyle)).toBe('none');
  });

  test('a ring drawn on a sibling reports against the focused element and traces the sibling', async ({ page }) => {
    // The black track sits behind the knob but not behind the ring, so it counts for neither the ratio nor the trace.
    await open(page, { ...PASSING, '--fixture-cap-ring': '#b7b7b7', '--fixture-glow': 'rgb(183 183 183 / 0.1)', '--fixture-track': '#000' });
    const found = await scanFocusIndicators(page, SCOPE, ['.wash']);
    expect(found.map(({ result }) => [result.target, result.help])).toEqual([
      ['input.knob', 'Focus outline on span.cap 2:1 against the backdrop, needs 3:1'],
      ['button.shadowed', 'Focus shadow 1.06:1 against the backdrop, needs 3:1'],
    ]);
    expect(await traced(page, found[0])).toEqual(['--fixture-cap-ring']);
    expect(await traced(page, found[1])).toEqual(['--fixture-glow']);
  });

  test('a 2:1 field border reports both ratios and the properties behind them', async ({ page }) => {
    await open(page, { ...PASSING, '--fixture-border': '#b7b7b7' });
    const found = await scanBoundaries(page, SCOPE, [], [{ selector: '.field', label: 'Field' }], '.field');
    expect(found.map(({ result }) => [result.rule, result.engineRule, result.target, result.help])).toEqual([
      ['a11y-component', BOUNDARY_RULE, 'div.stage > input.field', 'Field border 2:1 and surface 1:1 against the backdrop, needs 3:1'],
      ['a11y-review', BOUNDARY_RULE, 'input.field.washed', 'Field sits on or carries a gradient or image. Check by eye that its edge contrasts 3:1 with the backdrop'],
    ]);
    expect(await traced(page, found[0])).toEqual(['--fixture-border', '--fixture-surface']);
  });

  test('a field over a gradient asks for a check by eye', async ({ page }) => {
    await open(page, PASSING);
    const found = await scanFocusIndicators(page, SCOPE, []);
    expect(found.map(({ result }) => [result.rule, result.target])).toEqual([['a11y-review', 'input.field.washed']]);
  });

  test('contrasting rings, the browser ring and a contrasting border report nothing', async ({ page }) => {
    await open(page, PASSING);
    expect(await scanFocusIndicators(page, SCOPE, ['.wash'])).toEqual([]);
    expect(await scanBoundaries(page, SCOPE, ['.wash'], [{ selector: '.field', label: 'Field' }], '.field')).toEqual([]);
  });

  test('a disabled control is exempt', async ({ page }) => {
    await open(page, { ...PASSING, '--fixture-border': '#b7b7b7' });
    await page.locator('.field').first().evaluate((field) => field.setAttribute('disabled', ''));
    expect(await scanBoundaries(page, SCOPE, ['.wash'], [{ selector: '.field', label: 'Field' }], '.field')).toEqual([]);
  });
});
