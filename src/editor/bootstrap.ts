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
import * as themeDocumentSync from './core/themes/themeDocumentSync';
import * as liveStateStream from './core/themes/liveStateStream';
import { initializeTheme } from './core/themes/themeInit';
import { registerComponent, type RegisterComponentEntry } from './component-editor/registry';
import { registerSketchStyle, type RegisterSketchStyleInput } from './core/sketch/sketchRegistry';

export interface BootLiveTokensOptions {
  /** Consumer-authored components to register with the editor before mount. Dev-only. */
  components?: RegisterComponentEntry[];
  /** Sketchstyles this project ships, joining the shipped sketchstyles in every
      picker. Registered in a build as well as in dev: carrying a customized
      sketchstyle to a published site is the whole point, so these must not sit
      behind the DEV guard `components` sits behind. */
  sketchStyles?: RegisterSketchStyleInput[];
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

  // Before the DEV block: `initializeTheme` recovers the open theme's style by
  // name against the pool, so the pool has to be whole by the time it runs.
  if (opts.sketchStyles) {
    for (const style of opts.sketchStyles) registerSketchStyle(style);
  }

  if (import.meta.env.DEV) {
    themeDocumentSync.init();
    liveStateStream.init();
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
