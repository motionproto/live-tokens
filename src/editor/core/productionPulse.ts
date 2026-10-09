import { writable } from 'svelte/store';
import { API_BASE } from './storage/apiBase';
import type { Theme } from './themes/themeTypes';

/**
 * Monotonic counter that ticks every time an Adopt publishes a theme. UI
 * surfaces that need to react to a sibling Adopt subscribe to this so they
 * refresh without per-pair wiring.
 *
 * Bumped by `adoptTheme`, the one door every Adopt goes through.
 */
export const productionRevision = writable(0);

export function bumpProductionRevision(): void {
  productionRevision.update((n) => n + 1);
}

/**
 * Ticks when a component's live config changes on the server — a save, a
 * preset load, a delete. Saving one is visible through `componentDirty`, but
 * loading a preset with no edit in play changes nothing the Theme panel can
 * observe, and its Components count is derived from exactly that. Bumped by
 * `ComponentFileManager`.
 */
export const componentActiveRevision = writable(0);

export function bumpComponentActiveRevision(): void {
  componentActiveRevision.update((n) => n + 1);
}

/**
 * The live state holds changes the open theme's file does not: a buffer
 * written, or a sketch gesture that changes what the effect paints. Saving
 * clears it, because a save captures the live state into the file. Whether that
 * file has reached production since is the server's answer, carried on
 * `productionTheme._baked`, so this flag never stands in for it.
 *
 * Set by the client writes that move the live state (`writeWorkingColorsAndType`,
 * `writeWorkingComponentConfig`, and every sketch gesture that changes what the
 * effect paints: `setSketchEnabled`, `updateSketchSettings`, `selectSketchStyle`);
 * cleared by `saveActiveTheme` and `saveAsTheme`; recomputed from the server's layer sources by
 * `hydrateAppliedTheme`, on this document and on every peer an Apply broadcasts
 * to. Module-level, so it survives the remounts a view switch causes.
 */
export const liveUnsaved = writable(false);

/** The published theme, served whole so the client can tell what production
 *  runs from the document itself. */
export async function getProductionTheme(): Promise<Theme> {
  const res = await fetch(`${API_BASE}/themes/production`);
  if (!res.ok) throw new Error('Failed to read the production theme');
  return res.json();
}

const PRODUCTION_RETRY_MS = 3000;
let latestProductionRead = 0;
let pendingRetry: ReturnType<typeof setTimeout> | undefined;

/**
 * Last-read production theme, `_baked` included. Every surface renders from
 * this store and none reads the server itself. The first subscriber starts a
 * read; after that, the writes that can move the answer refresh it: `saveTheme`,
 * `adoptTheme`, and a live-state frame from an outside writer.
 *
 * Module-level, so a remount renders the last answer on its first frame
 * instead of flashing through "not in sync" while a fresh fetch resolves.
 */
export const productionTheme = writable<Theme | null>(null, () => {
  void refreshProductionTheme();
});

/** Re-read the production theme into `productionTheme`. Never throws: a failed
 *  read keeps the last answer and retries once, since nothing else asks again
 *  until the next write. A newer read supersedes a pending retry. */
export async function refreshProductionTheme(retry = true): Promise<void> {
  clearTimeout(pendingRetry);
  const read = ++latestProductionRead;
  try {
    const theme = await getProductionTheme();
    // Reads can land out of order; only the latest one speaks for the server.
    if (read === latestProductionRead) productionTheme.set(theme);
  } catch {
    if (retry && read === latestProductionRead) {
      pendingRetry = setTimeout(() => void refreshProductionTheme(false), PRODUCTION_RETRY_MS);
    }
  }
}
