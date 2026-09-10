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

test('a grid of its own inside a section passes page-grid', async ({ page }) => {
  const harness = await open(page, 'LocalGrid', 'local-grid', DESKTOP);
  expect(await harness.assertGrid()).toBeNull();
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
    const grid = await harness.assertGrid();
    if (viewport.width < 768) expect(grid, at).toContain('one column');
    else expect(grid, at).toBeNull();
  }
});
