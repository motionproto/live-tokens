import { API_BASE } from '../storage/apiBase';
import { hydrateAppliedTheme } from './themeDocumentSync';
import type { LiveState } from './themeService';

export const LIVE_STATE_EVENT = 'live-state';

let source: EventSource | null = null;

/**
 * Follow the dev server's live state. A buffer or the active pointer written
 * from outside the page (a CLI verb, a branch switch) arrives as one frame,
 * and this document hydrates from it the way it does from an Apply.
 */
export function init(): void {
  if (source || typeof EventSource === 'undefined') return;
  source = new EventSource(`${API_BASE}/events`);
  source.addEventListener(LIVE_STATE_EVENT, (event) => {
    const state = JSON.parse((event as MessageEvent<string>).data) as LiveState;
    hydrateAppliedTheme(state.fileName, state);
  });
}

export function __resetForTests(): void {
  source?.close();
  source = null;
}
