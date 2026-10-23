import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { allContracts } from '../../../src/testing/contracts';
import {
  PageHarness,
  PageViolation,
  restingPaintSpec,
  type ContractPaintSpec,
  type PageRule,
  type PageViewport,
} from '../../../src/testing/support/pageHarness';
import { TEXT_STYLES } from '../../../src/editor/ui/sections/textStyles';
import { recordA11y, type A11yResult } from '../../../src/testing/support/a11y';

// Every page rule, failed once on a page written to fail it, and passed once on
// a page written to hold the exception it reserves. A rule that cannot fail is
// a rule that proves nothing, and the fixtures here are the only pages in the
// repository that carry a defect on purpose.

const DESKTOP: PageViewport = { width: 1280, height: 900 };
const PHONE: PageViewport = { width: 390, height: 844 };

const bundles = TEXT_STYLES.map((style) => ({ name: style.name, prefix: style.prefix }));

let specs: ContractPaintSpec[] | null = null;
let roots: string[] | null = null;

async function paintSpecs(): Promise<ContractPaintSpec[]> {
  if (!specs) {
    const contracts = await allContracts();
    specs = contracts
      .map((contract) => restingPaintSpec(contract))
      .filter((spec): spec is ContractPaintSpec => spec !== null);
  }
  return specs;
}

async function componentRoots(): Promise<string[]> {
  if (!roots) {
    const contracts = await allContracts();
    roots = contracts
      .map((contract) => contract.parts[contract.root])
      .filter((declared): declared is string => typeof declared === 'string');
  }
  return roots;
}

const fixture = (name: string) => `tests/e2e/page-defects/${name}.svelte`;

/** The line the finding has to name, read from the fixture rather than pinned,
 *  so an edit to a page moves its own expectation. */
function lineOf(name: string, marker: string): number {
  const lines = readFileSync(fixture(name), 'utf-8').split('\n');
  const index = lines.findIndex((line) => line.includes(marker));
  expect(index, `${fixture(name)} has no line matching ${marker}`).toBeGreaterThan(-1);
  return index + 1;
}

const open = (page: Page, name: string, route: string, viewport: PageViewport) =>
  PageHarness.open(page, { source: fixture(name), route: `/page-defects/${route}` }, viewport);

async function expectViolation(rule: PageRule, run: () => Promise<unknown>): Promise<PageViolation> {
  const caught = await run().then(() => null, (error: unknown) => error);
  expect(caught, 'the defect passed the rule').not.toBeNull();
  expect(caught).toBeInstanceOf(PageViolation);
  const violation = caught as PageViolation;
  expect(violation.rule).toBe(rule);
  return violation;
}

test('a page-wide radius on every button fails page-component-paint', async ({ page }) => {
  const specs = await paintSpecs();
  const harness = await open(page, 'PaintDefect', 'paint', DESKTOP);
  const violation = await expectViolation('page-component-paint', () =>
    harness.assertComponentPaint(specs));
  expect(violation.source).toBe(fixture('PaintDefect'));
  // Svelte stamps metadata on elements, and a component tag is not one, so the
  // line is the nearest element the page wrote: decision 8 as documented.
  expect(violation.line).toBe(lineOf('PaintDefect', '<section class="band">'));
  expect(violation.message).toContain('--button-primary-radius');
});

test('paragraphs in a half-styled container fail page-text-style', async ({ page }) => {
  const roots = await componentRoots();
  const harness = await open(page, 'TextStyleDefect', 'text-style', DESKTOP);
  const violation = await expectViolation('page-text-style', () =>
    harness.assertTextStyle(bundles, roots));
  expect(violation.line).toBe(lineOf('TextStyleDefect', '<p>A paragraph'));
  expect(violation.message).toContain('is in no shipped text style');
});

test('secondary text on a brand surface fails page-contrast', async ({ page }) => {
  const roots = await componentRoots();
  const harness = await open(page, 'ContrastDefect', 'contrast', DESKTOP);
  const violation = await expectViolation('page-contrast', () =>
    harness.assertContrast(roots));
  expect(violation.line).toBe(lineOf('ContrastDefect', '<p>Secondary text'));
  expect(violation.message).toContain('--text-secondary');
  expect(violation.message).toContain('AA floor');
});

test('a section off the column line fails page-grid', async ({ page }) => {
  const harness = await open(page, 'GridDefect', 'grid', DESKTOP);
  const violation = await expectViolation('page-grid', () => harness.assertGrid());
  expect(violation.line).toBe(lineOf('GridDefect', '<section class="band">'));
  expect(violation.message).toContain('13px');
  expect(violation.message).toContain('left');
});

test('a control wider than its phone column fails page-overflow', async ({ page }) => {
  const specs = await paintSpecs();
  const harness = await open(page, 'OverflowDefect', 'overflow', PHONE);
  const violation = await expectViolation('page-overflow', () =>
    harness.assertOverflow(specs));
  expect(violation.source).toBe(fixture('OverflowDefect'));
  expect(violation.message).toContain('button');
});

/** The rule's one result for the defect, recorded the way the page suite
 *  records it. */
function expectRecorded(results: A11yResult[], match: (result: A11yResult) => boolean): A11yResult {
  const found = results.filter(match);
  expect(found, JSON.stringify(results, null, 2)).toHaveLength(1);
  recordA11y(results);
  const recorded = test.info().annotations.filter((a) => a.type === 'a11y');
  expect(recorded.flatMap((a) => JSON.parse(a.description ?? '[]'))).toContainEqual(found[0]);
  return found[0];
}

test('a list holding no list items records a11y-page at the list', async ({ page }) => {
  const harness = await open(page, 'A11yPageDefect', 'a11y', DESKTOP);
  const result = expectRecorded(await harness.scanA11y(await componentRoots()), (r) => r.rule === 'a11y-page');
  expect(result.engineRule).toBe('list');
  expect(result.line).toBe(lineOf('A11yPageDefect', '<ul class="steps">'));
});

test('a clipped label that fits at rest records a11y-text-spacing under the override', async ({ page }) => {
  const specs = await paintSpecs();
  for (const viewport of [DESKTOP, PHONE]) {
    const harness = await open(page, 'TextSpacingDefect', 'text-spacing', viewport);
    expect(await harness.assertOverflow(specs), 'the label overflows at rest').toBeNull();
    const result = expectRecorded(await harness.scanTextSpacing(specs), (r) => r.rule === 'a11y-text-spacing');
    expect(result.target).toBe('<p>');
    expect(result.line).toBe(lineOf('TextSpacingDefect', '<p class="label">'));
    expect(result.help).toContain('overflow-x is hidden');
  }
});

test('an endless animation records a11y-reduced-motion under reduced motion', async ({ page }) => {
  const harness = await open(page, 'ReducedMotionDefect', 'reduced-motion', DESKTOP);
  const result = expectRecorded(await harness.scanReducedMotion(), (r) => r.rule === 'a11y-reduced-motion');
  expect(result.target).toBe('p.pulse');
  expect(result.line).toBe(lineOf('ReducedMotionDefect', '<p class="pulse">'));
  expect(result.help).toBe('The animation pulse keeps running under prefers-reduced-motion: reduce, without end');
});

test('a hero on a gradient reports page-contrast inapplicable', async ({ page }) => {
  const harness = await open(page, 'GradientHero', 'gradient-hero', DESKTOP);
  const reason = await harness.assertContrast(await componentRoots());
  expect(reason).toContain('a gradient or an image behind the text');
});

test('a code block that scrolls passes page-overflow', async ({ page }) => {
  for (const viewport of [DESKTOP, PHONE]) {
    const harness = await open(page, 'ScrollingCode', 'scrolling-code', viewport);
    expect(await harness.assertOverflow(await paintSpecs())).toBeNull();
  }
});

test('a badge at the end of a scrolling table row passes page-overflow', async ({ page }) => {
  const harness = await open(page, 'ScrollingTable', 'scrolling-table', PHONE);
  expect(await harness.assertOverflow(await paintSpecs())).toBeNull();
});

test('a grid of its own inside a section passes page-grid', async ({ page }) => {
  const harness = await open(page, 'LocalGrid', 'local-grid', DESKTOP);
  expect(await harness.assertGrid()).toBeNull();
});

test('disabled, selected, and switched-on controls pass page-component-paint', async ({ page }) => {
  for (const viewport of [DESKTOP, PHONE]) {
    const harness = await open(page, 'ControlStates', 'control-states', viewport);
    expect(await harness.assertComponentPaint(await paintSpecs()), `${viewport.width}x${viewport.height}`).toBeNull();
  }
});

test('a page with no shipped instance reports page-component-paint inapplicable', async ({ page }) => {
  const harness = await open(page, 'NoInstance', 'no-instance', DESKTOP);
  const reason = await harness.assertComponentPaint(await paintSpecs());
  expect(reason).toContain('renders no shipped component');
});

test('the clean page passes every rule at both viewports', async ({ page }) => {
  for (const viewport of [DESKTOP, PHONE]) {
    const harness = await open(page, 'CleanPage', 'clean', viewport);
    const at = `${viewport.width}x${viewport.height}`;
    expect(await harness.assertComponentPaint(await paintSpecs()), at).toBeNull();
    expect(await harness.assertTextStyle(bundles, await componentRoots()), at).toBeNull();
    expect(await harness.assertContrast(await componentRoots()), at).toBeNull();
    expect(await harness.assertOverflow(await paintSpecs()), at).toBeNull();
    expect((await harness.scanA11y(await componentRoots())).filter((r) => r.rule === 'a11y-page'), at).toEqual([]);
    expect(await harness.scanTextSpacing(await paintSpecs()), at).toEqual([]);
    const grid = await harness.assertGrid();
    if (viewport.width < 768) expect(grid, at).toContain('one column');
    else expect(grid, at).toBeNull();
    expect(await harness.scanReducedMotion(), at).toEqual([]);
  }
});
