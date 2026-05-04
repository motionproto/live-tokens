import { writable } from 'svelte/store';
import { storageKey } from './editorConfig';
import { quietGet, quietSet } from './storage';

const STORAGE_KEY = storageKey('columns-visible');

export const columnsVisible = writable<boolean>(quietGet(STORAGE_KEY) === '1');

columnsVisible.subscribe((v) => {
  quietSet(STORAGE_KEY, v ? '1' : '0');
});

export function toggleColumns() {
  columnsVisible.update((v) => !v);
}
