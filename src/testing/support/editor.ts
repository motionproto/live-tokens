import type { Page } from '@playwright/test';
import { DEFAULT_COMPONENTS_PATH } from '../../editor/core/routing/ownedRoutes';
import '../../editor/pages/liveTokensEditorHandle';
import { COMPONENTS_PATH_ENV } from '../config';

/** `createPlaywrightConfig` publishes the route from the testing settings, so a
 *  consumer who relocated it needs no argument here. */
export function componentsPath(): string {
  return process.env[COMPONENTS_PATH_ENV] || DEFAULT_COMPONENTS_PATH;
}

/**
 * The owned `/live-tokens/components` route renders `ComponentEditorPage`
 * top-level — unlike the overlay, there is no iframe to cross, so
 * `window.__liveTokensEditor` lives on `page` itself.
 */
export async function openComponentsEditor(
  page: Page,
  path: string = componentsPath(),
): Promise<Page> {
  await page.goto(path);
  await page.locator('.editor-page').waitFor();
  await page.waitForFunction(() =>
    document.documentElement.style
      .getPropertyValue('--sectiondivider-lg-title-font-size')
      .trim().length > 0,
  );
  await page.waitForFunction(() => typeof window.__liveTokensEditor !== 'undefined');
  return page;
}
