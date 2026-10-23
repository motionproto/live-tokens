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

async function stubReport(page: Page): Promise<void> {
  await page.route('**/api/live-tokens/a11y/report', (route) => route.fulfill({ json: { report: REPORT } }));
}

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
