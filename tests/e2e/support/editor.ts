import type { Frame, Page } from '@playwright/test';

export async function openOverlayEditor(
  page: Page,
  view: 'tokens' | 'components' = 'tokens',
): Promise<Frame> {
  await page.goto('/demo');
  await page.getByRole('button', {
    name: view === 'components' ? 'Browse Components' : 'Open Token Editor',
  }).click();

  const iframe = page.locator('iframe[title="Token editor"]');
  await iframe.waitFor({ state: 'visible' });
  const handle = await iframe.elementHandle();
  const frame = await handle?.contentFrame();
  if (!frame) throw new Error('Token editor iframe did not attach');

  await frame.locator('.editor-page').waitFor();
  await frame.waitForFunction(() =>
    document.documentElement.style
      .getPropertyValue('--sectiondivider-lg-title-font-size')
      .trim().length > 0,
  );
  return frame;
}
