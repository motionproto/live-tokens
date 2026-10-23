import { expect, test, type Frame, type Page } from '@playwright/test';
import type { A11yFinding, A11yFinishedReport } from '../../src/editor/core/a11y/a11yReportTypes';
import { openOverlayEditor } from './support/editor';

const finding = (
  rule: string,
  component: string,
  details: { engineRule: string; target: string; view?: string; help: string; helpUrl: string },
): A11yFinding => ({
  rule,
  file: 'src/system/components/Badge.svelte',
  line: 1,
  message: `${component}: ${details.engineRule} at ${details.target}: ${details.help}. ${details.helpUrl}`,
  component,
  details: { impact: null, html: '<span></span>', ...details },
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
    finding('a11y-component', 'badge', {
      engineRule: 'aria-allowed-role',
      target: '.badge',
      view: 'brand / default',
      help: 'ARIA role should be appropriate for the element',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/aria-allowed-role',
    }),
    finding('a11y-keyboard', 'radiobutton', {
      engineRule: 'ArrowDown moves the selection',
      target: 'input',
      help: 'focus stayed in place',
      helpUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/',
    }),
    finding('a11y-review', 'videoframe', {
      engineRule: 'video-caption',
      target: 'video',
      help: '<video> elements must have captions',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/video-caption',
    }),
    finding('a11y-review', 'badge', {
      engineRule: 'color-contrast',
      target: '.badge',
      help: 'Elements must meet minimum color contrast ratio thresholds',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/color-contrast',
    }),
  ],
};

/** Stubs both routes, so no test starts a real run, and records every POST body. */
async function stubA11yApi(page: Page): Promise<unknown[]> {
  const posts: unknown[] = [];
  await page.route('**/api/live-tokens/a11y/report', (route) => route.fulfill({ json: { report: null } }));
  await page.route('**/api/live-tokens/a11y/run', (route) => {
    posts.push(route.request().postDataJSON());
    return route.fulfill({ status: 202, json: REPORT });
  });
  return posts;
}

async function openAccessibilityView(frame: Frame): Promise<void> {
  await frame.getByRole('tab', { name: 'Accessibility' }).click();
  await expect(frame.getByRole('heading', { name: 'Accessibility', level: 2 })).toBeVisible();
}

test.describe.configure({ mode: 'serial' });
test.use({ viewport: { width: 1600, height: 1000 } });

test('Run test posts the measured contrast and shows the finished report', async ({ page }, testInfo) => {
  const posts = await stubA11yApi(page);
  const frame = await openOverlayEditor(page, 'tokens');
  await openAccessibilityView(frame);

  await expect(frame.getByText('A run takes about three minutes.', { exact: false })).toBeVisible();
  await frame.getByRole('button', { name: 'Run test' }).click();

  await expect.poll(() => posts.length).toBe(1);
  expect(Array.isArray((posts[0] as { contrast: unknown }).contrast)).toBe(true);

  await expect(frame.locator('.a11y-summary')).toHaveText('2 components with issues, 3 issues');
  await expect(frame.locator('.a11y-status')).toHaveText(/^Last run .+, theme Royal Velvet$/);

  const badge = frame.locator('#a11y-component-badge');
  await expect(badge.getByRole('heading', { name: 'Badge' })).toBeVisible();
  await expect(badge.locator('.a11y-count')).toHaveText('2 issues');
  const contrastRow = badge.locator('.a11y-issue', { hasText: 'Text color 3.87:1, needs 4.5:1' });
  await expect(contrastRow.locator('.a11y-issue-mark')).toHaveText('!');
  await expect(badge.getByText('Fix with a property')).toBeVisible();
  await expect(badge.getByText("Fix in the component's code")).toBeVisible();
  await expect(badge.getByRole('link', { name: 'Read the guidance' }))
    .toHaveAttribute('href', 'https://dequeuniversity.com/rules/axe/4.10/aria-allowed-role');

  await expect(frame.locator('#a11y-component-radiobutton'))
    .toContainText('ArrowDown moves the selection: focus stayed in place');

  const review = frame.locator('#a11y-review summary');
  await expect(review).toHaveText('2 results to check by eye');
  await expect(frame.locator('#a11y-review .a11y-issue').first()).toBeHidden();

  const rail = frame.locator('.sidebar .nav-item');
  await expect(rail).toHaveCount(2);
  await expect(rail.first()).toHaveAccessibleName('Badge, 2 issues');
  await testInfo.attach('accessibility view', { body: await frame.locator('.layout').screenshot(), contentType: 'image/png' });
});

test('Run test with an unsaved edit shows the save alert and posts nothing', async ({ page }) => {
  const posts = await stubA11yApi(page);
  const frame = await openOverlayEditor(page, 'components');

  await frame.locator('.variant-tab-btn', { hasText: 'Primary' }).first().click();
  await frame.locator('.variant-group:visible .state-tab-btn').filter({ hasText: /^default$/i }).first().click();
  await frame
    .locator('.variant-group:visible .ui-token-selector[data-token-variable="--button-primary-surface"]')
    .first()
    .locator('.ui-ts-trigger')
    .click();
  await frame.locator('.ui-ts-dropdown .static-chip', { hasText: 'White' }).click();
  await expect(frame.locator('.nav-item.dirty', { hasText: 'Button' })).toBeVisible();

  await openAccessibilityView(frame);
  await frame.getByRole('button', { name: 'Run test' }).click();

  await expect(frame.getByRole('alert')).toHaveText('Save the changes you want to have checked.');
  expect(posts).toEqual([]);
});
