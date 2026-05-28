/**
 * One-call boot for a live-tokens consumer app.
 *
 * Bundles the five idempotent `init*` hooks that previously had to be
 * orchestrated by every consumer (see README "Bootstrap in main.ts"), runs
 * `initializeTheme` in dev, optionally registers custom components, and
 * mounts the consumer's App at the target.
 *
 * CSS imports stay with the consumer — token CSS is order-sensitive
 * (defaults → editor overrides → fonts) and the consumer's
 * `tokens.generated.css` is per-project. FA icons are side-effect-imported
 * here because the dev overlay always needs them and a consumer must not
 * have to remember to import an icon font.
 */
import '@fortawesome/fontawesome-free/css/all.min.css';

import { mount, type Component } from 'svelte';
import * as cssVarSync from './core/cssVarSync';
import * as router from './core/routing/router';
import * as columnsOverlay from './overlay/columnsOverlay';
import * as editorStore from './core/store/editorStore';
import { initializeTheme } from './core/themes/themeInit';
import { registerComponent, type RegisterComponentEntry } from './component-editor/registry';

export interface BootLiveTokensOptions {
  /** Consumer-authored components to register with the editor before mount. Dev-only. */
  components?: RegisterComponentEntry[];
}

export async function bootLiveTokens(
  App: Component<any, any, any>,
  target: string | Element,
  opts: BootLiveTokensOptions = {},
): Promise<ReturnType<typeof mount>> {
  cssVarSync.init();
  router.init();
  columnsOverlay.init();
  editorStore.init();

  if (import.meta.env.DEV) {
    if (opts.components) {
      for (const entry of opts.components) {
        registerComponent(entry);
      }
    }
    await initializeTheme();
  }

  const targetEl =
    typeof target === 'string' ? document.querySelector(target) : target;
  if (!targetEl) {
    throw new Error(`bootLiveTokens: target ${JSON.stringify(target)} not found`);
  }
  return mount(App, { target: targetEl });
}
