import { writable } from 'svelte/store';
import { storageKey } from './editorConfig';

function getStorageKey(): string {
  return storageKey('columns-visible');
}

function load(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(getStorageKey()) === '1';
  } catch {
    return false;
  }
}

export const columnsVisible = writable<boolean>(false);

export function toggleColumns() {
  columnsVisible.update((v) => !v);
}

let initialised = false;

/**
 * Idempotent host hook — call once during boot to hydrate the column-visibility
 * store from localStorage and start persisting future writes. Importing the
 * module no longer subscribes-then-persists, so SSR / test harnesses can pull
 * `columnsVisible` without DOM/storage access.
 */
export function init(): void {
  if (initialised) return;
  initialised = true;
  columnsVisible.set(load());
  columnsVisible.subscribe((v) => {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(getStorageKey(), v ? '1' : '0');
    } catch {
      // ignore quota errors
    }
  });
}
