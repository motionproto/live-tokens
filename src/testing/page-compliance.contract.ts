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

/** Findings name CSS properties as a page's own stylesheet spells them. */
const cssName = (camel: string) => camel.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** The line the finding anchors on, the rest named in the message, and what
 *  the rule looked at to find them: one rerun after each repair walks the
 *  whole list. */
function report<T extends { line: number }>(
  failures: T[],
  scope: string,
  describe: (failure: T) => string,
): string {
  const lines = failures.map(describe);
  return lines.length === 1 ? lines[0] : `${lines.length} of ${scope}\n${lines.join('\n')}`;
}

for (const target of targets) {
  for (const viewport of viewports) {
    const at = `${viewport.width}x${viewport.height}`;

    test(`page-component-paint | ${target.source} | ${at}`, async ({ page }) => {
      const specs = await paintSpecs();
      const harness = await PageHarness.open(page, target, viewport);
      const observed = await harness.observePaints(specs);
      test.skip(observed.instances === 0, `${target.source} renders no shipped component`);
      for (const id of observed.unmatchedVariants) {
        test.info().annotations.push({
          type: 'variant-unmatched',
          description: `${id} keys every resting paint map by variant and no instance's root classes name one`,
        });
      }
      if (observed.failures.length > 0) {
        harness.fail(
          'page-component-paint',
          observed.failures[0].line,
          report(observed.failures, `${observed.asserted} contracted paints`, (failure) =>
            `line ${failure.line}: ${failure.id}${failure.variant ? ` (${failure.variant})` : ''} `
            + `paints ${failure.part} ${cssName(failure.css)}: ${failure.actual}, `
            + `but ${failure.variable} resolves to ${failure.expected}`),
        );
      }
      test.skip(observed.asserted === 0, `no contracted part of a shipped instance is rendered on ${target.source}`);
    });

    test(`page-text-style | ${target.source} | ${at}`, async ({ page }) => {
      const roots = await componentRoots();
      const harness = await PageHarness.open(page, target, viewport);
      const observed = await harness.observeTextStyles(bundles, roots);
      test.skip(observed.elements === 0, `${target.source} renders no text outside a shipped component`);
      if (observed.failures.length > 0) {
        harness.fail(
          'page-text-style',
          observed.failures[0].line,
          report(observed.failures, `${observed.elements} runs of text`, (failure) =>
            `line ${failure.line}: <${failure.tag}> is in no shipped text style. `
            + `Nearest is ${failure.nearest}: its ${cssName(failure.axis)} is ${failure.expected}, `
            + `the element's is ${failure.actual}`),
        );
      }
    });
  }
}
