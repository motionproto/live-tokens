import { writable } from 'svelte/store';

export type EditorView = 'tokens' | 'components' | 'colors';
export type SidebarCondensed = boolean | 'auto';

const VIEW_KEY = 'lt.editorView';
const CONDENSED_KEY = 'lt.sidebarCondensed';

function isEditorView(v: unknown): v is EditorView {
  return v === 'tokens' || v === 'components' || v === 'colors';
}

// Session-scoped, not persistent: opening the editor fresh always starts on
// Tokens. Within a session it still round-trips, which is what the parent
// window / overlay iframe pair and in-page deep links (setEditorView before
// opening the overlay) rely on — same-origin frames in a tab share one
// sessionStorage area and its `storage` events.
function readView(): EditorView {
  try {
    const v = sessionStorage.getItem(VIEW_KEY);
    if (isEditorView(v)) return v;
  } catch {}
  return 'tokens';
}

function readCondensed(): SidebarCondensed {
  try {
    const v = localStorage.getItem(CONDENSED_KEY);
    if (v === 'true') return true;
    if (v === 'false') return false;
  } catch {}
  return 'auto';
}

export const editorView = writable<EditorView>(readView());
export const sidebarCondensed = writable<SidebarCondensed>(readCondensed());
export const selectedComponent = writable<string>('button');

editorView.subscribe((v) => {
  try { sessionStorage.setItem(VIEW_KEY, v); } catch {}
});

sidebarCondensed.subscribe((v) => {
  try { localStorage.setItem(CONDENSED_KEY, v === 'auto' ? 'auto' : String(v)); } catch {}
});

// Cross-window sync: parent and overlay iframe share web storage but each have
// their own module state. `storage` events fire in the *other* window when one
// writes, so we mirror the new value into this window's store.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === VIEW_KEY) {
      if (isEditorView(e.newValue)) editorView.set(e.newValue);
    } else if (e.key === CONDENSED_KEY) {
      if (e.newValue === 'true') sidebarCondensed.set(true);
      else if (e.newValue === 'false') sidebarCondensed.set(false);
      else if (e.newValue === 'auto') sidebarCondensed.set('auto');
    }
  });
}

export function setEditorView(v: EditorView) {
  editorView.set(v);
}
