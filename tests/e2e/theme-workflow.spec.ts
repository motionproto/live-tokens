import { expect, test } from '@playwright/test';
import { openOverlayEditor } from './support/editor';

test('a host-initiated theme load hydrates an already-open editor', async ({ page }) => {
  const frame = await openOverlayEditor(page, 'tokens');
  const trigger = frame.locator('.theme-name-trigger');
  const currentName = (await trigger.innerText()).trim();
  const target = currentName === 'Autumn'
    ? { slug: 'ocean', name: 'Ocean' }
    : { slug: 'autumn', name: 'Autumn' };

  await page.evaluate(async (slug) => {
    const modulePath = '/src/editor/core/themes/themeService.ts';
    const themes = await import(/* @vite-ignore */ modulePath);
    await themes.applyTheme(slug);
  }, target.slug);

  await expect(trigger).toContainText(target.name);
  const colors = await Promise.all([
    page.evaluate(() => document.documentElement.style.getPropertyValue('--color-brand-500').trim()),
    frame.evaluate(() => document.documentElement.style.getPropertyValue('--color-brand-500').trim()),
  ]);
  expect(colors[0]).not.toBe('');
  expect(colors[1]).toBe(colors[0]);

  // Hydration must restore an editable graph, not merely copy a theme's
  // current CSS snapshot. Prove a component mutation still reaches the host
  // after the theme switch originated in the other document.
  await frame.evaluate(async () => {
    const modulePath = '/src/editor/core/store/editorStore.ts';
    const editor = await import(/* @vite-ignore */ modulePath);
    editor.setComponentAlias('sectiondivider', '--sectiondivider-md-title-font-size', {
      kind: 'literal', value: '51px',
    });
  });
  await expect.poll(() => page.locator('.section-divider.variant-md').first().evaluate((divider) =>
    getComputedStyle(divider.querySelector('svg.divider-label text')!).fontSize,
  )).toBe('51px');
});

test('clicking the active name opens the picker and Save loads and adopts in one step', async ({ page }) => {
  const frame = await openOverlayEditor(page, 'tokens');
  const trigger = frame.locator('.theme-name-trigger');
  const currentName = (await trigger.innerText()).trim();
  const target = currentName === 'Autumn' ? { slug: 'ocean', name: 'Ocean' } : { slug: 'autumn', name: 'Autumn' };
  const beforeColor = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-brand-500').trim(),
  );
  await page.evaluate(() => ((window as any).__playwrightThemeMarker = 'still-here'));

  await trigger.click();
  const dialog = frame.getByRole('dialog', { name: 'Theme Picker' });
  await expect(dialog).toBeVisible();
  await dialog.locator(`[data-file-name="look:${target.slug}"] .load-name-btn`).click();
  await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toContainText(target.name);

  const pointers = await page.evaluate(async () => {
    const [active, production] = await Promise.all([
      fetch('/api/live-tokens/themes/active').then((res) => res.json()),
      fetch('/api/live-tokens/themes/production').then((res) => res.json()),
    ]);
    return { active: active._fileName, production: production._fileName };
  });
  expect(pointers).toEqual({ active: target.slug, production: target.slug });

  const live = await page.evaluate(() => ({
    host: document.documentElement.style.getPropertyValue('--color-brand-500').trim(),
    marker: (window as any).__playwrightThemeMarker,
    navigations: performance.getEntriesByType('navigation').length,
  }));
  const editorColor = await frame.evaluate(() =>
    document.documentElement.style.getPropertyValue('--color-brand-500').trim(),
  );
  expect(live.host).toBe(editorColor);
  expect(live.host).not.toBe(beforeColor);
  expect(live.marker).toBe('still-here');
  expect(live.navigations).toBe(1);
});
