import { expect, test, type Page } from '@playwright/test';
import {
  ContractViolation,
  type ComponentContract,
  type ContractRule,
} from '../../../src/testing/componentContract';
import { imageLightboxContract, sectionDividerContract, sliderContract, tooltipContract } from '../../../src/testing/contracts';
import { ContractHarness } from '../../../src/testing/support/contractHarness';

// Every rule a contract can trip, tripped once. A defect is either a wrong
// expectation held against the real component or a real fault installed in the
// running editor; both exercise the comparison that has to be sensitive.

function withDefect(
  contract: ComponentContract,
  patch: (draft: ComponentContract) => void,
): ComponentContract {
  const draft = structuredClone(contract);
  patch(draft);
  return draft;
}

async function expectViolation(
  rule: ContractRule,
  run: () => Promise<unknown>,
): Promise<ContractViolation> {
  const caught = await run().then(() => null, (error: unknown) => error);
  expect(caught, 'the defect passed the obligation').not.toBeNull();
  expect(caught).toBeInstanceOf(ContractViolation);
  const violation = caught as ContractViolation;
  expect(violation.rule).toBe(rule);
  return violation;
}

const open = (page: Page, contract: ComponentContract) => ContractHarness.open(page, contract);

// Serial: the persistence fixtures save and restore the same component's
// working buffer, and the project runs one worker so no other spec is writing
// it at the same time.
test.describe.configure({ mode: 'serial' });

test('an unregistered component fails contract-listed', async ({ page }) => {
  const defect = withDefect(sliderContract, (draft) => { draft.id = 'no-such-component'; });
  const harness = await ContractHarness.attach(page, defect);
  const violation = await expectViolation('contract-listed', () => harness.assertListed());
  expect(violation.message).toContain('no registry entry');
});

test('a component listed in the wrong group fails contract-listed', async ({ page }) => {
  const defect = withDefect(sliderContract, (draft) => { draft.origin = 'custom'; });
  const harness = await ContractHarness.attach(page, defect);
  const violation = await expectViolation('contract-listed', () => harness.assertListed());
  expect(violation.message).toContain('registry origin is "system"');
});

test('a property mapped to the wrong part fails contract-render', async ({ page }) => {
  const defect = withDefect(sliderContract, (draft) => {
    draft.properties = [{ paints: { thumb: { backgroundColor: '--slider-single-track-surface' } } }];
  });
  const harness = await open(page, defect);
  const violation = await expectViolation('contract-render', () => harness.assertProperties());
  expect(violation.message).toContain('--slider-single-track-surface');
});

test('an alias naming a token that does not exist fails contract-alias', async ({ page }) => {
  const harness = await open(page, sliderContract);
  await page.evaluate(() => {
    window.__liveTokensEditor!.mutate('defect: break one alias', (state) => {
      state.components.slider.aliases['--slider-single-track-surface'] =
        { kind: 'token', name: '--no-such-design-token' };
    });
  });
  const violation = await expectViolation('contract-alias', () => harness.assertAliasesResolve());
  expect(violation.message).toContain('--slider-single-track-surface');
});

test('a state that does not repaint what it claims fails contract-preview', async ({ page }) => {
  const defect = withDefect(sliderContract, (draft) => {
    draft.states = [{
      state: 'hover',
      forceClass: 'force-hover',
      paints: { thumb: { backgroundColor: '--slider-single-disabled-thumb-surface' } },
    }];
  });
  const harness = await open(page, defect);
  const violation = await expectViolation('contract-preview', () => harness.assertStates());
  expect(violation.message).toContain('thumb.backgroundColor');
});

test('a keyboard outcome in the wrong direction fails contract-preview', async ({ page }) => {
  const defect = withDefect(sliderContract, (draft) => {
    draft.interaction = {
      part: 'input',
      role: 'slider',
      cases: [{
        name: 'arrow right lowers the value',
        action: { kind: 'press', part: 'input', key: 'ArrowRight' },
        expect: { kind: 'valueMoves', part: 'input', direction: 'down' },
      }],
    };
  });
  const harness = await open(page, defect);
  const violation = await expectViolation('contract-preview', () => harness.assertInteraction());
  expect(violation.message).toContain('expected to move down');
});

test('a pointer outcome the drag does not produce fails contract-preview', async ({ page }) => {
  const defect = withDefect(sliderContract, (draft) => {
    draft.interaction = {
      part: 'input',
      role: 'slider',
      cases: [{
        name: 'dragging right lowers the value',
        action: { kind: 'dragTo', part: 'thumb', along: 'track', fraction: 0.85 },
        expect: { kind: 'valueMoves', part: 'input', direction: 'down' },
      }],
    };
  });
  const harness = await open(page, defect);
  const violation = await expectViolation('contract-preview', () => harness.assertInteraction());
  expect(violation.message).toContain('expected to move down');
});

test('an interactive role marked inapplicable fails contract-preview', async ({ page }) => {
  const defect = withDefect(sliderContract, (draft) => {
    draft.interaction = { applicable: false, reason: 'claiming a slider does nothing' };
  });
  const harness = await open(page, defect);
  const violation = await expectViolation('contract-preview', () => harness.assertInteraction());
  expect(violation.message).toContain('carries role "slider"');
});

test('an edit that never reaches the observed part fails contract-persist', async ({ page }) => {
  const defect = withDefect(sliderContract, (draft) => {
    draft.persistence.cases = [{
      shape: 'token',
      variable: '--slider-single-track-surface',
      observe: { part: 'label', css: 'color' },
    }];
  });
  const harness = await open(page, defect);
  const violation = await expectViolation('contract-persist', () => harness.assertPersistence());
  expect(violation.message).toContain('label.color');
});

test('a Reset baseline no edit can distinguish fails contract-persist', async ({ page }) => {
  const defect = withDefect(sliderContract, (draft) => {
    draft.persistence.resetVariable = '--slider-single-thumb-shadow';
  });
  const harness = await open(page, defect);
  const violation = await expectViolation('contract-persist', () => harness.assertPersistence());
  expect(violation.message).toContain('Reset cannot tell the two baselines apart');
});

test('a token the theme does move, declared unchanged, fails contract-theme', async ({ page }) => {
  const defect = withDefect(sliderContract, (draft) => {
    draft.theme.unchanged = ['--slider-single-track-surface'];
  });
  const harness = await open(page, defect);
  const violation = await expectViolation('contract-theme', () =>
    harness.assertThemeProjection(defect.theme));
  expect(violation.message).toContain('moved --slider-single-track-surface');
});

test('a theme alias resolving to another token fails contract-theme', async ({ page }) => {
  const defect = withDefect(sectionDividerContract, (draft) => {
    draft.theme.aliasedTo = { '--sectiondivider-lg-radius': '--radius-full' };
  });
  const harness = await open(page, defect);
  const violation = await expectViolation('contract-theme', () =>
    harness.assertThemeProjection(defect.theme));
  expect(violation.message).toContain('--sectiondivider-lg-radius');
});

test('a Sketch part that is not in the preview fails contract-sketch', async ({ page }) => {
  const defect = withDefect(sliderContract, (draft) => {
    draft.parts.gutter = '.slider-gutter';
    draft.sketch = { style: 'pencil', parts: [{ part: 'gutter', fill: '--slider-single-fill' }] };
  });
  const harness = await open(page, defect);
  const violation = await expectViolation('contract-sketch', () =>
    harness.assertSketchPaint(defect.sketch as never));
  expect(violation.message).toContain('gutter');
});

test('a Sketch part drawn in another part\'s colour fails contract-sketch', async ({ page }) => {
  const defect = withDefect(sliderContract, (draft) => {
    draft.sketch = {
      style: 'pencil',
      parts: [{ part: 'fill', fill: '--slider-single-track-surface' }],
    };
  });
  const harness = await open(page, defect);
  const violation = await expectViolation('contract-sketch', () =>
    harness.assertSketchPaint(defect.sketch as never));
  expect(violation.message).toContain('draws its fill from');
});

test('a save the server does not keep fails contract-persist', async ({ page }) => {
  await page.route('**/component-configs/slider/working', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  const harness = await open(page, sliderContract);
  const violation = await expectViolation('contract-persist', () => harness.assertPersistence());
  expect(violation.message).toContain('after a reload');
});

test('a Reset the server answers with a third config fails contract-persist', async ({ page }) => {
  // Boot reads `/active` once per component per page load. The run makes one
  // load to open, one reopen per persistence case inside the loop, and one
  // more reopen right before the Reset re-drive (so that re-drive replays its
  // `setup` against a known page state instead of whatever the loop left
  // behind — see `assertPersistence`). Everything after those is the Reset
  // button's own read.
  const bootReads = 2 + sliderContract.persistence.cases.length;
  let seen = 0;
  await page.route('**/component-configs/slider/active', async (route) => {
    seen += 1;
    const response = await route.fetch();
    if (seen <= bootReads) return route.fulfill({ response });
    const config = await response.json();
    config.aliases[sliderContract.persistence.resetVariable] = '--surface-brand';
    return route.fulfill({ response, body: JSON.stringify(config) });
  });
  const harness = await open(page, sliderContract);
  const violation = await expectViolation('contract-persist', () => harness.assertPersistence());
  expect(violation.message).toContain('Reset left');
});

/** Minimal contract: only the obligation each fixture calls is populated. */
function bareContract(id: string, parts: ComponentContract['parts'], root: string): ComponentContract {
  return {
    id,
    origin: 'system',
    root,
    parts,
    properties: [],
    states: { applicable: false, reason: 'not under test' },
    persistence: { cases: [], resetVariable: '' },
    theme: { theme: 'ocean', changed: [], unchanged: [], aliasedTo: {}, observe: { part: root, css: 'color', variable: '' } },
    interaction: { applicable: false, reason: 'not under test' },
    sketch: { applicable: false, reason: 'not under test' },
  };
}

const inputContract = bareContract('input', { root: '.input-field', field: 'input.input-control' }, 'root');

test('a typed value the field does not hold fails contract-preview', async ({ page }) => {
  const defect = withDefect(inputContract, (draft) => {
    draft.interaction = {
      part: 'field',
      role: 'textbox',
      cases: [
        {
          name: 'typing writes into the field',
          action: { kind: 'type', part: 'field', text: 'probe' },
          expect: { kind: 'valueChanges', part: 'field' },
        },
        {
          name: 'typing writes some other text',
          action: { kind: 'type', part: 'field', text: 'more' },
          expect: { kind: 'valueBecomes', part: 'field', value: 'something else' },
        },
      ],
    };
  });
  const harness = await open(page, defect);
  const violation = await expectViolation('contract-preview', () => harness.assertInteraction());
  expect(violation.message).toContain('expected something else');
});

const lightboxParts = {
  root: '.image-lightbox-wrapper',
  thumb: '.image-lightbox-thumb',
  overlay: { selector: '.image-lightbox-overlay', portal: true },
};

test('a portaled part behind its setup step resolves', async ({ page }) => {
  const contract = withDefect(bareContract('imagelightbox', lightboxParts, 'root'), (draft) => {
    draft.properties = [{
      setup: [{ kind: 'click', part: 'thumb' }],
      paints: { overlay: { backgroundColor: '--imagelightbox-overlay-surface' } },
    }];
  });
  const harness = await open(page, contract);
  expect(await harness.assertProperties()).toBe(1);
});

test('a portaled part with no setup step fails contract-render', async ({ page }) => {
  const defect = withDefect(bareContract('imagelightbox', lightboxParts, 'root'), (draft) => {
    draft.properties = [{ paints: { overlay: { backgroundColor: '--imagelightbox-overlay-surface' } } }];
  });
  const harness = await open(page, defect);
  const violation = await expectViolation('contract-render', () => harness.assertProperties());
  expect(violation.message).toContain('overlay');
});

test('a pseudo-element paint mapped to the wrong token fails contract-render', async ({ page }) => {
  const defect = withDefect(tooltipContract, (draft) => {
    draft.properties = [{ paints: { arrow: { borderRightColor: '--tooltip-text' } } }];
  });
  const harness = await open(page, defect);
  const violation = await expectViolation('contract-render', () => harness.assertProperties());
  expect(violation.message).toContain('arrow.borderRightColor');
});

test('an SVG paint mapped to the wrong token fails contract-render', async ({ page }) => {
  const defect = withDefect(imageLightboxContract, (draft) => {
    draft.view = { setup: [{ kind: 'click', part: 'thumb' }] };
    draft.properties = [{ paints: { closeIcon: { stroke: '--imagelightbox-tile-surface' } } }];
  });
  const harness = await open(page, defect);
  const violation = await expectViolation('contract-render', () => harness.assertProperties());
  expect(violation.message).toContain('closeIcon.stroke');
});

test('an alias in no paint map fails the inventory until it carries a reason', async ({ page }) => {
  const defect = withDefect(sliderContract, (draft) => {
    delete (draft.properties[0].paints as Record<string, unknown>).fill;
  });
  const harness = await open(page, defect);
  const violation = await expectViolation('contract-render', () => harness.assertInventory());
  expect(violation.message).toContain('--slider-single-fill');

  const excused = withDefect(defect, (draft) => {
    draft.uncovered = { '--slider-single-fill': 'covered by the range variant in this fixture' };
  });
  const second = await open(page, excused);
  await second.assertInventory();
});
