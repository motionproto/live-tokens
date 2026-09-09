import type { Frame, Page } from '@playwright/test';
import type { Readable } from 'svelte/store';
import type { EditorState } from '../../editor/core/store/editorTypes';
import type { RegistryEntry } from '../../editor/component-editor/registry';
import { DEFAULT_COMPONENTS_PATH } from '../../editor/core/routing/ownedRoutes';

export interface LiveTokensEditorHandle {
  editorState: Readable<EditorState>;
  mutate: (label: string, fn: (draft: EditorState) => void) => void;
  getComponentRegistryEntries: () => ReadonlyArray<RegistryEntry>;
  selectComponent: (id: string) => void;
  setSketch: (id: string | null) => void;
}

declare global {
  interface Window {
    __liveTokensEditor?: LiveTokensEditorHandle;
  }
}

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

/**
 * The owned `/live-tokens/components` route renders `ComponentEditorPage`
 * top-level — unlike the overlay, there is no iframe to cross, so
 * `window.__liveTokensEditor` lives on `page` itself. A consumer who relocated
 * the route with `editorRoutes` passes its path here.
 */
export async function openComponentsEditor(
  page: Page,
  path: string = DEFAULT_COMPONENTS_PATH,
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
