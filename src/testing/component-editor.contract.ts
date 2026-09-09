import { test } from '@playwright/test';
import { ContractViolation, isInapplicable } from './componentContract';
import { allContracts, selectedContracts } from './contracts';
import { ContractHarness } from './support/contractHarness';

const selected = await selectedContracts();
const requested = process.env.LIVE_TOKENS_COMPONENT;

// A failing test rather than a throw from the config: the JSON report then
// carries the rule, and the runner maps it like any other violation instead
// of reading a stderr tail.
if (requested && selected.length === 0) {
  const declared = (await allContracts()).map((contract) => contract.id).sort();
  test.describe.serial(requested, () => {
    test(`${requested} has a component contract`, () => {
      throw new ContractViolation(
        'contract-missing',
        requested,
        'no component contract is declared for it. Export one from the module '
        + `\`contractsModule\` names in live-tokens.testing.ts. Declared: ${declared.join(', ')}`,
      );
    });
  });
}

for (const contract of selected) {
  // Serial, so a component that is not registered reports that and stops rather
  // than reporting six preview failures caused by the missing entry.
  test.describe.serial(contract.id, () => {
    test(`${contract.id} is listed in its registry group`, async ({ page }) => {
      const harness = await ContractHarness.attach(page, contract);
      await harness.assertListed();
    });

    test(`${contract.id} declares every part and every shipped alias`, async ({ page }) => {
      const harness = await ContractHarness.open(page, contract);
      await harness.assertInventory();
    });

    test(`${contract.id} resolves every alias it paints with`, async ({ page }) => {
      const harness = await ContractHarness.open(page, contract);
      await harness.assertAliasesResolve();
    });

    test(`${contract.id} previews the state being edited`, async ({ page }) => {
      const harness = await ContractHarness.open(page, contract);
      if (isInapplicable(contract.states)) {
        test.info().annotations.push({ type: 'inapplicable', description: contract.states.reason });
      }
      await harness.assertStates();
    });

    test(`${contract.id} answers the pointer and the keyboard`, async ({ page }) => {
      const harness = await ContractHarness.open(page, contract);
      if (isInapplicable(contract.interaction)) {
        test.info().annotations.push({ type: 'inapplicable', description: contract.interaction.reason });
      }
      await harness.assertInteraction();
    });

    test(`${contract.id} persists an edit and resets to the saved config`, async ({ page }) => {
      test.setTimeout(180_000);
      const harness = await ContractHarness.open(page, contract);
      await harness.assertPersistence();
    });

    test(`${contract.id} takes the theme's values and gives them back`, async ({ page }) => {
      const harness = await ContractHarness.open(page, contract);
      await harness.assertThemeProjection(contract.theme);
    });

    test(`${contract.id} draws every painted part in Sketch mode`, async ({ page }) => {
      const harness = await ContractHarness.open(page, contract);
      const sketch = contract.sketch;
      if (isInapplicable(sketch)) {
        test.info().annotations.push({ type: 'inapplicable', description: sketch.reason });
        await harness.assertNoSketchPaint('pencil');
        return;
      }
      await harness.assertSketchPaint(sketch);
    });
  });
}
