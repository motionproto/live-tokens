import { expect, test, type Frame, type Locator, type Page } from '@playwright/test';
import type { A11yFinding, A11yFinishedReport } from '../../src/editor/core/a11y/a11yReportTypes';
import { openComponentsEditor } from '../../src/testing/support/editor';
import { openOverlayEditor } from './support/editor';

const finding = (rule: string, component: string, engineRule: string, help: string): A11yFinding => ({
  rule,
  file: 'src/system/components/Badge.svelte',
  line: 1,
  message: `${component}: ${engineRule}: ${help}`,
  component,
  details: { engineRule, target: '.badge', help, helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/', impact: null, html: '<span></span>' },
  severity: 'warn',
  repair: 'authored',
});

const REPORT: A11yFinishedReport = {
  state: 'finished',
  startedAt: '2026-10-23T14:00:00.000Z',
  finishedAt: '2026-10-23T14:03:20.000Z',
  theme: 'royal-velvet',
  contrast: [{
    component: 'badge',
    variable: '--badge-brand-text',
    backdrop: ['--badge-brand-surface'],
    role: 'text',
    ratio: 3.87,
    floor: 4.5,
  }],
  findings: [
    finding('a11y-component', 'badge', 'aria-allowed-role', 'ARIA role should be appropriate for the element'),
    finding('a11y-review', 'badge', 'color-contrast', 'Elements must meet minimum color contrast ratio thresholds'),
    finding('a11y-review', 'videoframe', 'video-caption', '<video> elements must have captions'),
  ],
};

async function stubReport(page: Page, report: A11yFinishedReport = REPORT): Promise<void> {
  await page.route('**/api/live-tokens/a11y/report', (route) => route.fulfill({ json: { report } }));
}

const traced = (
  rule: string,
  component: string,
  details: Pick<NonNullable<A11yFinding['details']>, 'engineRule' | 'help' | 'view' | 'variables'>,
): A11yFinding => {
  const base = finding(rule, component, details.engineRule, details.help);
  return { ...base, details: { ...base.details!, ...details } };
};

const TRACED_REPORT: A11yFinishedReport = {
  ...REPORT,
  contrast: [],
  findings: [
    traced('a11y-focus-visible', 'input', {
      engineRule: 'SIA-R65',
      help: 'Focusing the element changes no style on it',
      view: 'error / field',
      variables: ['--input-error-border', '--input-focused-border'],
    }),
    traced('a11y-review', 'button', {
      engineRule: 'color-contrast',
      help: 'Elements must meet minimum color contrast ratio thresholds',
      view: 'primary / hover',
      variables: ['--button-primary-hover-surface', '--button-primary-hover-text', '--button-shimmer'],
    }),
  ],
};

const HOSTS = '[data-token-variable], [data-token-variables]';

const railItem = (scope: Page | Frame, label: string): Locator =>
  scope.locator('.nav-items > .nav-item').filter({ has: scope.getByText(label, { exact: true }) });

test.describe.configure({ mode: 'serial' });
test.use({ viewport: { width: 1600, height: 1000 } });

test('the rail marks each component the report names and adds no text', async ({ page }) => {
  await stubReport(page);
  const frame = await openOverlayEditor(page, 'components');

  const badge = railItem(frame, 'Badge');
  await expect(badge.getByRole('img', { name: 'Accessibility issues' })).toBeVisible();
  expect(await badge.evaluate((el) => el.textContent?.trim())).toBe('Badge');
  await expect(railItem(frame, 'Button').locator('.a11y-rail-mark')).toHaveCount(0);

  await frame.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(badge.getByRole('img', { name: 'Accessibility issues' })).toBeVisible();
});

test('a component with results to check by eye alone carries the mark and the panel', async ({ page }) => {
  await stubReport(page);
  const frame = await openOverlayEditor(page, 'components');

  const videoFrame = railItem(frame, 'Video Frame');
  await expect(videoFrame.getByRole('img', { name: 'Accessibility issues' })).toBeVisible();
  expect(await videoFrame.evaluate((el) => el.textContent?.trim())).toBe('Video Frame');

  await videoFrame.click();
  const panel = frame.locator('.a11y-panel');
  await expect(panel.getByRole('heading', { name: '1 accessibility issue' })).toBeVisible();
  await expect(panel.locator('.a11y-group-title')).toHaveText(['Check by eye']);
  await expect(panel.locator('.a11y-issue.review .a11y-issue-mark')).toHaveText('?');
});

test('a marked component carries the panel and a clean one carries none', async ({ page }, testInfo) => {
  await stubReport(page);
  const frame = await openOverlayEditor(page, 'components');

  await railItem(frame, 'Button').click();
  await expect(frame.locator('.cfm-title')).toHaveText('Button');
  await expect(frame.locator('.a11y-panel')).toHaveCount(0);

  await railItem(frame, 'Badge').click();
  const panel = frame.locator('.a11y-panel');
  await expect(panel.getByRole('heading', { name: '3 accessibility issues' })).toBeVisible();
  await expect(panel.locator('.a11y-panel-run')).toHaveText(/^Last run .+$/);
  await expect(panel.locator('.a11y-group-title')).toHaveText(['Fix with a property', "Fix in the component's code", 'Check by eye']);
  await expect(panel.getByText('Brand text color 3.87:1, needs 4.5:1')).toBeVisible();
  await expect(panel.locator('.a11y-issue.review')).toContainText('Elements must meet minimum color contrast ratio thresholds');
  await testInfo.attach('panel', { body: await frame.locator('.demo-block').first().screenshot(), contentType: 'image/png' });
});

test('the arrow opens the tab that holds the property and scrolls its row into view', async ({ page }) => {
  await stubReport(page);
  const frame = await openOverlayEditor(page, 'components');
  await railItem(frame, 'Badge').click();

  const row = frame.locator('.variant-group .ui-token-selector[data-token-variable="--badge-brand-text"]');
  await expect(row).toHaveCount(0);

  await frame.locator('.a11y-panel').getByRole('button', { name: 'Go to Brand text color' }).click();
  await expect(frame.locator('.variant-tab-btn', { hasText: 'Brand' })).toHaveAttribute('aria-selected', 'true');
  await expect(frame.locator('.variant-group .state-tab-btn', { hasText: /^colors$/ })).toHaveAttribute('aria-selected', 'true');
  await expect(row).toBeInViewport();
});

test('the standalone component page marks its rail and shows the panel', async ({ page }) => {
  await stubReport(page);
  await openComponentsEditor(page);

  const badge = railItem(page, 'Badge');
  await expect(badge.getByRole('img', { name: 'Accessibility issues' })).toBeVisible();
  await badge.click();
  const panel = page.locator('.a11y-panel');
  await expect(panel.getByRole('heading', { name: '3 accessibility issues' })).toBeVisible();
  await expect(panel.locator('.a11y-issue.review')).toHaveCount(1);

  await panel.getByRole('button', { name: 'Go to Brand text color' }).click();
  await expect(page.locator('.variant-group .ui-token-selector[data-token-variable="--badge-brand-text"]')).toBeInViewport();
});

test('a property a finding traces to carries a mark that lists the finding', async ({ page }) => {
  await stubReport(page, TRACED_REPORT);
  await openComponentsEditor(page);
  await railItem(page, 'Input').click();

  await page.locator('.a11y-panel').getByRole('button', { name: 'Go to Focused border color' }).click();
  const row = page.locator('.variant-group .token-entry').filter({
    has: page.locator('.ui-token-selector[data-token-variable="--input-focused-border"]'),
  });
  await expect(row).toBeInViewport();
  const label = await row.locator('.token-label').textContent();

  const mark = row.getByRole('button', { name: '1 accessibility issue' });
  await expect(mark).toBeVisible();
  expect(await mark.evaluate((el) => el.textContent?.trim())).toBe('');
  expect(await row.locator('.token-label').textContent()).toBe(label);

  await mark.click();
  const popover = page.getByRole('dialog', { name: '1 accessibility issue' });
  await expect(popover.locator('.a11y-issue-text')).toHaveText('Focusing the element changes no style on it');
  await expect(popover.locator('.a11y-issue-detail')).toContainText('error / field');
  await expect(popover.locator('.a11y-issue.review')).toHaveCount(0);

  const clean = page.locator('.variant-group .ui-token-selector[data-token-variable="--input-focused-surface"]');
  await expect(clean.locator('.a11y-property-mark')).toHaveCount(0);
});

test("the arrow opens the tab that holds an intrinsic's row and lands on its mark", async ({ page }) => {
  await stubReport(page, TRACED_REPORT);
  const frame = await openOverlayEditor(page, 'components');
  await railItem(frame, 'Button').click();

  const row = frame.locator('.variant-group .property-row[data-token-variables="--button-shimmer"]');
  await expect(row).toHaveCount(0);

  await frame.locator('.a11y-panel').getByRole('button', { name: 'Go to Shimmer' }).click();
  await expect(frame.locator('.variant-group .state-tab-btn', { hasText: /^hover$/ })).toHaveAttribute('aria-selected', 'true');
  await expect(row).toBeInViewport();
  await expect(row).toHaveCount(1);
  await expect(row.getByRole('button', { name: '1 result to check by eye' })).toBeVisible();
  expect(await row.locator('.property-label').evaluate((el) => el.textContent?.trim())).toBe('hover shimmer');
});

test("every registered component's editor marks each row whose property a finding names", async ({ page }) => {
  test.setTimeout(300_000);
  await openComponentsEditor(page);
  const components = await page.evaluate(() => window.__liveTokensEditor!.getComponentRegistryEntries().map((entry) => ({
    id: entry.id,
    variables: [
      ...entry.schema.map((token) => token.variable),
      ...(entry.intrinsics ?? []).flatMap((spec) => spec.variants.map((variant) => spec.variable(variant))),
    ],
  })));
  await stubReport(page, {
    ...REPORT,
    contrast: [],
    findings: components.map(({ id, variables }) => traced('a11y-component', id, {
      engineRule: 'focus-indicator-contrast',
      help: 'Focus indicator contrast',
      view: 'default',
      variables,
    })),
  });
  await openComponentsEditor(page);

  for (const { id, variables } of components) {
    await page.evaluate((component) => window.__liveTokensEditor!.selectComponent(component), id);
    await page.locator('.variant-group').filter({ visible: true }).first().waitFor();
    const { marked, unmarked } = await page.evaluate(async ({ hosts, variables }) => {
      const known = new Set(variables);
      const marked = new Set<string>();
      const unmarked = new Set<string>();
      const settle = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const visible = (selector: string, scope: ParentNode = document) =>
        [...scope.querySelectorAll<HTMLElement>(selector)].filter((el) => el.getClientRects().length > 0);
      const check = () => {
        for (const host of visible(hosts)) {
          const names = (host.dataset.tokenVariable ?? host.dataset.tokenVariables ?? '').split(/\s+/).filter((name) => known.has(name));
          const own = [...host.querySelectorAll('.a11y-property-mark')].some((mark) => mark.closest(hosts) === host);
          for (const name of names) (own ? marked : unmarked).add(name);
        }
      };
      const variantCount = Math.max(1, visible('.variant-tab-btn').length);
      for (let v = 0; v < variantCount; v++) {
        visible('.variant-tab-btn')[v]?.click();
        await settle();
        const groupCount = visible('.variant-group').length;
        for (let g = 0; g < groupCount; g++) {
          const tabs = (selector: string) => {
            const group = visible('.variant-group')[g];
            return group ? visible(selector, group) : [];
          };
          const partCount = Math.max(1, tabs('.tabs-selectors:not(.substrip) .state-tab-btn').length);
          for (let p = 0; p < partCount; p++) {
            tabs('.tabs-selectors:not(.substrip) .state-tab-btn')[p]?.click();
            await settle();
            const stateCount = Math.max(1, tabs('.substrip .state-tab-btn').length);
            for (let st = 0; st < stateCount; st++) {
              tabs('.substrip .state-tab-btn')[st]?.click();
              await settle();
              check();
            }
          }
        }
      }
      return { marked: [...marked], unmarked: [...unmarked] };
    }, { hosts: HOSTS, variables });
    expect(unmarked, `${id}: rows without a mark`).toEqual([]);
    expect(marked.length, `${id}: no marked row`).toBeGreaterThan(0);
  }
});
