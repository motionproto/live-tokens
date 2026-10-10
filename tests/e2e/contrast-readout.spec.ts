import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { openComponentsEditor } from '../../src/testing/support/editor';

async function openComponent(page: Page, id: string): Promise<void> {
  await openComponentsEditor(page);
  await page.evaluate((component) => window.__liveTokensEditor!.selectComponent(component), id);
  await page.locator('.variant-group').filter({ visible: true }).first().waitFor();
}

async function selectVariant(page: Page, label: string): Promise<void> {
  await page.locator('.variant-tab-btn', { hasText: label }).first().click();
}

async function selectState(page: Page, label: string): Promise<void> {
  await page
    .locator('.variant-group:visible .state-tab-btn')
    .filter({ hasText: new RegExp(`^${label}$`) })
    .first()
    .click();
}

function row(page: Page, variable: string): Locator {
  return page
    .locator(`.variant-group:visible .ui-token-selector[data-token-variable="${variable}"]`)
    .first();
}

async function attach(testInfo: TestInfo, name: string, target: Locator): Promise<void> {
  await testInfo.attach(name, { body: await target.screenshot(), contentType: 'image/png' });
}

async function openPopover(readout: Locator): Promise<Locator> {
  await readout.locator('.info-btn').click();
  const popover = readout.locator('.info-popover');
  await expect(popover).toHaveClass(/ready/);
  return popover;
}

test('Button primary default text shows a passing ratio that matches an independent read', async ({ page }, testInfo) => {
  await openComponent(page, 'button');
  await selectVariant(page, 'Primary');
  await selectState(page, 'default');
  const text = row(page, '--button-primary-text');
  const readout = text.locator('.contrast-readout');

  await expect(readout).toHaveAttribute('data-contrast-state', 'pass');
  const shown = Number(await readout.getAttribute('data-contrast-ratio'));

  const independent = await page.evaluate(([foreground, background]) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const read = (name: string) => {
      const probe = document.createElement('span');
      probe.style.color = `var(${name})`;
      document.body.append(probe);
      const css = getComputedStyle(probe).color;
      probe.remove();
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      return [...ctx.getImageData(0, 0, 1, 1).data];
    };
    const luminance = ([r, g, b]: number[]) => {
      const linear = (c: number) => {
        const s = c / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
    };
    const fg = read(foreground);
    const bg = read(background);
    const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
    return { ratio: (hi + 0.05) / (lo + 0.05), alphas: [fg[3], bg[3]] };
  }, ['--button-primary-text', '--button-primary-surface']);

  // Two opaque colors need no page background beneath them.
  expect(independent.alphas).toEqual([255, 255]);
  expect(Math.abs(shown - independent.ratio)).toBeLessThanOrEqual(0.01);
  await attach(testInfo, 'button primary text readout', text);
});

test('a White surface turns Button primary text amber with an exclamation mark', async ({ page }, testInfo) => {
  await openComponent(page, 'button');
  await selectVariant(page, 'Primary');
  await selectState(page, 'default');

  await row(page, '--button-primary-surface').locator('.ui-ts-trigger').click();
  await page.locator('.ui-ts-dropdown .static-chip', { hasText: 'White' }).click();

  const text = row(page, '--button-primary-text');
  const readout = text.locator('.contrast-readout');
  await expect(readout).toHaveAttribute('data-contrast-state', 'fail');
  await expect(readout.locator('.contrast-mark')).toHaveText('!');

  const value = readout.locator('.contrast-value');
  const amber = await value.evaluate((node) => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--ui-highlight)';
    node.parentElement!.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
  await expect(value).toHaveCSS('color', amber);
  await attach(testInfo, 'button primary text on white', text);
});

test('the readout popover names 1.4.3 and links to its success criterion', async ({ page }, testInfo) => {
  await openComponent(page, 'button');
  await selectVariant(page, 'Primary');
  await selectState(page, 'default');
  const readout = row(page, '--button-primary-text').locator('.contrast-readout');

  const popover = await openPopover(readout);
  await expect(popover).toContainText('1.4.3');
  const link = popover.getByRole('link', { name: 'Success criterion 1.4.3' });
  await expect(link).toHaveAttribute('href', 'https://www.w3.org/TR/WCAG22/#contrast-minimum');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener');
  await attach(testInfo, 'button primary text popover', popover);
});

test('Button primary disabled text shows the inactive state', async ({ page }, testInfo) => {
  await openComponent(page, 'button');
  await selectVariant(page, 'Primary');
  await selectState(page, 'disabled');
  const text = row(page, '--button-primary-disabled-text');

  await expect(text.locator('.contrast-readout')).toHaveAttribute('data-contrast-state', 'inactive');
  await expect(text.locator('.contrast-mark')).toHaveCount(0);
  await attach(testInfo, 'button primary disabled text readout', text);
});

test('the Toggle thumb popover names 1.4.11', async ({ page }, testInfo) => {
  await openComponent(page, 'toggle');
  await selectState(page, 'default');
  const readout = row(page, '--toggle-thumb-surface').locator('.contrast-readout');

  const popover = await openPopover(readout);
  await expect(popover).toContainText('1.4.11');
  await expect(popover.getByRole('link', { name: 'Success criterion 1.4.11' }))
    .toHaveAttribute('href', 'https://www.w3.org/TR/WCAG22/#non-text-contrast');
  await attach(testInfo, 'toggle thumb popover', popover);
});

test('the Notification body color popover lists two pairs', async ({ page }, testInfo) => {
  await openComponent(page, 'notification');
  await selectVariant(page, 'Info');
  await selectState(page, 'colors');
  const readout = row(page, '--notification-info-text').locator('.contrast-readout');

  const popover = await openPopover(readout);
  await expect(popover.locator('.contrast-pair')).toHaveCount(2);
  await expect(popover.locator('.contrast-context')).toHaveText(['dismiss button', 'body']);
  await attach(testInfo, 'notification body popover', popover);
});
