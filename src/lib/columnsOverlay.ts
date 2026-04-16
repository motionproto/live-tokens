import { writable } from 'svelte/store';

const STORAGE_KEY = 'lt-columns-visible';

function load(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export const columnsVisible = writable<boolean>(load());

columnsVisible.subscribe((v) => {
  try {
    localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
  } catch {
    // ignore quota errors
  }
});

export function toggleColumns() {
  columnsVisible.update((v) => !v);
}
