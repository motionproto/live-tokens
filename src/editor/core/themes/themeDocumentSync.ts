import { liveMovedSinceBake } from '../productionPulse';
import { openThemeSlug } from '../store/editorConfigStore';
import { loadThemeFromApi } from '../store/editorStore';
import { migrateColorsAndTypeFonts } from '../fonts/fontMigration';
import { openThemeSketch } from '../sketch/sketchStore';
import type { ApplyThemeResult } from './themeService';

const CHANNEL_NAME = 'live-tokens:active-theme:v1';
export const THEME_APPLIED_EVENT = 'live-tokens:theme-applied';

export interface AppliedThemeDetail {
  fileName: string;
  result: ApplyThemeResult;
}

interface AppliedThemeMessage {
  type: 'theme-applied';
  fileName: string;
  result: ApplyThemeResult;
}

let channel: BroadcastChannel | null = null;

function isAppliedThemeMessage(value: unknown): value is AppliedThemeMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<AppliedThemeMessage>;
  return message.type === 'theme-applied'
    && typeof message.fileName === 'string'
    && !!message.result
    && typeof message.result === 'object'
    && !!message.result.colorsAndType
    && typeof message.result.componentConfigs === 'object';
}

/**
 * Replace this document's editor state with the complete state returned by
 * the theme apply endpoint. Each same-origin document owns its own Svelte
 * store, so writing CSS into another document is not enough: the receiving
 * editor must hydrate the typed palette and component layers as well.
 */
export function hydrateAppliedTheme(fileName: string, result: ApplyThemeResult): void {
  const colorsAndType = structuredClone(result.colorsAndType);
  migrateColorsAndTypeFonts(colorsAndType);
  loadThemeFromApi(colorsAndType, structuredClone(result.componentConfigs));
  openThemeSlug.set(fileName);
  openThemeSketch(result.theme.sketch);
  liveMovedSinceBake.set(false);
  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent<AppliedThemeDetail>(THEME_APPLIED_EVENT, {
      detail: { fileName, result },
    }));
  }
}

/** Install the same-origin theme bridge for this window or iframe. */
export function init(): void {
  if (channel || typeof BroadcastChannel === 'undefined') return;
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.addEventListener('message', (event: MessageEvent<unknown>) => {
    if (!isAppliedThemeMessage(event.data)) return;
    hydrateAppliedTheme(event.data.fileName, event.data.result);
  });
}

/** Notify every already-open editor/host document after the server switches. */
export function broadcastAppliedTheme(fileName: string, result: ApplyThemeResult): void {
  channel?.postMessage({ type: 'theme-applied', fileName, result } satisfies AppliedThemeMessage);
}
