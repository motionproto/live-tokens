import { test } from '@playwright/test';
import { TEXT_STYLES } from '../editor/ui/sections/textStyles';
import { allContracts } from './contracts';
import {
  PageHarness,
  pageTargets,
  pageViewports,
  restingPaintSpec,
  type ContractPaintSpec,
} from './support/pageHarness';

const targets = pageTargets();
const viewports = pageViewports();

const bundles = TEXT_STYLES.map((style) => ({ name: style.name, prefix: style.prefix }));

async function paintSpecs(): Promise<ContractPaintSpec[]> {
  const contracts = await allContracts();
  return contracts
    .map((contract) => restingPaintSpec(contract))
    .filter((spec): spec is ContractPaintSpec => spec !== null);
}

async function componentRoots(): Promise<string[]> {
  const contracts = await allContracts();
  return contracts
    .map((contract) => contract.parts[contract.root])
    .filter((declared): declared is string => typeof declared === 'string');
}

for (const target of targets) {
  for (const viewport of viewports) {
    const at = `${viewport.width}x${viewport.height}`;

    test(`page-component-paint | ${target.source} | ${at}`, async ({ page }) => {
      const specs = await paintSpecs();
      const harness = await PageHarness.open(page, target, viewport);
      const inapplicable = await harness.assertComponentPaint(specs);
      test.skip(inapplicable !== null, inapplicable ?? '');
    });

    test(`page-text-style | ${target.source} | ${at}`, async ({ page }) => {
      const roots = await componentRoots();
      const harness = await PageHarness.open(page, target, viewport);
      const inapplicable = await harness.assertTextStyle(bundles, roots);
      test.skip(inapplicable !== null, inapplicable ?? '');
    });

    test(`page-contrast | ${target.source} | ${at}`, async ({ page }) => {
      const roots = await componentRoots();
      const harness = await PageHarness.open(page, target, viewport);
      const inapplicable = await harness.assertContrast(roots);
      test.skip(inapplicable !== null, inapplicable ?? '');
    });

    test(`page-grid | ${target.source} | ${at}`, async ({ page }) => {
      const harness = await PageHarness.open(page, target, viewport);
      const inapplicable = await harness.assertGrid();
      test.skip(inapplicable !== null, inapplicable ?? '');
    });

    test(`page-overflow | ${target.source} | ${at}`, async ({ page }) => {
      const specs = await paintSpecs();
      const harness = await PageHarness.open(page, target, viewport);
      const inapplicable = await harness.assertOverflow(specs);
      test.skip(inapplicable !== null, inapplicable ?? '');
    });
  }
}
